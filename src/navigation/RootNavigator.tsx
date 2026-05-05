import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
  type BottomTabScreenProps,
} from '@react-navigation/bottom-tabs'
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack'
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Platform, Text, View } from 'react-native'
import { InviteEntryScreen } from '@/screens/patient/InviteEntryScreen'
import { WebFallbackScreen } from '@/screens/patient/WebFallbackScreen'
import { VerifyOtpScreen } from '@/screens/patient/VerifyOtpScreen'
import { ConsentScreen } from '@/screens/patient/ConsentScreen'
import { IntakeScreen } from '@/screens/patient/IntakeScreen'
import { ReviewConfirmScreen } from '@/screens/patient/ReviewConfirmScreen'
import { CompleteScreen } from '@/screens/patient/CompleteScreen'
import { TimelineScreen } from '@/screens/patient/TimelineScreen'
import { PatientHomeScreen } from '@/screens/patient/PatientHomeScreen'
import { PatientScreeningDetailScreen } from '@/screens/patient/PatientScreeningDetailScreen'
import { CheckInStartScreen } from '@/screens/patient/CheckInStartScreen'
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
  PatientTabs: NavigatorScreenParams<PatientTabParamList> | undefined
  PatientScreeningDetail: { screeningId: string }
  CheckInStart: undefined
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

const authenticatedHeaderBackground = lumina.surfaceLowest
const authenticatedHeaderTitleColor = lumina.onSurface
const authenticatedHeaderTintColor = lumina.primary
const authenticatedHeaderShadowVisible = false
const authenticatedDetailHeaderStyle = {
  backgroundColor: authenticatedHeaderBackground,
}

function buildAuthenticatedTabHeaderOptions(): BottomTabNavigationOptions {
  return {
    headerStyle: {
      backgroundColor: authenticatedHeaderBackground,
    },
    headerTitleStyle: {
      color: authenticatedHeaderTitleColor,
      fontSize: 17,
      fontWeight: '700',
    },
    headerTintColor: authenticatedHeaderTintColor,
    headerShadowVisible: authenticatedHeaderShadowVisible,
  }
}

function buildAuthenticatedTabBarOptions(): Pick<
  BottomTabNavigationOptions,
  'tabBarStyle' | 'tabBarItemStyle'
> {
  return {
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopWidth: 0,
      elevation: 8,
      shadowColor: '#006B66',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    tabBarItemStyle: {
      paddingVertical: 4,
    },
  }
}

function buildAuthenticatedDetailHeaderOptions(): NativeStackNavigationOptions {
  return {
    headerStyle: authenticatedDetailHeaderStyle,
    headerTitleStyle: {
      color: authenticatedHeaderTitleColor,
      fontSize: 17,
      fontWeight: '700',
    },
    headerTintColor: authenticatedHeaderTintColor,
    headerShadowVisible: authenticatedHeaderShadowVisible,
    headerLargeTitle: false,
  }
}

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
      sceneContainerStyle={{ backgroundColor: lumina.surface }}
      screenOptions={({ route }) => ({
        ...buildAuthenticatedTabHeaderOptions(),
        ...buildAuthenticatedTabBarOptions(),
        tabBarActiveTintColor: lumina.primary,
        tabBarInactiveTintColor: lumina.onSurfaceVariant,
        tabBarIcon: ({ color, size, focused }) => (
          <View
            style={[
              { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
              focused
                ? Platform.select({
                    ios: {
                      shadowColor: lumina.primaryGlow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                    },
                    android: { elevation: 4 },
                    default: {},
                  })
                : undefined,
            ]}
          >
            <Ionicons
              name={patientTabIcon(route.name as keyof PatientTabParamList, focused)}
              size={size}
              color={color}
            />
          </View>
        ),
      })}
    >
      <PatientTab.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>Home</Text>
          ),
          title: 'Home',
        }}
      />
      <PatientTab.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>History</Text>
          ),
          title: 'History',
        }}
      />
      <PatientTab.Screen
        name="Profile"
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>Profile</Text>
          ),
          title: 'Profile',
        }}
      >
        {(props) => <ProfileScreen {...props} onSignOut={onSignOut} />}
      </PatientTab.Screen>
    </PatientTab.Navigator>
  )
}

