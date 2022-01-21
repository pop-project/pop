import type {
  Prisma,
  UnsubmittedProfile as PrismaUnsubmittedProfile,
} from '@prisma/client'
import {db} from 'src/lib/db'
import {pusher} from 'src/lib/pusher'
import {sendMessage} from 'src/lib/twilio'
import sendNotaryApproved from 'src/mailers/sendNotaryApproved'
import sendNotaryFeedback from 'src/mailers/sendNotaryFeedback'
import syncStarknetState from 'src/tasks/syncStarknetState'
import {
  MutationaddNotaryFeedbackArgs,
  MutationapproveProfileArgs,
  MutationupdateUnsubmittedProfileArgs,
  MutationmarkNotaryViewedArgs,
  QueryunsubmittedProfileArgs,
  QueryunsubmittedProfilesArgs,
  UnsubmittedProfile as UnsubmittedProfileType,
  MutationmarkNotaryWillApproveArgs,
} from 'types/graphql'

const alertProfileUpdated = (
  profile: Pick<PrismaUnsubmittedProfile, 'ethereumAddress'>
) =>
  pusher?.trigger(
    `unsubmittedProfile.${profile.ethereumAddress}`,
    'updated',
    {}
  )

// Just hard-code these for now. Will get fancier later.
export const NOTARIES = [
  '+18016131318', // Kyle
  '+16175958777', // Ted
]

export const unsubmittedProfiles = async ({
  pendingReview,
}: QueryunsubmittedProfilesArgs) => {
  const whereClause: Prisma.UnsubmittedProfileWhereInput = {}
  if (pendingReview) whereClause.unaddressedFeedbackId = null
  return db.unsubmittedProfile.findMany({
    where: whereClause,
  })
}

export const unsubmittedProfile = async ({
  ethereumAddress,
}: QueryunsubmittedProfileArgs) =>
  db.unsubmittedProfile.findUnique({where: {ethereumAddress}})

export const updateUnsubmittedProfile = async ({
  ethereumAddress,
  input,
}: MutationupdateUnsubmittedProfileArgs) => {
  const profile = await db.unsubmittedProfile.upsert({
    create: {...input, ethereumAddress},
    update: {
      ...input,
      unaddressedFeedbackId: null,
      lastSubmittedAt: new Date(),
    },
    where: {ethereumAddress},
  })

  const pendingCount = (await unsubmittedProfiles({pendingReview: true})).length

  if (pendingCount > 0) {
    await sendMessage(
      NOTARIES,
      `${pendingCount} Zorro profiles awaiting review. http://localhost:8910/unsubmitted-profiles`
    )
  }

  return profile
}

export const markNotaryViewed = async ({id}: MutationmarkNotaryViewedArgs) => {
  let profile = await db.unsubmittedProfile.findUnique({
    where: {id: parseInt(id)},
  })
  if (profile?.notaryViewedAt == null) {
    profile = await db.unsubmittedProfile.update({
      where: {id: parseInt(id)},
      data: {notaryViewedAt: new Date()},
    })
  }
  profile && alertProfileUpdated(profile)
  return profile
}

export const markNotaryWillApprove = async ({
  id,
}: MutationmarkNotaryWillApproveArgs) => {
  let profile = await db.unsubmittedProfile.findUnique({
    where: {id: parseInt(id)},
  })
  if (profile?.notaryApprovedAt == null) {
    profile = await db.unsubmittedProfile.update({
      where: {id: parseInt(id)},
      data: {notaryApprovedAt: new Date()},
    })
  }
  profile && alertProfileUpdated(profile)
  return profile
}

export const addNotaryFeedback = async ({
  id,
  feedback,
}: MutationaddNotaryFeedbackArgs) => {
  // TODO: authenticate that the given user is an approved notary

  const notaryFeedback = await db.notaryFeedback.create({
    data: {UnsubmittedProfile: {connect: {id: parseInt(id)}}, feedback},
  })

  const profile = await db.unsubmittedProfile.update({
    where: {id: parseInt(id)},
    data: {unaddressedFeedbackId: notaryFeedback.id, notaryViewedAt: null},
    include: {UnaddressedFeedback: true},
  })

  const user = await db.user.findUnique({
    where: {ethereumAddress: profile.ethereumAddress},
    select: {email: true},
  })

  alertProfileUpdated(profile)
  if (profile.UnaddressedFeedback && user?.email) {
    await sendNotaryFeedback(user.email, profile.UnaddressedFeedback.feedback)
  }

  return profile
}

export const approveProfile = async ({id}: MutationapproveProfileArgs) => {
  // TODO: authenticate that the given user is an approved notary

  const profile = await db.unsubmittedProfile.findUnique({
    where: {id: parseInt(id)},
  })

  if (!profile) return false

  await syncStarknetState(true)
  await db.unsubmittedProfile.delete({where: {id: parseInt(id)}})
  alertProfileUpdated(profile)

  const user = await db.user.findUnique({
    where: {ethereumAddress: profile.ethereumAddress},
    select: {email: true},
  })

  if (user?.email)
    await sendNotaryApproved(user?.email, profile.ethereumAddress)

  return true
}

export const UnsubmittedProfile = {
  UnaddressedFeedback: (_args: void, {root}: {root: UnsubmittedProfileType}) =>
    db.unsubmittedProfile
      .findUnique({where: {id: root.id}})
      .UnaddressedFeedback(),
}
