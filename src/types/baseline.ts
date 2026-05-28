/**
 * BaselineContext Interface
 *
 * Defines the structure for baseline context passed to system prompts for returning visits.
 * This context includes authoritative truth from prior finalized snapshots and clinician signals.
 */

export interface BaselineContext {
  // Source of truth from prior finalized snapshot (authoritative; do not silently mutate)
  truth: {
    medicalHistory?: unknown // users.medicalHistory shape (ideally stable IDs in Stage 2)
    symptomsData?: unknown   // symptoms.symptomsData shape from prior finalized visit
    previousVisitCreatedAt?: string // optional metadata for logging only
  }

  // Clinician-mediated context (NOT truth; used only to drive questioning)
  clinicianSignals: {
    planBullets?: string[]   // scribeSummary.structured.plan (bullets only)
    redFlags?: string[]      // derived from clinicalInsights (compact)
    followUpQuestions?: string[] // derived from clinicalInsights (compact)
    // visitContextSignals.signals.medicalHistoryTopics (question drivers only; NOT truth)
    medicalHistoryTopics?: {
      topic: string
      reason?: string
      suggestedFollowUps?: string[]
      confidence?: 'low' | 'medium' | 'high'
    }[]
    // visitContextSignals.signals.symptomTopics (question drivers only; NOT truth)
    symptomTopics?: {
      topic: string
      reason?: string
      suggestedFollowUps?: string[]
      confidence?: 'low' | 'medium' | 'high'
    }[]
    signalsMeta?: {
      source: 'scribe'
      modelVersion: string
      generatedAt: string
    }
  }

  // Explicit clinician-approved carry-forward prompts (Stage 3)
  carryForward?: {
    prompts: { promptText: string }[]
  }
}
