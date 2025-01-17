import {Button} from '@chakra-ui/button'
import {Center, Stack, VStack} from '@chakra-ui/layout'
import {
  Alert,
  AlertIcon,
  CircularProgress,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import {navigate, routes} from '@redwoodjs/router'
import {useQuery} from '@redwoodjs/web'
import {Fireworks} from 'fireworks-js'
import React, {useCallback, useEffect, useState} from 'react'
import {InternalLink, RLink} from 'src/components/links'
import {useUser} from 'src/layouts/UserContext'
import {track, useTrackOnMount} from 'src/lib/posthog'
import {watchRegAttempt} from 'src/lib/pusher'
import {useGuard} from 'src/lib/useGuard'
import {appNav, maybeCidToUrl} from 'src/lib/util'
import {registerSlice} from 'src/state/registerSlice'
import {useAppDispatch} from 'src/state/store'
import {
  RegisterSubmittedPageQuery,
  RegisterSubmittedPageQueryVariables,
} from 'types/graphql'
import useAsyncEffect from 'use-async-effect'
import {useSetEmail} from '../EmailPage/EmailPage'
import MinimalVideoPlayer from 'src/components/MinimalVideoPlayer'
import RegisterScreen, {TextContainer} from '../RegisterScreen'
import UserMediaBox from '../UserMediaBox'

const QUERY = gql`
  query RegisterSubmittedPageQuery($ethereumAddress: ID!) {
    registrationAttempt: latestRegistration(ethereumAddress: $ethereumAddress) {
      id
      ethereumAddress
      photoCid
      videoCid
      notaryViewedAt
      reviewedAt
      approved

      deniedReason

      createdAt
    }
  }
`

const SubmittedPage = () => {
  const {user} = useUser()

  const {data, loading, refetch} = useQuery<
    RegisterSubmittedPageQuery,
    RegisterSubmittedPageQueryVariables
  >(QUERY, {
    variables: {
      ethereumAddress: user?.ethereumAddress ?? '',
    },
    skip: !user?.ethereumAddress,
    fetchPolicy: 'network-only',
  })

  useGuard(loading || data?.registrationAttempt, routes.registerIntro(), {
    toast: {
      title:
        "Couldn't find your submitted registration. Are you connected to the correct wallet?",
      status: 'warning',
    },
  })

  watchRegAttempt(data?.registrationAttempt, refetch)

  if (data?.registrationAttempt == null) return null

  // These cases are chronologically reversed
  if (data.registrationAttempt.approved) {
    return <CitizenshipActive />
  } else if (data.registrationAttempt.approved === false) {
    return (
      <RegistrationFeedback registrationAttempt={data.registrationAttempt} />
    )
  } else if (data.registrationAttempt.notaryViewedAt) {
    return (
      <AwaitingNotary
        key="checking-application"
        triggeredAt={data.registrationAttempt.notaryViewedAt}
        hasEmail={!!user?.email}
        timeout={3 * 60 * 1000} // 3 minutes
        title="Checking your application"
        message={
          <>
            <Text>A Zorro notary is looking at your application!</Text>
            <Text>Expected wait: 2 minutes</Text>
          </>
        }
      />
    )
  } else {
    return (
      <AwaitingNotary
        key="submitting"
        triggeredAt={data.registrationAttempt.createdAt!}
        hasEmail={!!user?.email}
        timeout={80 * 1000} // 80 seconds
        title="Submitting"
        message={
          <>
            <Text>
              Please stay on in case there are any problems with your
              application.
            </Text>
            <Text>We'll update you in a minute!</Text>
          </>
        }
      />
    )
  }
}

const wait = async (duration: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

const AwaitingNotary = ({
  triggeredAt,
  hasEmail,
  timeout,
  title,
  message,
}: {
  triggeredAt: string
  hasEmail: boolean
  timeout: number
  title: string
  message: React.ReactNode
}) => {
  const triggeredMts = new Date(triggeredAt).getTime()
  const [mountMts] = useState(Date.now())
  const [shouldShowTimeoutModal, setShouldShowTimeoutModal] = useState(false)
  const [didAcknowledgeTimeoutModal, setDidAcknowledgeTimeoutModal] =
    useState(false)

  useTrackOnMount('submission awaiting notary shown', {title})

  const millisecondsUntilTimeoutAtMount = timeout - (mountMts - triggeredMts)

  useAsyncEffect(async (isActive) => {
    await wait(millisecondsUntilTimeoutAtMount)
    if (!isActive()) return
    track('submission timeout modal shown', {hasEmail})
    setShouldShowTimeoutModal(true)
  }, [])

  if (millisecondsUntilTimeoutAtMount <= 0 || didAcknowledgeTimeoutModal)
    return <RegistrationPending hasEmail={hasEmail} />

  const TimeoutModal = hasEmail
    ? TimeoutModalAlreadyHaveEmail
    : TimeoutModalAskForEmail
  return (
    <>
      <RegisterScreen
        title={title}
        primaryButtonLabel="Submit application"
        primaryButtonProps={{disabled: true}}
      >
        <Spinner />
        <TextContainer>{message}</TextContainer>
      </RegisterScreen>
      <TimeoutModal
        isOpen={shouldShowTimeoutModal}
        onClose={() => {
          track('submitted timeout modal closed')
          setDidAcknowledgeTimeoutModal(true)
        }}
      />
    </>
  )
}

const TimeoutModalAlreadyHaveEmail = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW={350} p={4}>
        <ModalHeader>Doh, this is taking longer than expected 🙁</ModalHeader>
        <ModalBody>
          <Text>
            We might be overloaded with new citizens. We'll email you when
            there's an update!
          </Text>
        </ModalBody>
        <ModalFooter>
          <VStack flex="1" spacing={4}>
            <Button variant="register-primary" size="md" onClick={onClose}>
              Ok
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// XXX: has code duplication with EmailPage.tsx
const TimeoutModalAskForEmail = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const [email, setEmail] = useState<string>('')
  const user = useUser()
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const [setEmailMutation] = useSetEmail()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user.user?.ethereumAddress) return

    track('email submitted')

    setEmailMutation({variables: {email}})
    await user.auth.reauthenticate()

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent maxW={350} p={4}>
        <form onSubmit={submit}>
          <ModalHeader>Doh, this is taking longer than expected 🙁</ModalHeader>
          <ModalBody>
            <Text>
              We might be overloaded with new citizens. If you want, we can
              email you updates about your registration:
            </Text>
            <Input
              mt={4}
              type="email"
              name="email"
              size="sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <VStack flex="1" spacing={4}>
              <Button
                variant="register-primary"
                size="md"
                disabled={!isEmailValid}
                onClick={submit}
              >
                Get notified by email
              </Button>
              <Button variant="register-secondary" size="sm" onClick={onClose}>
                I'll just check back later
              </Button>
            </VStack>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}

