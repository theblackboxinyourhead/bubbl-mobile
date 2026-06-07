import type { ConfigContext, ExpoConfig } from 'expo/config'

type AppVariant = 'development' | 'preview' | 'production'

const MIC =
  'Allow Bubbl to use the microphone for your visit intake and optional clinician recording.'

const variantMap: Record<
  AppVariant,
  { bundleId: string; packageName: string; scheme: string; hosts: string[] }
> = {
  development: {
    bundleId: 'com.bubbl.mobile.dev',
    packageName: 'com.bubbl.mobile.dev',
    scheme: 'bubbl-local',
    hosts: ['dev.bubblhealth.ai'],
  },
  preview: {
    bundleId: 'com.bubbl.mobile.preview',
    packageName: 'com.bubbl.mobile.preview',
    scheme: 'bubbl-dev',
    hosts: ['dev.bubblhealth.ai'],
  },
  production: {
    bundleId: 'com.bubbl.mobile',
    packageName: 'com.bubbl.mobile',
    scheme: 'bubbl',
    hosts: ['app.bubblhealth.ai'],
  },
}

function resolveVariant(): AppVariant {
  const raw = (process.env.APP_VARIANT ?? process.env.EAS_BUILD_PROFILE ?? '').toLowerCase()
  if (raw === 'production') return 'production'
  if (raw === 'preview') return 'preview'
  return 'development'
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant()
  const target = variantMap[variant]
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
  const allowInsecureHttp =
    apiBaseUrl.startsWith('http://') && process.env.EXPO_PUBLIC_ALLOW_INSECURE_HTTP === 'true'

  return {
    ...config,
    name: 'Bubbl',
    slug: 'bubbl-mobile',
    scheme: target.scheme,
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    extra: {
      appVariant: variant,
      apiBaseUrl,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      deepLinkScheme: target.scheme,
      deepLinkHosts: target.hosts,
      e2eMockRealtime: process.env.EXPO_PUBLIC_E2E_MOCK_REALTIME,
    },
    plugins: [
      [
        '@config-plugins/react-native-webrtc',
        {
          microphonePermission: MIC,
        },
      ],
      [
        'expo-notifications',
        {
          sounds: [],
        },
      ],
    ],
    ios: {
      ...config.ios,
      bundleIdentifier: target.bundleId,
      associatedDomains: target.hosts.map((host) => `applinks:${host}`),
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        NSMicrophoneUsageDescription: MIC,
        UIBackgroundModes: ['audio'],
        ...(allowInsecureHttp
          ? {
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: true,
              },
            }
          : {}),
      },
    },
    android: ({
      ...config.android,
      package: target.packageName,
      permissions: ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS'],
      intentFilters: target.hosts.map((host) => ({
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host, pathPrefix: '/screening/verify' },
          { scheme: 'https', host, pathPrefix: '/auth/callback' },
          { scheme: 'https', host, pathPrefix: '/auth/password-flows' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      })),
      ...(allowInsecureHttp ? { usesCleartextTraffic: true } : {}),
    } as ExpoConfig['android']),
  }
}
