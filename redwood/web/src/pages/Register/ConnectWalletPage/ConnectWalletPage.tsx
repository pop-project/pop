import {Spacer, Stack, Text} from '@chakra-ui/layout'
import {routes} from '@redwoodjs/router'
import {MetaTags} from '@redwoodjs/web'
import ConnectButton from 'src/components/ConnectButton/ConnectButton'
import {useGuard} from 'src/lib/useGuard'
import {useUser} from 'src/layouts/UserContext'
import RegisterLogo from '../RegisterLogo'
import RegisterScreen from '../RegisterScreen'

const ConnectWalletPage: React.FC<{
  purposeIdentifier?: string
  externalAddress?: string
}> = () => {
  const {ethereumAddress, unsubmittedProfile} = useUser()
  useGuard(!unsubmittedProfile, routes.registerSubmitted())
  useGuard(!ethereumAddress, routes.registerAllowCamera())

  return (
    <RegisterScreen
      shouldShowLogo
      shouldHideTitle
      title="Connect wallet"
      buttonDescription={
        <Text>
          To protect your privacy, connect an Ethereum wallet and{' '}
          <strong>create a new address</strong>.
        </Text>
      }
      PrimaryButtonComponent={ConnectButton}
      primaryButtonLabel="Connect wallet"
    />
  )
}

export default ConnectWalletPage
