import {useAuth} from '@redwoodjs/auth'
import {routes, useLocation} from '@redwoodjs/router'
import {requestMediaPermissions} from 'mic-check'
import {useEffect} from 'react'
import {UserContextType, useUser} from 'src/layouts/UserContext'
import {useGuard} from 'src/lib/useGuard'
import {appNav} from 'src/lib/util'
import {IterableElement} from 'type-fest'

export const requireWalletConnected = () => {
  const {ethereumAddress} = useUser()
  useGuard(ethereumAddress, routes.registerIntro())
  return ethereumAddress
}

export const requireNoExistingProfile = () => {
  const {cachedProfile} = useUser()
  useGuard(!cachedProfile, () => routes.profile({id: cachedProfile!.id}), {
    toast: {
      title:
        'Your ethereum address already has a profile, so you cannot register again',
    },
  })
}

export const requireCameraAllowed = async () => {
  // Make sure we have camera permissions
  useEffect(() => {
    requestMediaPermissions().catch(() => appNav(routes.registerAllowCamera()))
  }, [])
}

export const requireRole = (
  role: IterableElement<
    NonNullable<UserContextType['authenticatedUser']>['roles']
  >
) => {
  const {pathname} = useLocation()
  const {loading, currentUser} = useAuth()
  const user = currentUser as UserContextType['authenticatedUser']

  const hasRole = user?.roles?.includes(role)
  useGuard(loading || hasRole, routes.authenticate({next: pathname}), {
    toast: {
      status: 'error',
      title: `You must be signed in to an account with the ${role} role to access this page.`,
    },
  })
}