import { z } from 'zod'

export const AuthMeResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    user_type: z.enum(['patient', 'clinician', 'admin', 'staff']),
    companyId: z.string().nullable(),
  }),
  capabilities: z.object({
    canFinalizeVisit: z.boolean(),
    canEditVisitNote: z.boolean(),
    canManageAddenda: z.boolean(),
    canSendInvite: z.boolean(),
    canUseScribeControls: z.boolean(),
  }),
  featureFlags: z.object({
    clinicianMobileEnabled: z.boolean(),
    nativeRealtimeIntakeEnabled: z.boolean(),
  }),
  minimumSupportedAppVersion: z.string(),
  recommendedAppVersion: z.string(),
  environmentId: z.enum(['local', 'dev', 'prod']),
  supportContact: z.object({
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
  realtimeContractVersion: z.string(),
  activeScreenings: z
    .array(
      z.object({
        screeningId: z.string().uuid(),
        status: z.enum(['sent', 'in review']),
        source: z.enum(['invite', 'self']),
        createdAt: z.string(),
        startedAt: z.string().nullable().optional(),
        sentAt: z.string().nullable().optional(),
        clinicName: z.string().nullable().optional(),
      })
    )
    .optional(),
})

export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>

export const VerifyMobileResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  expires_at: z.number().optional(),
  token_type: z.string(),
  user: z.unknown(),
})

export const OAuthCallbackProviderSchema = z.enum(['google', 'microsoft'])
export type OAuthCallbackProvider = z.infer<typeof OAuthCallbackProviderSchema>

export const OpenAiPromptsSchema = z.object({
  initialPrompt: z.string(),
  functionSchema: z.string().optional(),
  requireMedicalHistory: z.boolean().optional(),
  hasSubmittedMedicalHistory: z.boolean().optional(),
  baselineContext: z.unknown().optional(),
  enableVisitContextConfirmUpdate: z.boolean().optional(),
})

export const ScreeningStartResponseSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
  currentStatus: z.string().optional(),
})

export const ScreeningCompleteResponseSchema = z.object({
  code: z.string(),
  message: z.string().optional(),
  currentStatus: z.string().optional(),
})

export const ResumeStateSchema = z.object({
  screeningStatus: z.string(),
  currentPhase: z.enum(['medical-history', 'symptoms']).nullable(),
  latestRealtimeSessionId: z.string().nullable(),
  hasStructuredHistory: z.boolean(),
  hasStructuredSymptoms: z.boolean(),
  hasAssessment: z.boolean(),
  canComplete: z.boolean(),
  completedAt: z.string().nullable(),
})

const MedicalHistoryEntrySchema = z.object({}).passthrough()

const MedicalHistorySchema = z
  .object({
    conditions: z.array(MedicalHistoryEntrySchema).optional(),
    medications: z.array(MedicalHistoryEntrySchema).optional(),
    allergies: z.array(MedicalHistoryEntrySchema).optional(),
    surgeries: z.array(MedicalHistoryEntrySchema).optional(),
    familyHistory: z.array(MedicalHistoryEntrySchema).optional(),
  })
  .passthrough()

const SymptomEntrySchema = z
  .object({
    description: z.string().optional(),
  })
  .passthrough()

export const PatientScreeningDetailSchema = z.object({
  id: z.string().optional(),
  status: z.string().nullable().optional(),
  clinician: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  screeningType: z.enum(['web', 'phone']).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  resumeState: ResumeStateSchema.optional(),
  medicalHistory: MedicalHistorySchema.nullable().optional(),
  symptoms: z.array(SymptomEntrySchema).nullable().optional(),
})

export type PatientScreeningDetail = z.infer<typeof PatientScreeningDetailSchema>

export const ConsentGetSchema = z.object({
  hasConsent: z.boolean(),
  consentDate: z.string().nullable().optional(),
  needsReconsent: z.boolean().optional(),
  currentTermsVersion: z.string().optional(),
  acceptedTermsVersion: z.string().nullable().optional(),
  acceptedAt: z.string().nullable().optional(),
  acceptedVia: z.enum(['web', 'mobile']).nullable().optional(),
})
