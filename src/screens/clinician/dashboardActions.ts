import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ClinicianStackParamList, ClinicianTabParamList } from '@/navigation/RootNavigator'
import type { ClinicianDashboardAction } from '@/api/clinicians'

type ClinicianDashboardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<ClinicianTabParamList>,
  NativeStackNavigationProp<ClinicianStackParamList>
>

type DashboardActionInput = {
  action: ClinicianDashboardAction
  screeningId?: string
  patientId?: string
}

export type SupportedDashboardAction = Exclude<
  ClinicianDashboardAction,
  'open_call' | 'open_screening_copilot'
>

export function isSupportedDashboardAction(
  action: string | undefined
): action is SupportedDashboardAction {
  return (
    action === 'open_screening' ||
    action === 'open_screening_scribe' ||
    action === 'open_patient' ||
    action === 'open_visit_readiness'
  )
}

export function handleClinicianDashboardAction(
  navigation: Pick<ClinicianDashboardNavigation, 'navigate'>,
  input: DashboardActionInput
): boolean {
  switch (input.action) {
    case 'open_screening':
      if (!input.screeningId) return false
      navigation.navigate('ClinicianScreeningDetail', {
        screeningId: input.screeningId,
        initialTab: 'summary',
      })
      return true
    case 'open_screening_scribe':
      if (!input.screeningId) return false
      navigation.navigate('ClinicianScreeningDetail', {
        screeningId: input.screeningId,
        initialTab: 'scribe',
      })
      return true
    case 'open_patient':
      if (!input.patientId) return false
      navigation.navigate('PatientProfile', { patientId: input.patientId })
      return true
    case 'open_visit_readiness':
      navigation.navigate('ClinicianHome', { focusSection: 'visit-readiness' })
      return true
    case 'open_call':
      return false
    default:
      return false
  }
}
