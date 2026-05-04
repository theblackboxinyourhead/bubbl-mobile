const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

function parse(iso: string | null | undefined): Date | null {
  if (typeof iso !== 'string') return null
  const trimmed = iso.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function formatDateLabel(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  return dateFormatter.format(date)
}

export function formatDateTimeLabel(iso: string | null | undefined): string {
  const date = parse(iso)
  if (!date) return '—'
  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`
}
