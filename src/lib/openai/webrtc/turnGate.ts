const DEFAULT_REOPEN_DELAY_MS = 900
const DEFAULT_VAD_ENABLE_DELAY_MS = 300

export type RealtimeTurnGateOptions = {
  sessionId: string
  openInput: (reason: string) => void
  closeInput: (reason: string) => void
  isInputOpen: () => boolean
  canOpenInput: () => boolean
  isSessionOpen: () => boolean
  log?: (message: string) => void
  reopenDelayMs?: number
  disableTurnDetection?: (reason: string) => boolean
  enableTurnDetection?: (reason: string) => boolean
  clearInputBuffer?: (reason: string) => boolean
  vadEnableDelayMs?: number
}

export type RealtimeTurnGate = {
  closeForAssistantOutput: (reason: string) => void
  closeForTransition: (reason: string) => void
  scheduleOpenAfterAssistantDone: (reason: string) => void
  cancelPendingOpen: (reason: string) => void
  shouldIgnoreInput: () => boolean
  cleanup: (reason: string) => void
}

export function createRealtimeTurnGate(options: RealtimeTurnGateOptions): RealtimeTurnGate {
  const {
    sessionId,
    openInput,
    closeInput,
    isInputOpen,
    canOpenInput,
    isSessionOpen,
    log,
    reopenDelayMs = DEFAULT_REOPEN_DELAY_MS,
    disableTurnDetection,
    enableTurnDetection,
    clearInputBuffer,
    vadEnableDelayMs = DEFAULT_VAD_ENABLE_DELAY_MS,
  } = options

  let pendingOpenTimer: ReturnType<typeof setTimeout> | null = null
  let pendingVadEnableTimer: ReturnType<typeof setTimeout> | null = null
  let serverVadEnabled = false
  let gateVersion = 0

  const logLine = (message: string) => {
    log?.(`[${sessionId}] ${message}`)
  }

  const clearPendingTimers = (): void => {
    if (pendingOpenTimer !== null) {
      clearTimeout(pendingOpenTimer)
      pendingOpenTimer = null
    }
    if (pendingVadEnableTimer !== null) {
      clearTimeout(pendingVadEnableTimer)
      pendingVadEnableTimer = null
    }
  }

  const tryDisableServerVad = (reason: string): void => {
    if (!serverVadEnabled) return
    if (!disableTurnDetection) return
    const ok = disableTurnDetection(reason)
    if (ok) {
      serverVadEnabled = false
    }
  }

  const closeForAssistantOrTransition = (reason: string): void => {
    gateVersion++
    clearPendingTimers()
    tryDisableServerVad(reason)
    closeInput(reason)
  }

  const scheduleOpenAfterAssistantDone = (reason: string): void => {
    clearPendingTimers()
    gateVersion++
    const capturedVersion = gateVersion
    tryDisableServerVad(reason)
    closeInput(reason)
    logLine(`Turn gate: scheduling delayed input reopen (${reason}) in ${reopenDelayMs}ms`)
    pendingOpenTimer = setTimeout(() => {
      pendingOpenTimer = null
      if (capturedVersion !== gateVersion) return
      if (!isSessionOpen() || !canOpenInput()) return
      openInput(reason)
      pendingVadEnableTimer = setTimeout(() => {
        pendingVadEnableTimer = null
        if (capturedVersion !== gateVersion) return
        if (!isSessionOpen() || !canOpenInput()) return
        if (clearInputBuffer) {
          const clearOk = clearInputBuffer(reason)
          if (!clearOk) {
            closeInput(reason)
            return
          }
        }
        if (enableTurnDetection && !serverVadEnabled) {
          const enOk = enableTurnDetection(reason)
          if (!enOk) {
            closeInput(reason)
            return
          }
          serverVadEnabled = true
        }
      }, vadEnableDelayMs)
    }, reopenDelayMs)
  }

  const cancelPendingOpen = (reason: string): void => {
    const hadPending = pendingOpenTimer !== null || pendingVadEnableTimer !== null
    gateVersion++
    if (!hadPending) return
    clearPendingTimers()
    logLine(`Turn gate: cleared pending reopen (${reason})`)
  }

  const shouldIgnoreInput = (): boolean => {
    return !isInputOpen() || !serverVadEnabled
  }

  const cleanup = (reason: string): void => {
    gateVersion++
    const hadPending = pendingOpenTimer !== null || pendingVadEnableTimer !== null
    clearPendingTimers()
    if (hadPending) {
      logLine(`Turn gate: cleared pending reopen (cleanup: ${reason})`)
    }
    tryDisableServerVad(reason)
    closeInput(reason)
  }

  return {
    closeForAssistantOutput: closeForAssistantOrTransition,
    closeForTransition: closeForAssistantOrTransition,
    scheduleOpenAfterAssistantDone,
    cancelPendingOpen,
    shouldIgnoreInput,
    cleanup,
  }
}
