import { createNavigationContainerRef, CommonActions } from '@react-navigation/native'
import type { RootStackParamList } from '@/navigation/RootNavigator'

export const navigationRef = createNavigationContainerRef<RootStackParamList>()

export function navigateInviteOrFallback(screeningIdParam: string, fullUrl: string) {
  const UUID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  if (screeningIdParam.startsWith('sso_')) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'Patient',
        params: { screen: 'WebFallback', params: { url: fullUrl } },
      })
    )
    return
  }
  const uuid = screeningIdParam.match(UUID_RE)?.[1]?.toLowerCase() ?? null
  if (!uuid) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'Patient',
        params: { screen: 'WebFallback', params: { url: fullUrl } },
      })
    )
    return
  }
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'Patient',
      params: { screen: 'InviteEntry', params: { screeningId: uuid, rawToken: screeningIdParam } },
    })
  )
}
