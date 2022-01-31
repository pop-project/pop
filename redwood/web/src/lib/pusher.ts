import Pusher from 'pusher-js'
import {useEffect} from 'react'

const pusher = process.env.PUSHER_KEY
  ? new Pusher(process.env.PUSHER_KEY, {
      cluster: process.env.PUSHER_CLUSTER,
    })
  : null

export const usePusher = (
  channel: string | undefined | null,
  event: string,
  callback: Function
) => {
  useEffect(() => {
    if (pusher == null) {
      console.warn(
        'Pusher not configured, so realtime events will not work on this page. Have you set `PUSHER_KEY` in your .env file?'
      )
      return
    }
    if (channel == null) return
    const pusherChannel = pusher.subscribe(channel)
    pusherChannel.bind(event, callback)
    return () => {
      pusherChannel.unbind(event, callback)
      pusherChannel.unbind_all()
      pusher.unsubscribe(channel)
    }
  }, [channel, event, callback])
}

export const watchRegAttempt = (
  registrationAttempt: {ethereumAddress: string} | undefined | null,
  onUpdate: Function
) => {
  usePusher(
    registrationAttempt &&
      `registrationAttempt.${registrationAttempt?.ethereumAddress}`,
    'updated',
    onUpdate
  )
}
