import syncStarknetState from '$api/src/tasks/syncStarknetState'

export default async ({args}) => {
  console.log('Syncing StarkNet state...')
  await syncStarknetState({onlyNewProfiles: !!args.onlyNew})
}
