import {UserInputError} from '@redwoodjs/graphql-server'
import ethers from 'ethers'
import {db} from 'src/lib/db'
import {MutationcreateConnectionArgs} from 'types/graphql'

export const createConnection = async ({
  input,
}: MutationcreateConnectionArgs) => {
  // XXX: dedup message with frontend
  const message = `Connect Zorro to ${input.externalAddress}`
  const ethereumAddress = ethers.utils.verifyMessage(message, input.signature)

  const profileId = (
    await db.cachedProfile.findUnique({
      where: {ethereumAddress},
      select: {id: true},
    })
  )?.id

  if (!profileId) {
    throw new UserInputError("Couldn't find a profile for this address")
  }

  const createOrUpdate = {
    purposeIdentifier: input.purposeIdentifier,
    signature: input.signature,
    externalAddress: input.externalAddress,
    cachedProfile: {connect: {ethereumAddress}},
  }

  const connection = await db.connection.upsert({
    where: {
      profileId_purposeIdentifier: {
        profileId,
        purposeIdentifier: input.purposeIdentifier,
      },
    },
    create: createOrUpdate,
    update: createOrUpdate,
  })
  return connection
}
