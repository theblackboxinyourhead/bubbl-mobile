import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { createPatientShare, listPatientShares, revokePatientShare } from '@/api/patients'
import { getApiBaseUrl } from '@/lib/config'
import { ApiError } from '@/lib/apiClient'
import { lumina, luminaFonts, luminaStyles } from '@/screens/shared/lumina'
import { EmptyState, ErrorState, LoadingState } from '@/screens/shared/ScreenState'
import { formatDateTimeLabel } from '@/lib/datetime'

type Props = NativeStackScreenProps<PatientStackParamList, 'Share'>
type ShareItem = {
  shareId: string
  screeningId: string
  url: string
  createdAt: string
  expiresAt: string
}

export function ShareScreen({ route }: Props) {
  const screeningId = route.params?.screeningId
  const [list, setList] = useState<ShareItem[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await listPatientShares()
      const arr = Array.isArray(r.shares) ? (r.shares as ShareItem[]) : []
      setList(arr)
    } catch {
      setList([])
      setError('Failed to load existing links.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <ScrollView style={luminaStyles.screen} contentContainerStyle={luminaStyles.pageContent}>
      <Text style={styles.title}>Caregiver share</Text>

      {screeningId ? (
        <View style={luminaStyles.stage}>
          <Pressable
            style={({ pressed }) => [luminaStyles.primaryButton, pressed && luminaStyles.pressedButton]}
            onPress={async () => {
              setMessage(null)
              try {
                const created = await createPatientShare(screeningId)
                const url = created.url ?? `${getApiBaseUrl()}/shares/screenings/${created.shareId}`
                await Share.share({ message: url })
                setMessage('Share link created.')
                await load()
              } catch (error) {
                if (error instanceof ApiError && error.status === 409) {
                  setMessage('Screening must be completed before sharing.')
                } else {
                  setMessage('Could not create share link.')
                }
              }
            }}
          >
            <Text style={luminaStyles.primaryButtonText}>Create link</Text>
          </Pressable>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      ) : null}

      {loading ? <LoadingState label="Loading links..." /> : null}
      {!loading && error ? <ErrorState body={error} onRetry={() => void load()} /> : null}
      {!loading && !error && list.length === 0 ? (
        <EmptyState
          title="No active links"
          body={
            screeningId
              ? 'Create one to share this screening.'
              : 'Active share links will appear here.'
          }
        />
      ) : null}

      {!loading && !error
        ? list.map((share) => (
            <View key={share.shareId} style={luminaStyles.card}>
              <Text style={styles.url} numberOfLines={2} ellipsizeMode="middle">
                {share.url}
              </Text>
              <Text style={styles.meta} numberOfLines={1} ellipsizeMode="middle">
                Screening: {share.screeningId}
              </Text>
              <Text style={styles.meta}>Expires: {formatDateTimeLabel(share.expiresAt)}</Text>
              <View style={styles.row}>
                <Pressable
                  style={({ pressed }) => [
                    luminaStyles.actionTintedButton,
                    pressed && luminaStyles.pressedButton,
                  ]}
                  onPress={() => void Share.share({ message: share.url })}
                >
                  <Text style={luminaStyles.actionTintedButtonText}>Share</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    luminaStyles.actionTintedButton,
                    pressed && luminaStyles.pressedButton,
                  ]}
                  onPress={() => void Clipboard.setStringAsync(share.url)}
                >
                  <Text style={luminaStyles.actionTintedButtonText}>Copy</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.revoke,
                    pressed && luminaStyles.pressedButton,
                  ]}
                  onPress={() => void revokePatientShare(share.shareId).then(load)}
                >
                  <Text style={styles.revokeText}>Revoke</Text>
                </Pressable>
              </View>
            </View>
          ))
        : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  title: {
    color: lumina.onSurface,
    fontSize: 20,
    fontFamily: luminaFonts.displaySemi,
  },
  message: {
    color: lumina.primary,
    marginBottom: 10,
    fontFamily: luminaFonts.bodyMedium,
  },
  url: {
    color: lumina.onSurfaceVariant,
    fontSize: 12,
    fontFamily: luminaFonts.body,
  },
  meta: {
    color: lumina.onSurfaceVariant,
    marginTop: 4,
    fontSize: 12,
    fontFamily: luminaFonts.body,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  revoke: {
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revokeText: {
    color: '#991B1B',
    fontSize: 14,
    fontFamily: luminaFonts.bodySemi,
  },
})