const CitizenshipActive = () => {
  useTrackOnMount('submission citizenship active shown')

  const {auth} = useUser()

  useEffect(() => {
    const fireworksContainer = document.createElement('div')
    fireworksContainer.style.position = 'absolute'
    fireworksContainer.style.top = '0'
    fireworksContainer.style.bottom = '0'
    fireworksContainer.style.left = '0'
    fireworksContainer.style.right = '0'
    fireworksContainer.style.pointerEvents = 'none'
    document.getElementById('register-content')?.appendChild(fireworksContainer)
    const fireworks = new Fireworks(fireworksContainer, {
      friction: 0.95,
      delay: {min: 15, max: 30},
      speed: 2,
      opacity: 0.5,
      particles: 120,
      hue: {min: 218, max: 287},
    })

    fireworks.start()

    // Start fading out after 3 seconds (fadeout takes 2 seconds)
    setTimeout(() => {
      fireworksContainer.style.opacity = '0'
      fireworksContainer.style.transition = 'opacity 2s ease-in'
    }, 3000)

    // Stop after 5 seconds
    setTimeout(() => fireworks.stop(), 5000)
  }, [])

  return (
    <RegisterScreen
      title="Congratulations!"
      primaryButtonLabel="Finish"
      primaryButtonProps={{
        as: RLink,
        onClick: async () => {
          // If the user navigates back to the homescreen we want to make sure we show their new state.
          await auth.reauthenticate()
          appNav(routes.home())
        },
      }}
    >
      <Center>
        <Alert
          status="success"
          variant="subtle"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="130px"
          m={8}
        >
          <AlertIcon boxSize="35px" />
          <Text fontSize="lg">You're a web3 citizen!</Text>
        </Alert>
      </Center>
    </RegisterScreen>
  )
}

const RegistrationPending = ({hasEmail}: {hasEmail: boolean}) => {
  useTrackOnMount('submission registration pending shown', {hasEmail})

  return (
    <>
      <RegisterScreen title="Application pending">
        <TextContainer maxW={250} pt={8}>
          {hasEmail ? (
            <>
              <Text>We'll email you when we get to your application!</Text>
              <Text>(You can close this page)</Text>
            </>
          ) : (
            <>
              <Text>Check back later to get an update!</Text>
            </>
          )}
        </TextContainer>
      </RegisterScreen>
      <TextContainer maxW={250}>
        <Text size="sm" color="gray.400" pb={16}>
          Taking too long? Learn about{' '}
          <InternalLink
            href={routes.registerSelfSubmit()}
            color="inherit"
            textDecoration="underline"
          >
            manual profile submission
          </InternalLink>
          .
        </Text>
      </TextContainer>
    </>
  )
}

const Spinner = () => (
  <CircularProgress
    size="6rem"
    isIndeterminate
    color="purple.500"
    alignSelf="center"
    py={4}
  />
)

const RegistrationFeedback: React.FC<{
  registrationAttempt: NonNullable<
    RegisterSubmittedPageQuery['registrationAttempt']
  >
}> = ({registrationAttempt}) => {
  useTrackOnMount('submission feedback shown')

  const dispatch = useAppDispatch()

  const startOver = useCallback(() => {
    dispatch(registerSlice.actions.resetForm())
    navigate(routes.registerPhoto())
  }, [])

  return (
    <RegisterScreen
      title="Feedback from notary"
      primaryButtonLabel="Make adjustments"
      primaryButtonProps={{onClick: startOver}}
      secondaryButtonLabel="I insist that my application is fine"
      secondaryButtonProps={{as: RLink, href: routes.registerSelfSubmit()}}
    >
      <TextContainer p="4">
        <Text>"{registrationAttempt.deniedReason}"</Text>
      </TextContainer>
      <Stack direction="row" px="8" pt="4">
        <UserMediaBox>
          <Image src={maybeCidToUrl(registrationAttempt.photoCid)} />
        </UserMediaBox>
        <UserMediaBox>
          <MinimalVideoPlayer
            url={maybeCidToUrl(registrationAttempt.videoCid)}
          />
        </UserMediaBox>
      </Stack>
    </RegisterScreen>
  )
}

export default SubmittedPage
