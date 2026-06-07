export function formatTenDigitPhoneWhileTyping(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 3) {
    return digits
  }
  if (digits.length < 4) {
    return `(${digits}`
  }
  if (digits.length < 7) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3)}`
  }
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`
}

export function formatTenDigitPhoneToE164(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : null
}
