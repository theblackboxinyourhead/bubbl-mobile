type ShouldSkipMedicalHistoryArgs = {
  requireMedicalHistory: boolean
  hasSubmittedMedicalHistory: boolean
  enableVisitContextConfirmUpdate: boolean
}

export function shouldSkipMedicalHistory(args: ShouldSkipMedicalHistoryArgs): boolean {
  const { requireMedicalHistory, hasSubmittedMedicalHistory, enableVisitContextConfirmUpdate } = args
  return (
    !requireMedicalHistory ||
    (hasSubmittedMedicalHistory && !enableVisitContextConfirmUpdate)
  )
}
