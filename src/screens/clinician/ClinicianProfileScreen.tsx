import { useCallback, useState } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import Constants from 'expo-constants'
import type { ClinicianTabScreenProps } from '@/navigation/RootNavigator'
import { fetchAuthMe } from '@/api/auth'
import { fetchClinicianSettings, type ClinicianSettings } from '@/api/clinicians'
import { supabase } from '@/lib/supabase'
import { ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { SummaryBadge, type SummaryBadgeTone } from '@/screens/clinician/components/summary/SummaryBadge'
import { SummaryDataRow } from '@/screens/clinician/components/summary/SummaryDataRow'
import { SummarySectionCard } from '@/screens/clinician/components/summary/SummarySectionCard'
import { SummaryEmptyState } from '@/screens/clinician/components/summary/SummaryEmptyState'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'

type Props = ClinicianTabScreenProps<'ClinicianProfile'> & {
  onSignOut: () => Promise<void> | void
}

function formatFullName(firstName: string, lastName: string): string | null {
  const first = firstName.trim()
  const last = lastName.trim()
  const joined = [first, last].filter((p) => p.length > 0).join(' ')
  return joined.length > 0 ? joined : null
}

function dedupeAddress(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const seen = new Set<string>()
  const parts: string[] = []
  for (const raw of trimmed.split(',')) {
    const part = raw.trim()
    if (!part) continue
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    parts.push(part)
  }
  return parts.length > 0 ? parts.join(', ') : null
}

function formatPhoneForDisplay(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return trimmed
}

export function ClinicianProfileScreen({ onSignOut }: Props) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [supportEmail, setSupportEmail] = useState<string | null>(null)
  const [supportPhone, setSupportPhone] = useState<string | null>(null)
  const [settings, setSettings] = useState<ClinicianSettings | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [me, authUser] = await Promise.all([fetchAuthMe(), supabase.auth.getUser()])
      if (me.user.user_type !== 'clinician' && me.user.user_type !== 'admin' && me.user.user_type !== 'staff') {
        throw new Error('Clinician profile is unavailable for this account.')
      }
      setEmail(authUser.data.user?.email?.trim() || null)
      setRole(me.user.user_type)
      const scEmail = me.supportContact?.email?.trim()
      const scPhone = me.supportContact?.phone?.trim()
      setSupportEmail(scEmail || null)
      setSupportPhone(scPhone || null)
      const nextSettings =
        me.user.user_type === 'clinician'
          ? await fetchClinicianSettings().catch((settingsError) => {
              if (__DEV__) console.error('[mobile clinician profile] settings load failed', settingsError)
              return null
            })
          : null
      setSettings(nextSettings)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load profile.')
      setEmail(null)
      setRole(null)
      setSupportEmail(null)
      setSupportPhone(null)
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const inboundStatus = settings?.inboundAdmin.status
  const inboundAdminStatusLabel =
    inboundStatus === 'enabled'
      ? 'Enabled'
      : inboundStatus === 'blocked'
        ? 'Blocked'
        : inboundStatus === 'needs_attention'
          ? 'Needs attention'
          : 'Not enabled'
  const inboundAdminStatusTone: SummaryBadgeTone =
    inboundStatus === 'enabled'
      ? 'highlight'
      : inboundStatus === 'blocked'
        ? 'badge-red'
        : inboundStatus === 'needs_attention'
          ? 'badge-yellow'
          : 'badge-gray'

  return (
    <ScrollView style={luminaStyles.screenTransparent} contentContainerStyle={[luminaStyles.pageContent, { paddingTop: insets.top + 14 }]}>
      {loading ? <LoadingState label="Loading profile..." /> : null}
      {error ? <ErrorState body={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <>
          <View style={styles.identityHeader}>
            {settings?.clinic.name ? (
              <Text style={luminaStyles.eyebrow}>{settings.clinic.name}</Text>
            ) : null}
            <Text style={luminaStyles.largeTitle}>
              {formatFullName(settings?.provider.firstName ?? '', settings?.provider.lastName ?? '') ?? 'Profile'}
            </Text>
          </View>

          <SummarySectionCard title="Profile" icon="person-outline">
            <InlineWrapRow
              emphasize
              label="Name"
              value={formatFullName(settings?.provider.firstName ?? '', settings?.provider.lastName ?? '')}
            />
            <InlineWrapRow label="Email" value={email} />
            <InlineWrapRow label="Clinic name" value={settings?.clinic.name || null} />
            <InlineWrapRow label="Clinic phone" value={formatPhoneForDisplay(settings?.clinic.phone)} />
            <InlineWrapRow label="Address" value={dedupeAddress(settings?.clinic.address)} />
            <SummaryDataRow
              inline
              label="Role"
              valueNode={
                <SummaryBadge
                  tone="badge-blue"
                  label={role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Clinician'}
                />
              }
            />
          </SummarySectionCard>

          <SummarySectionCard title="Inbound admin calls" icon="call-outline">
            <SummaryDataRow
              inline
              label="Status"
              valueNode={<SummaryBadge tone={inboundAdminStatusTone} label={inboundAdminStatusLabel} />}
            />
            <InlineWrapRow
              label="Clinic primary phone"
              value={formatPhoneForDisplay(settings?.clinic.phone)}
            />
            {settings?.inboundAdmin.message ? (
              <InlineWrapRow label="Message" value={settings.inboundAdmin.message} />
            ) : null}
            {settings &&
            (settings.inboundAdmin.status === 'enabled' || settings.inboundAdmin.status === 'needs_attention') &&
            settings.inboundAdmin.inboundAdminTwilioNumber ? (
              <InlineWrapRow
                label="Bubbl call-in number"
                value={formatPhoneForDisplay(settings.inboundAdmin.inboundAdminTwilioNumber)}
              />
            ) : null}
            {settings?.inboundAdmin.status === 'enabled' ? (
              <>
                <InlineWrapRow label="Option 1" value="Share this number with patients." />
                <InlineWrapRow
                  label="Option 2"
                  value="Forward your clinic's existing line to this number."
                />
              </>
            ) : null}
          </SummarySectionCard>

          <SummarySectionCard title="Support" icon="help-circle-outline">
            {supportEmail ? (
              <ContactRow
                label="Email"
                value={supportEmail}
                onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}
              />
            ) : null}
            {supportPhone ? (
              <ContactRow
                label="Phone"
                value={supportPhone}
                onPress={() => void Linking.openURL(`tel:${supportPhone.replace(/[^\d+]/g, '')}`)}
              />
            ) : null}
            {!supportEmail && !supportPhone ? (
              <SummaryEmptyState label="No support contacts on file." />
            ) : null}
          </SummarySectionCard>
        </>
      ) : null}

      <Pressable
        testID="sign-out-button"
        style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
        onPress={() => void onSignOut()}
      >
        <Text style={luminaStyles.primaryButtonText}>Sign out</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Bubbl · v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </View>
    </ScrollView>
  )
}

function ContactRow({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress: () => void
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.contactRow, pressed && luminaStyles.pressedRow]}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
    >
      <SummaryDataRow inline label={label} value={value} />
    </Pressable>
  )
}

function InlineWrapRow({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: string | null
  emphasize?: boolean
}) {
  const display = value && value.trim().length > 0 ? value : '—'
  return (
    <View style={styles.wrapRow}>
      <Text style={styles.wrapLabel}>{label}</Text>
      <Text style={[styles.wrapValue, emphasize && styles.wrapValueStrong]}>{display}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  identityHeader: {
    gap: 4,
  },
  contactRow: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    minHeight: 44,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  wrapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  wrapLabel: {
    flexShrink: 0,
    paddingTop: 3,
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.bodyMedium,
  },
  wrapValue: {
    flex: 1,
    color: lumina.onSurface,
    fontSize: 15,
    fontFamily: luminaFonts.body,
    lineHeight: 20,
  },
  wrapValueStrong: {
    fontFamily: luminaFonts.bodySemi,
  },
})
