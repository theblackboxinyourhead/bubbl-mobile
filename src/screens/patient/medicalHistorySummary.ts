export type MedicalHistoryLine = string

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = asText(record[key])
    if (value) return value
  }
  return null
}

type ArrayKey = 'conditions' | 'medications' | 'allergies' | 'surgeries' | 'familyHistory'

const FRIENDLY_LABEL: Record<ArrayKey, string> = {
  conditions: 'conditions',
  medications: 'medications',
  allergies: 'allergies',
  surgeries: 'surgeries',
  familyHistory: 'family history',
}

function formatEntry(key: ArrayKey, entry: Record<string, unknown>): string | null {
  if (key === 'conditions') {
    const name = firstString(entry, ['name', 'condition', 'label'])
    if (!name) return null
    const status = firstString(entry, ['status', 'state'])
    return status ? `${name} (${status})` : name
  }
  if (key === 'medications') {
    const name = firstString(entry, ['name', 'medication', 'drug'])
    if (!name) return null
    const dosage = firstString(entry, ['dosage', 'dose'])
    return dosage ? `${name} (${dosage})` : name
  }
  if (key === 'allergies') {
    const name = firstString(entry, ['allergen', 'name', 'substance'])
    if (!name) return null
    const reaction = firstString(entry, ['reaction'])
    return reaction ? `${name} (${reaction})` : name
  }
  if (key === 'surgeries') {
    const name = firstString(entry, ['procedure', 'name', 'surgery'])
    if (!name) return null
    const year = firstString(entry, ['year', 'date'])
    return year ? `${name} (${year})` : name
  }
  // familyHistory
  const relation = firstString(entry, ['relation'])
  const condition = firstString(entry, ['condition', 'name'])
  if (!relation && !condition) return null
  if (relation && condition) return `${relation}: ${condition}`
  return relation ?? condition
}

export function buildMedicalHistoryLines(
  medicalHistory: Record<string, unknown> | null | undefined
): MedicalHistoryLine[] {
  return buildMedicalHistorySummary(medicalHistory).lines
}

export type MedicalHistorySummary = {
  lines: MedicalHistoryLine[]
  /** Count of readable entries beyond the 6 shown, keyed by category. */
  remainingByCategory: Partial<Record<ArrayKey, number>>
}

export function buildMedicalHistorySummary(
  medicalHistory: Record<string, unknown> | null | undefined
): MedicalHistorySummary {
  if (!medicalHistory || typeof medicalHistory !== 'object') return { lines: [], remainingByCategory: {} }
  const arrayKeys: readonly ArrayKey[] = ['conditions', 'medications', 'allergies', 'surgeries', 'familyHistory']
  const lines: string[] = []
  const remainingByCategory: Partial<Record<ArrayKey, number>> = {}
  let anyReadable = false
  for (const key of arrayKeys) {
    const items = medicalHistory[key]
    if (!Array.isArray(items) || items.length === 0) continue
    const readable: string[] = []
    let totalReadable = 0
    for (const item of items) {
      if (!item || typeof item !== 'object') continue
      const text = formatEntry(key, item as Record<string, unknown>)
      if (text) {
        totalReadable += 1
        if (readable.length < 6) readable.push(text)
      }
    }
    if (readable.length > 0) {
      anyReadable = true
      readable.forEach((line) => lines.push(line))
      if (totalReadable > 6) remainingByCategory[key] = totalReadable - 6
    } else {
      lines.push(`No ${FRIENDLY_LABEL[key]} recorded.`)
    }
  }
  if (!anyReadable) return { lines: [], remainingByCategory: {} }
  return { lines, remainingByCategory }
}
