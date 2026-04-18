import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PatientStackParamList } from '@/navigation/RootNavigator'
import { createPatientShare, listPatientShares, revokePatientShare } from '@/api/patients'
import { getApiBaseUrl } from '@/lib/config'
import { ApiError } from '@/lib/apiClient'

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

  const load = async () => {
    try {
      const r = await listPatientShares()
      const arr = Array.isArray(r.shares) ? (r.shares as ShareItem[]) : []
      setList(arr)
      setMessage(null)
    } catch {
      setList([])
      setMessage('Failed to load existing links.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Caregiver share</Text>
      {screeningId ? (
        <Pressable
          style={styles.btn}
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
          <Text style={styles.btnText}>Create link</Text>
        </Pressable>
      ) : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {list.map((share) => (
        <View key={share.shareId} style={styles.card}>
          <Text style={styles.url}>{share.url}</Text>
          <Text style={styles.meta}>Screening: {share.screeningId}</Text>
          <Text style={styles.meta}>Expires: {new Date(share.expiresAt).toLocaleString()}</Text>
          <View style={styles.row}>
            <Pressable style={styles.action} onPress={() => void Share.share({ message: share.url })}>
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => void Clipboard.setStringAsync(share.url)}>
              <Text style={styles.actionText}>Copy</Text>
            </Pressable>
            <Pressable
              style={[styles.action, styles.revoke]}
              onPress={() => void revokePatientShare(share.shareId).then(load)}
            >
              <Text style={[styles.actionText, styles.revokeText]}>Revoke</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {list.length === 0 ? (
        <Text style={styles.empty}>No active links. Create one to share this screening.</Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  btn: { backgroundColor: '#0c3d34', padding: 12, borderRadius: 8, marginBottom: 16 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  message: { marginBottom: 10, color: '#174f44' },
  empty: { color: '#5c6c68' },
  card: {
    borderWidth: 1,
    borderColor: '#d4dfdc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  url: { fontSize: 12, color: '#143933' },
  meta: { marginTop: 4, color: '#45635b', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  action: { backgroundColor: '#0c3d34', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  revoke: { backgroundColor: '#fce9e9' },
  revokeText: { color: '#9d2222' },
})
