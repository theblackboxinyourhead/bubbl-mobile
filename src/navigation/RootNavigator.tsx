import { createBottomTabNavigator, type BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack'
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { InviteEntryScreen } from '@/screens/patient/InviteEntryScreen'
import { WebFallbackScreen } from '@/screens/patient/WebFallbackScreen'
import { VerifyOtpScreen } from '@/screens/patient/VerifyOtpScreen'
import { ConsentScreen } from '@/screens/patient/ConsentScreen'
import { IntakeScreen } from '@/screens/patient/IntakeScreen'
import { ReviewConfirmScreen } from '@/screens/patient/ReviewConfirmScreen'
import { CompleteScreen } from '@/screens/patient/CompleteScreen'
import { Phase1PatientLandingScreen } from '@/screens/patient/Phase1PatientLandingScreen'
import { TimelineScreen } from '@/screens/patient/TimelineScreen'
import { PatientHomeScreen } from '@/screens/patient/PatientHomeScreen'
import { PatientScreeningDetailScreen } from '@/screens/patient/PatientScreeningDetailScreen'
import { CheckInStartScreen } from '@/screens/patient/CheckInStartScreen'
import { ShareScreen } from '@/screens/patient/ShareScreen'
import { ProfileScreen } from '@/screens/patient/ProfileScreen'
import { PatientAuthEntryScreen } from '@/screens/patient/PatientAuthEntryScreen'
import { PatientPhoneVerificationScreen } from '@/screens/patient/PatientPhoneVerificationScreen'
import { LoginScreen } from '@/screens/clinician/LoginScreen'
import { HomeScreen } from '@/screens/clinician/HomeScreen'
import { IntakeQueueScreen } from '@/screens/clinician/IntakeQueueScreen'
import { ScreeningDetailScreen } from '@/screens/clinician/ScreeningDetailScreen'
import { PatientProfileScreen } from '@/screens/clinician/PatientProfileScreen'
import { PatientsScreen } from '@/screens/clinician/PatientsScreen'
import { ClinicianProfileScreen } from '@/screens/clinician/ClinicianProfileScreen'
import { ClinicianCompanyRegistrationScreen } from '@/screens/clinician/ClinicianCompanyRegistrationScreen'
import { LaunchChoiceScreen } from '@/screens/shared/LaunchChoiceScreen'
import { AuthCallbackScreen } from '@/screens/shared/AuthCallbackScreen'
import { AuthCallbackErrorScreen } from '@/screens/shared/AuthCallbackErrorScreen'
import { EmailCallbackScreen } from '@/screens/shared/EmailCallbackScreen'
import { PasswordResetRequestScreen } from '@/screens/shared/PasswordResetRequestScreen'
import { PasswordResetUpdateScreen } from '@/screens/shared/PasswordResetUpdateScreen'
import type { OAuthCallbackProvider } from '@/types/validation'
import { lumina } from '@/screens/shared/lumina'

export type PatientTabParamList = {
  PatientHome: undefined
  Timeline: undefined
  Profile: undefined
}

export type ClinicianTabParamList = {
  ClinicianHome: { focusSection?: 'visit-readiness' } | undefined
  IntakeQueue: undefined
  Patients: undefined
  ClinicianProfile: undefined
}

export type PatientStackParamList = {
  PatientAuthEntry: undefined
  PatientPhoneVerification: undefined
  InviteEntry: { screeningId?: string; rawToken?: string } | undefined
  WebFallback: { url: string }
  VerifyOtp: { screeningId: string; preSent?: boolean; displayPhone?: string | null }
  Consent: { returnTo: 'intake' | 'checkin'; screeningId?: string; source?: 'invite' | 'self' }
  Intake: { screeningId: string; source: 'invite' | 'self' }
  ReviewConfirm: { screeningId: string; source: 'invite' | 'self' }
  Complete: { screeningId: string }
  Phase1PatientLanding: undefined
  PatientTabs: NavigatorScreenParams<PatientTabParamList> | undefined
  PatientScreeningDetail: { screeningId: string }
  CheckInStart: undefined
  Share: { screeningId?: string }
}

export type ClinicianStackParamList = {
  ClinicianAuthEntry: undefined
  ClinicianCompanyRegistration: undefined
  ClinicianTabs: NavigatorScreenParams<ClinicianTabParamList> | undefined
  ClinicianScreeningDetail: { screeningId: string; initialTab?: 'summary' | 'scribe' | 'notes' }
  PatientProfile: { patientId: string }
}

export type RootStackParamList = {
  LaunchChoice: undefined
  Patient: NavigatorScreenParams<PatientStackParamList> | undefined
  Clinician: NavigatorScreenParams<ClinicianStackParamList> | undefined
  AuthCallback: { provider: OAuthCallbackProvider; rawUrl?: string }
  EmailCallback: { rawUrl?: string } | undefined
  PasswordResetRequest: { roleHint?: 'patient' | 'clinician' | null } | undefined
  PasswordResetUpdate: { rawUrl?: string } | undefined
  AuthCallbackError: { reason: string; roleHint?: 'patient' | 'clinician' | null }
}

export type PatientTabScreenProps<T extends keyof PatientTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, T>,
  NativeStackScreenProps<PatientStackParamList>
>

export type ClinicianTabScreenProps<T extends keyof ClinicianTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<ClinicianTabParamList, T>,
  NativeStackScreenProps<ClinicianStackParamList>
>

const PatientTab = createBottomTabNavigator<PatientTabParamList>()
const ClinicianTab = createBottomTabNavigator<ClinicianTabParamList>()
const PatientStack = createNativeStackNavigator<PatientStackParamList>()
const ClinicianStack = createNativeStackNavigator<ClinicianStackParamList>()
const RootStack = createNativeStackNavigator<RootStackParamList>()

function patientTabIcon(routeName: keyof PatientTabParamList, focused: boolean): keyof typeof Ionicons.glyphMap {
  if (routeName === 'PatientHome') return focused ? 'home' : 'home-outline'
  if (routeName === 'Timeline') return focused ? 'time' : 'time-outline'
  return focused ? 'person' : 'person-outline'
}

function clinicianTabIcon(
  routeName: keyof ClinicianTabParamList,
  focused: boolean
): keyof typeof Ionicons.glyphMap {
  if (routeName === 'ClinicianHome') return focused ? 'home' : 'home-outline'
  if (routeName === 'IntakeQueue') return focused ? 'list' : 'list-outline'
  if (routeName === 'Patients') return focused ? 'people' : 'people-outline'
  return focused ? 'person' : 'person-outline'
}

function PatientTabsNavigator({ onSignOut }: { onSignOut: () => Promise<void> | void }) {
  return (
    <PatientTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: lumina.primary,
        tabBarInactiveTintColor: lumina.onSurfaceVariant,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={patientTabIcon(route.name as keyof PatientTabParamList, focused)} size={size} color={color} />
        ),
      })}
    >
      <PatientTab.Screen name="PatientHome" component={PatientHomeScreen} options={{ tabBarLabel: 'Home' }} />
      <PatientTab.Screen name="Timeline" component={TimelineScreen} options={{ tabBarLabel: 'History' }} />
      <PatientTab.Screen name="Profile" options={{ tabBarLabel: 'Profile' }}>
        {(props) => <ProfileScreen {...props} onSignOut={onSignOut} />}
      </PatientTab.Screen>
    </PatientTab.Navigator>
  )
}

