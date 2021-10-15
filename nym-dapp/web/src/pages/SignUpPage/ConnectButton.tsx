import { Button, Link, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { useEthers } from '@usedapp/core'
import AccountModal from './AccountModal'
import Identicon from './Identicon'

// Adapted from https://dev.to/jacobedawson/build-a-web3-dapp-in-react-login-with-metamask-4chp

export default function ConnectButton() {
  const { activateBrowserWallet, account } = useEthers()
  const modalControl = useDisclosure()

  return account ? (
    <>
      <Stack>
        <AccountModal
          isOpen={modalControl.isOpen}
          onClose={modalControl.onClose}
        />
        <Stack
          direction="row"
          alignItems="center"
          p="2"
          borderRadius="lg"
          border="1px"
          borderColor="gray.200"
        >
          <Text fontWeight="bold">
            {account.slice(0, 6)}...
            {account.slice(account.length - 4, account.length)}
          </Text>
          <Identicon />
        </Stack>
        <Link as="button" variant="btn" onClick={modalControl.onOpen}>
          Change
        </Link>
      </Stack>
    </>
  ) : (
    <Button onClick={() => activateBrowserWallet()}>Connect to a wallet</Button>
  )
}
