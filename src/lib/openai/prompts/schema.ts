/**
 * OpenAI Function Schema for PRELIMINARY ASSESSMENT GENERATION ONLY
 * 
 * ⚠️  IMPORTANT: This schema is ONLY used for generating preliminary assessments.
 * ⚠️  It is NOT used for structuring medical history or symptoms.
 * 
 * For medical history structuring: Use medicalHistoryPrompt.ts
 * For symptoms structuring: Use symptomsPrompt.ts
 * For preliminary assessments: Use this file (schema.ts)
 * 
 * Used by: /app/api/screenings/[id]/generate-preliminary-assessment/route.ts
 * Purpose: Generate diagnoses, summary, and overall urgency level
 */

// Clean schema for preliminary assessment - only includes fields actually used
export const extractMedicalDataSchema = {
  type: "function",
  function: {
    name: "extractMedicalData",
    description: "Extract medical data from patient conversation",
    parameters: {
      type: "object",
      properties: {
        // ✅ USED: Diagnoses returned by preliminary assessment
        diagnoses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              condition: {
                type: "string",
                description: "Potential diagnosis based on medical history and symptoms"
              },
              confidence: {
                type: "number",
                description: "Confidence percentage (0-100) for this diagnosis"
              }
            }
          },
          description: "Potential diagnoses with confidence scores that must sum to 100%"
        },
        // ✅ USED: Summary returned by preliminary assessment (REQUIRED)
        summary: {
          type: "string",
          description: "Concise clinical summary in 1-3 sentences"
        },
        // ✅ USED: Urgency returned by preliminary assessment (REQUIRED)
        urgency: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Overall urgency level"
        },
        // ✅ USED: isConversationComplete returned by preliminary assessment (REQUIRED)
        isConversationComplete: {
          type: "boolean",
          description: "Whether the conversation has gathered all necessary information"
        }
      },
      // Only these fields are required and used by preliminary assessment:
      required: ["summary", "urgency", "isConversationComplete"]
    }
  }
};

/**
 * SCHEMA USAGE SUMMARY:
 * 
 * This file (schema.ts):
 * - Used ONLY for preliminary assessment generation
 * - Returns: diagnoses, summary, urgency, isConversationComplete
 * 
 * For other operations, use:
 * - medicalHistoryPrompt.ts - For structuring medical history
 * - symptomsPrompt.ts - For structuring symptoms
 * 
 * See /docs/openai-schemas-architecture.md for complete documentation
 */ 