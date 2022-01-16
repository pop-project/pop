import syncStarknetState from '$api/src/tasks/syncStarknetState'
import {db} from 'api/src/lib/db'

/* eslint-disable no-console */

export default async () => {
  console.log('Seeding unsubmitted profiles')
  await db.unsubmittedProfile.createMany({
    data: [
      {
        photoCid: 'bafybeicxoq24v5sxcz4myt5kx35kluclpoqhsfb2qdf5oevfuklprux2em',
        videoCid: 'bafybeiaxvwuj72kcknxm5ofryao4pkqpks5qtadrakzcw743jqruli5zku',
        ethereumAddress: '0x334230242D318b5CA159fc38E07dC1248B7b35e4',
      },
      {
        photoCid: 'bafybeif63s5tuz2awex7qkmeki4wby25j4ifraa5lziyn3ifx75rv77qc4',
        videoCid: 'bafybeidadw2rw23ikkrhk7ehcxlaydyor27rslzbubony3qvvgmvt7bww4',
        ethereumAddress: '0x327e8AE4F9D6Cca061EE8C05dC728b9545c2AC78',
      },
    ],
  })

  console.log('Seeding users')
  await db.user.createMany({
    data: [
      {
        ethereumAddress: '0x327e8AE4F9D6Cca061EE8C05dC728b9545c2AC78',
        email: 'test@test.com',
      },
    ],
  })

  console.log('Seeding notary feedback')
  const profile = await db.unsubmittedProfile.findFirst({
    where: {
      ethereumAddress: '0x334230242D318b5CA159fc38E07dC1248B7b35e4',
    },
  })
  const feedback = await db.notaryFeedback.create({
    data: {
      UnsubmittedProfile: {connect: {id: profile.id}},
      feedback: "You don't say the full required phrase in your video",
    },
  })

  await db.unsubmittedProfile.update({
    where: {id: feedback.unsubmittedProfileId},
    data: {unaddressedFeedbackId: feedback.id},
  })

  await syncStarknetState()
}
