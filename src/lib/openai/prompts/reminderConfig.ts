// Reminder injection configuration (moved into prompts directory)
// All strings & cadence centrally defined here for easy future tuning.

export const REMINDER_FREQUENCY = 1; // every 1 user turn – matches PRD default (FR1)

export const REMINDER_BY_PHASE = {
  symptoms:
    'Reminder: ask clarifying questions about the symptoms, if needed; NEVER give advice or diagnose.',
  medicalHistory:
    'Reminder: ask clarifying questions about the medical history, if needed; NEVER give advice or diagnose.',
} as const;

export type ScreeningPhase = keyof typeof REMINDER_BY_PHASE; // 'symptoms' | 'medicalHistory'

// Global toggle – set to false to disable reminder prompts across the system
export const USE_REMINDER_PROMPT = false; 