function ClinicianTabsNavigator({ onSignOut }: { onSignOut: () => Promise<void> | void }) {
  return (
    <ClinicianTab.Navigator
      sceneContainerStyle={{ backgroundColor: lumina.surface }}
      screenOptions={({ route }) => ({
        ...buildAuthenticatedTabHeaderOptions(),
        ...buildAuthenticatedTabBarOptions(),
        tabBarActiveTintColor: lumina.primary,
        tabBarInactiveTintColor: lumina.onSurfaceVariant,
        tabBarIcon: ({ color, size, focused }) => (
          <View
            style={[
              { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
              focused
                ? Platform.select({
                    ios: {
                      shadowColor: lumina.primaryGlow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                    },
                    android: { elevation: 4 },
                    default: {},
                  })
                : undefined,
            ]}
          >
            <Ionicons
              name={clinicianTabIcon(route.name as keyof ClinicianTabParamList, focused)}
              size={size}
              color={color}
            />
          </View>
        ),
      })}
    >
      <ClinicianTab.Screen
        name="ClinicianHome"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>Today</Text>
          ),
          title: 'Today',
        }}
      />
      <ClinicianTab.Screen
        name="IntakeQueue"
        component={IntakeQueueScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>Screenings</Text>
          ),
          title: 'Screenings',
        }}
      />
      <ClinicianTab.Screen
        name="Patients"
        component={PatientsScreen}
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>Patients</Text>
          ),
          title: 'Patients',
        }}
      />
      <ClinicianTab.Screen
        name="ClinicianProfile"
        options={{
          tabBarLabel: ({ focused, color }) => (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? '700' : '500' }}>Profile</Text>
          ),
          title: 'Profile',
        }}
      >
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
  authBootstrapLoading,
  onPasswordSignInAccepted,
}: {
  initial?: keyof PatientStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
}) {
  return (
    <PatientStack.Navigator
      initialRouteName={initial ?? 'PatientAuthEntry'}
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: lumina.surface },
        animation: 'fade',
      }}
    >
      <PatientStack.Screen
        name="PatientAuthEntry"
        options={{ title: 'Bubbl' }}
      >
        {(props) => (
          <PatientAuthEntryScreen
            {...props}
            onBackToRoles={onBackToRoles}
            bootstrapError={bootstrapError}
            authBootstrapLoading={authBootstrapLoading}
            onPasswordSignInAccepted={onPasswordSignInAccepted}
          />
        )}
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
      <PatientStack.Screen name="Complete">
        {(props) => <CompleteScreen {...props} onSignOut={onSignOut} />}
      </PatientStack.Screen>
      <PatientStack.Screen name="PatientTabs" options={{ headerShown: false }}>
        {() => <PatientTabsNavigator onSignOut={onSignOut} />}
      </PatientStack.Screen>
      <PatientStack.Screen
        name="PatientScreeningDetail"
        component={PatientScreeningDetailScreen}
        options={{ ...buildAuthenticatedDetailHeaderOptions(), title: 'Screening', headerBackTitle: 'Back' }}
      />
      <PatientStack.Screen name="CheckInStart" component={CheckInStartScreen} />
    </PatientStack.Navigator>
  )
}

export function ClinicianNavigator({
  initial,
  onBackToRoles,
  onSignOut,
  onAuthResolved,
  bootstrapError,
  authBootstrapLoading,
  onPasswordSignInAccepted,
}: {
  initial?: keyof ClinicianStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
}) {
  return (
    <ClinicianStack.Navigator
      initialRouteName={initial ?? 'ClinicianAuthEntry'}
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: lumina.surface },
        animation: 'fade',
      }}
    >
      <ClinicianStack.Screen name="ClinicianAuthEntry" options={{ title: 'Clinician authentication' }}>
        {(props) => (
          <LoginScreen
            {...props}
            onBackToRoles={onBackToRoles}
            bootstrapError={bootstrapError}
            authBootstrapLoading={authBootstrapLoading}
            onPasswordSignInAccepted={onPasswordSignInAccepted}
          />
        )}
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
        options={{ ...buildAuthenticatedDetailHeaderOptions(), title: 'Screening', headerBackTitle: 'Back' }}
      />
      <ClinicianStack.Screen
        name="PatientProfile"
        component={PatientProfileScreen}
        options={{ ...buildAuthenticatedDetailHeaderOptions(), title: 'Patient', headerBackTitle: 'Back' }}
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
  authBootstrapLoading,
  onPasswordSignInAccepted,
}: {
  patientInitial?: keyof PatientStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
}) {
  return (
    <PatientNavigator
      initial={patientInitial}
      onBackToRoles={onBackToRoles}
      onSignOut={onSignOut}
      onAuthResolved={onAuthResolved}
      bootstrapError={bootstrapError}
      authBootstrapLoading={authBootstrapLoading}
      onPasswordSignInAccepted={onPasswordSignInAccepted}
    />
  )
}

function ClinicianStackHost({
  clinicianInitial,
  onBackToRoles,
  onSignOut,
  onAuthResolved,
  bootstrapError,
  authBootstrapLoading,
  onPasswordSignInAccepted,
}: {
  clinicianInitial?: keyof ClinicianStackParamList
  onBackToRoles: () => void
  onSignOut: () => Promise<void> | void
  onAuthResolved: () => Promise<void> | void
  bootstrapError?: string | null
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
}) {
  return (
    <ClinicianNavigator
      initial={clinicianInitial}
      onBackToRoles={onBackToRoles}
      onSignOut={onSignOut}
      onAuthResolved={onAuthResolved}
      bootstrapError={bootstrapError}
      authBootstrapLoading={authBootstrapLoading}
      onPasswordSignInAccepted={onPasswordSignInAccepted}
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
  authBootstrapLoading,
  onPasswordSignInAccepted,
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
  authBootstrapLoading: boolean
  onPasswordSignInAccepted: () => void
}) {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: lumina.surface },
        animation: 'fade',
      }}
    >
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
              authBootstrapLoading={authBootstrapLoading}
              onPasswordSignInAccepted={onPasswordSignInAccepted}
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
              authBootstrapLoading={authBootstrapLoading}
              onPasswordSignInAccepted={onPasswordSignInAccepted}
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
