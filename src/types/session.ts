export type ActiveScreeningContext = {
  screeningId: string
  source: 'invite' | 'self'
  lastKnownPhase?: 'medical-history' | 'symptoms'
}

export type NotificationRoutePayload =
  | { type: 'OPEN_SCREENING_DETAIL'; screeningId: string }
  | { type: 'OPEN_CHECKIN_START' }