function ClinicianTabsNavigator({ onSignOut }: { onSignOut: () => Promise<void> | void }) {
  return (
    <ClinicianTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: lumina.primary,
        tabBarInactiveTintColor: lumina.onSurfaceVariant,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={clinicianTabIcon(route.name as keyof ClinicianTabParamList, focused)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <ClinicianTab.Screen name="ClinicianHome" component={HomeScreen} options={{ tabBarLabel: 'Today' }} />
      <ClinicianTab.Screen name="IntakeQueue" component={IntakeQueueScreen} options={{ tabBarLabel: 'Screenings' }} />
      <ClinicianTab.Screen name="Patients" component={PatientsScreen} options={{ tabBarLabel: 'Patients' }} />
      <ClinicianTab.Screen name="ClinicianProfile" options={{ tabBarLabel: 'Profile' }}>
        {(props) => <ClinicianProfileScreen {...props} onSignOut={onSignOut} />}
      </ClinicianTab.Screen>
    </ClinicianTab.Navigator>
  )
}

export function PatientNavigator({
  initial,
  onBackToRoles,
  onSignOut,
  onAuthResolved,
  bootstrapError,
}: {
  initial?: keyof PatientStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
}) {
  return (
    <PatientStack.Navigator
      initialRouteName={initial ?? 'PatientAuthEntry'}
      screenOptions={{ headerShown: true }}
    >
      <PatientStack.Screen
        name="PatientAuthEntry"
        options={{ title: 'Bubbl' }}
      >
        {(props) => <PatientAuthEntryScreen {...props} onBackToRoles={onBackToRoles} bootstrapError={bootstrapError} />}
      </PatientStack.Screen>
      <PatientStack.Screen name="PatientPhoneVerification">
        {(props) => <PatientPhoneVerificationScreen {...props} onResolved={onAuthResolved} />}
      </PatientStack.Screen>
      <PatientStack.Screen name="InviteEntry" component={InviteEntryScreen} options={{ title: 'Invite' }} />
      <PatientStack.Screen name="WebFallback" component={WebFallbackScreen} />
      <PatientStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <PatientStack.Screen name="Consent" component={ConsentScreen} />
      <PatientStack.Screen name="Intake" component={IntakeScreen} options={{ title: 'Intake' }} />
      <PatientStack.Screen name="ReviewConfirm" component={ReviewConfirmScreen} />
      <PatientStack.Screen name="Complete" component={CompleteScreen} />
      <PatientStack.Screen name="Phase1PatientLanding">
        {(props) => <Phase1PatientLandingScreen {...props} onSignOut={onSignOut} />}
      </PatientStack.Screen>
      <PatientStack.Screen name="PatientTabs" options={{ headerShown: false }}>
        {() => <PatientTabsNavigator onSignOut={onSignOut} />}
      </PatientStack.Screen>
      <PatientStack.Screen
        name="PatientScreeningDetail"
        component={PatientScreeningDetailScreen}
        options={{ title: 'Screening', headerBackTitle: 'Back' }}
      />
      <PatientStack.Screen name="CheckInStart" component={CheckInStartScreen} />
      <PatientStack.Screen name="Share" component={ShareScreen} />
    </PatientStack.Navigator>
  )
}

export function ClinicianNavigator({
  initial,
  onBackToRoles,
  onSignOut,
  onAuthResolved,
  bootstrapError,
}: {
  initial?: keyof ClinicianStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
}) {
  return (
    <ClinicianStack.Navigator
      initialRouteName={initial ?? 'ClinicianAuthEntry'}
      screenOptions={{ headerShown: true }}
    >
      <ClinicianStack.Screen name="ClinicianAuthEntry" options={{ title: 'Clinician authentication' }}>
        {(props) => <LoginScreen {...props} onBackToRoles={onBackToRoles} bootstrapError={bootstrapError} />}
      </ClinicianStack.Screen>
      <ClinicianStack.Screen name="ClinicianCompanyRegistration" options={{ title: 'Company setup' }}>
        {(props) => <ClinicianCompanyRegistrationScreen {...props} onResolved={onAuthResolved} />}
      </ClinicianStack.Screen>
      <ClinicianStack.Screen name="ClinicianTabs" options={{ headerShown: false }}>
        {() => <ClinicianTabsNavigator onSignOut={onSignOut} />}
      </ClinicianStack.Screen>
      <ClinicianStack.Screen
        name="ClinicianScreeningDetail"
        component={ScreeningDetailScreen}
        options={{ title: 'Screening', headerBackTitle: 'Back' }}
      />
      <ClinicianStack.Screen
        name="PatientProfile"
        component={PatientProfileScreen}
        options={{ title: 'Patient', headerBackTitle: 'Back' }}
      />
    </ClinicianStack.Navigator>
  )
}

function PatientStackHost({
  patientInitial,
  onBackToRoles,
  onSignOut,
  onAuthResolved,
  bootstrapError,
}: {
  patientInitial?: keyof PatientStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
}) {
  return (
    <PatientNavigator
      initial={patientInitial}
      onBackToRoles={onBackToRoles}
      onSignOut={onSignOut}
      onAuthResolved={onAuthResolved}
      bootstrapError={bootstrapError}
    />
  )
}

function ClinicianStackHost({
  clinicianInitial,
  onBackToRoles,
  onSignOut,
  onAuthResolved,
  bootstrapError,
}: {
  clinicianInitial?: keyof ClinicianStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
}) {
  return (
    <ClinicianNavigator
      initial={clinicianInitial}
      onBackToRoles={onBackToRoles}
      onSignOut={onSignOut}
      onAuthResolved={onAuthResolved}
      bootstrapError={bootstrapError}
    />
  )
}

export function RootNavigator({
  mode,
  patientInitial,
  clinicianInitial,
  onContinueAsPatient,
  onClinicianSignIn,
  onReturnToAuth,
  onSignOut,
  onAuthResolved,
  onEnsureLaunchMode,
  bootstrapAuthError,
}: {
  mode: 'launch' | 'patient' | 'clinician'
  patientInitial?: keyof PatientStackParamList
  clinicianInitial?: keyof ClinicianStackParamList
  onContinueAsPatient: () => void
  onClinicianSignIn: () => void
  onReturnToAuth: (role: 'patient' | 'clinician' | null) => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  onEnsureLaunchMode: () => void
  bootstrapAuthError?: string | null
}) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {mode === 'launch' ? (
        <RootStack.Screen name="LaunchChoice">
          {() => (
            <LaunchChoiceScreen
              onContinueAsPatient={onContinueAsPatient}
              onClinicianSignIn={onClinicianSignIn}
            />
          )}
        </RootStack.Screen>
      ) : null}

      {mode === 'patient' ? (
        <RootStack.Screen name="Patient">
          {() => (
            <PatientStackHost
              patientInitial={patientInitial}
              onBackToRoles={() => onReturnToAuth(null)}
              onSignOut={onSignOut}
              onAuthResolved={onAuthResolved}
              bootstrapError={bootstrapAuthError}
            />
          )}
        </RootStack.Screen>
      ) : null}

      {mode === 'clinician' ? (
        <RootStack.Screen name="Clinician">
          {() => (
            <ClinicianStackHost
              clinicianInitial={clinicianInitial}
              onBackToRoles={() => onReturnToAuth(null)}
              onSignOut={onSignOut}
              onAuthResolved={onAuthResolved}
              bootstrapError={bootstrapAuthError}
            />
          )}
        </RootStack.Screen>
      ) : null}

      <RootStack.Screen name="AuthCallback">
        {(props) => (
          <AuthCallbackScreen
            {...props}
            onAuthResolved={onAuthResolved}
            onAuthError={(reason, roleHint) => {
              onEnsureLaunchMode()
              // eslint-disable-next-line react/prop-types
              props.navigation.replace('AuthCallbackError', { reason, roleHint })
            }}
          />
        )}
      </RootStack.Screen>

      <RootStack.Screen name="EmailCallback">
        {(props) => (
          <EmailCallbackScreen
            {...props}
            onAuthResolved={onAuthResolved}
            onAuthError={(reason, roleHint) => {
              onEnsureLaunchMode()
              // eslint-disable-next-line react/prop-types
              props.navigation.replace('AuthCallbackError', { reason, roleHint })
            }}
          />
        )}
      </RootStack.Screen>

      <RootStack.Screen name="PasswordResetRequest">
        {(props) => (
          <PasswordResetRequestScreen
            {...props}
            onReturnToAuth={onReturnToAuth}
          />
        )}
      </RootStack.Screen>

      <RootStack.Screen name="PasswordResetUpdate">
        {(props) => (
          <PasswordResetUpdateScreen
            {...props}
            onReturnToAuth={onReturnToAuth}
            onAuthError={(reason, roleHint) => {
              onEnsureLaunchMode()
              // eslint-disable-next-line react/prop-types
              props.navigation.replace('AuthCallbackError', { reason, roleHint })
            }}
          />
        )}
      </RootStack.Screen>

      <RootStack.Screen name="AuthCallbackError">
        {(props) => (
          <AuthCallbackErrorScreen
            {...props}
            onReturnToAuth={onReturnToAuth}
          />
        )}
      </RootStack.Screen>
    </RootStack.Navigator>
  )
}
