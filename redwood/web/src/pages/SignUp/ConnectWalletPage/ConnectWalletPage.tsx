import {Spacer, Stack, Text} from '@chakra-ui/layout'
import {routes} from '@redwoodjs/router'
import {MetaTags} from '@redwoodjs/web'
import {useContext} from 'react'
import ConnectButton from 'src/components/ConnectButton/ConnectButton'
import UserContext from 'src/layouts/UserContext'
import {useNav} from 'src/lib/util'
import SignUpLogo from '../SignUpLogo'

const ConnectWalletPage: React.FC<{
  purposeIdentifier?: string
  externalAddress?: string
}> = () => {
  const {ethereumAddress, unsubmittedProfile} = useContext(UserContext)
  if (unsubmittedProfile != null)
    return useNav(routes.signUpSubmitted(), {replace: true})

  if (ethereumAddress != null)
    return useNav(routes.signUpAllowCamera(), {replace: true})

  return (
    <Stack spacing="6" flex="1">
      <MetaTags title="Sign Up" />
      <SignUpLogo />
      <Spacer />
      <Text>
        To protect your privacy, connect an Ethereum wallet and{' '}
        <strong>create a new address</strong>.
      </Text>
      <ConnectButton variant="signup-primary" my="8">
        Connect wallet
      </ConnectButton>
    </Stack>
  )
}

export default ConnectWalletPage
