const DEFAULT_REOPEN_DELAY_MS = 900

export type RealtimeTurnGateOptions = {
  sessionId: string
  openInput: (reason: string) => void
  closeInput: (reason: string) => void
  isInputOpen: () => boolean
  canOpenInput: () => boolean
  isSessionOpen: () => boolean
  log?: (message: string) => void
  reopenDelayMs?: number
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
  } = options

  let pendingOpenTimer: ReturnType<typeof setTimeout> | null = null

  const logLine = (message: string) => {
    log?.(`[${sessionId}] ${message}`)
  }

  const clearPendingTimerSilently = (): void => {
    if (pendingOpenTimer === null) return
    clearTimeout(pendingOpenTimer)
    pendingOpenTimer = null
  }

  const closeForAssistantOrTransition = (reason: string): void => {
    clearPendingTimerSilently()
    closeInput(reason)
  }

  const scheduleOpenAfterAssistantDone = (reason: string): void => {
    clearPendingTimerSilently()
    logLine(`Turn gate: scheduling delayed input reopen (${reason}) in ${reopenDelayMs}ms`)
    pendingOpenTimer = setTimeout(() => {
      pendingOpenTimer = null
      if (isSessionOpen() && canOpenInput()) {
        openInput(reason)
      }
    }, reopenDelayMs)
  }

  const cancelPendingOpen = (reason: string): void => {
    if (pendingOpenTimer === null) return
    clearPendingTimerSilently()
    logLine(`Turn gate: cleared pending reopen (${reason})`)
  }

  const shouldIgnoreInput = (): boolean => {
    return !isInputOpen()
  }

  const cleanup = (reason: string): void => {
    const hadPendingTimer = pendingOpenTimer !== null
    clearPendingTimerSilently()
    if (hadPendingTimer) {
      logLine(`Turn gate: cleared pending reopen (cleanup: ${reason})`)
    }
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
