import { REALTIME_PROMPT_TEMPLATES } from '@/lib/openai/prompts';
import { Stage } from '@/lib/openai/webrtc/types';

/**
 * Retrieve the function schema content for a given schema name, if provided.
 */
export function getFunctionSchemaContent(schemaName?: string): string | undefined {
  if (!schemaName) {
    return undefined; // Return undefined if no schema name is provided
  }
  // Dynamically access the schema content using the provided name
  const schemaTemplate = REALTIME_PROMPT_TEMPLATES[schemaName];
  return schemaTemplate?.content;
}

/**
 * Get the appropriate function schema key for a given stage and screening type.
 * @param stage The current conversation stage
 * @param screeningType The type of screening ('web' or 'phone')
 */
export function getFunctionSchemaKey(stage: Stage): string | undefined {
  const schemaMap: Record<Stage, string | undefined> = {
    [Stage.Introduction]: undefined,
    [Stage.MedicalHistory]: undefined,
    [Stage.Symptoms]: undefined,
    [Stage.Conclusion]: 'FUNCTION_SCHEMA_EXTRACT_MEDICAL_DATA',
  };
  return schemaMap[stage];
} 