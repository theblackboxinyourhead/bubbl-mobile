import { SummaryBadge, type SummaryBadgeTone } from './SummaryBadge'

type Props = {
  scribeStatus: string | null
}

type ScribePillState = {
  label: string
  tone: SummaryBadgeTone
}

function resolveScribePill(scribeStatus: string | null): ScribePillState | null {
  const s = (scribeStatus ?? '').trim()
  if (!s) return null
  if (s === 'inProgress') return { label: 'Scribe in progress', tone: 'badge-blue' }
  if (s === 'stopped') return { label: 'Scribe stopped', tone: 'badge-gray' }
  if (s === 'completed') return { label: 'Scribe completed', tone: 'neutral' }
  return null
}

export function ScribeStatusOutlinePill({ scribeStatus }: Props) {
  const pill = resolveScribePill(scribeStatus)
  if (!pill) return null

  return <SummaryBadge label={pill.label} tone={pill.tone} />
}
