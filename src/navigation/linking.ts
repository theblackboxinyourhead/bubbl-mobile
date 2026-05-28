import type { LinkingOptions } from '@react-navigation/native'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import type { RootStackParamList } from '@/navigation/RootNavigator'

type DeepLinkExtra = {
  deepLinkScheme?: string
  deepLinkHosts?: string[]
}

function buildPrefixes(): string[] {
  const extra = (Constants.expoConfig?.extra ?? {}) as DeepLinkExtra
  const scheme = extra.deepLinkScheme ?? 'bubbl'
  const hosts = extra.deepLinkHosts ?? []
  const schemePrefix = `${scheme}://`
  const httpsPrefixes = hosts.map((h) => {
    const trimmed = h.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${trimmed}`
  })
  return [Linking.createURL('/'), schemePrefix, ...httpsPrefixes]
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: buildPrefixes(),
  config: {
    screens: {
      LaunchChoice: 'auth',
      AuthCallback: {
        path: 'auth/callback/:provider',
      },
      EmailCallback: 'auth/callback/email',
      PasswordResetRequest: 'auth/password-flows/forgot-password',
      PasswordResetUpdate: 'auth/password-flows/update-password',
      AuthCallbackError: 'auth/callback-error',
      Clinician: {
        screens: {
          ClinicianAuthEntry: 'clinician/login',
          ClinicianTabs: {
            screens: {
              ClinicianHome: 'clinician/today',
              IntakeQueue: 'clinician/screenings',
              Patients: 'clinician/patients',
              ClinicianProfile: 'clinician/profile',
            },
          },
        },
      },
      Patient: {
        screens: {
          PatientAuthEntry: 'patient/login',
          InviteEntry: 'screening/verify',
          WebFallback: 'web-fallback',
          PatientTabs: {
            screens: {
              PatientHome: 'patient/home',
              Timeline: 'patient/history',
              Profile: 'patient/profile',
            },
          },
        },
      },
    },
  },
}
