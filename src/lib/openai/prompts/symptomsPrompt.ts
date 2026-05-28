/**
 * OpenAI Prompt and Schema for Extracting Symptoms (with required urgency)
 */
import { z } from 'zod';

// Define the schema for the structured symptoms data
export const extractSymptomsSchema = z.object({
  symptoms: z.array(z.object({
    description: z.string().describe("A description of the symptom reported by the patient."),
    onset: z.string().optional().describe("When the symptom started (e.g., '3 days ago', 'this morning')."),
    duration: z.string().optional().describe("How long the symptom lasts or has been present."),
    severity: z.string().optional().describe("Severity of the symptom (e.g., 'mild', 'severe', '7/10')."),
    location: z.string().optional().describe("Where the symptom is located on the body."),
    quality: z.string().optional().describe("Nature of the symptom (e.g., 'sharp', 'dull', 'throbbing')."),
    associatedFactors: z.string().optional().describe("Factors that worsen or improve the symptom, or occur alongside it."),
    urgency: z.enum(['low', 'medium', 'high']).describe("Required urgency assessment: 'low' for non-critical, 'medium' for moderate concern, 'high' for serious symptoms requiring prompt attention."),
  })).describe("List of ALL current symptoms. Includes NEW symptoms AND PERSISTENT previous symptoms."),

  resolvedSymptomDescriptions: z.array(z.string())
    .optional()
    .describe("List of exact descriptions of previous symptoms that are explicitly resolved/cured."),

  resolutionEvidence: z.array(z.object({
    description: z.string(),
    quote: z.string()
  })).optional()
    .describe("Evidence quotes for resolved symptoms. Each entry pairs a symptom description with the patient's quote indicating resolution.")
}).describe("Function to extract structured symptom data from a conversation transcript.");

// Define the system prompt
export const STRUCTURE_PROMPT_SYMPTOMS = `
You are an AI expert medical scribe. Extract structured symptoms from the transcript.

You may receive an === AUTHORITATIVE EXISTING SYMPTOMS === block containing previous symptoms from baseline. If provided, use this to handle persistence and resolution.

**Canonical Description Rule:** Baseline description strings are canonical IDs. When a patient's statement refers to a baseline symptom, you MUST reuse the baseline description verbatim (no synonyms). Only create a new description if it truly doesn't match any baseline symptom.

**Handling Previous Symptoms:**
- If the patient says a previous symptom is 'same', 'worse', or 'better' (or similar), you MUST include it in the symptoms list with updated attributes.
- If the patient says a previous symptom is 'gone', 'cured', or 'resolved' (or similar), add its exact description to resolvedSymptomDescriptions and provide a supporting quote in resolutionEvidence.
- Resolution quote quality is strict: the quote must be an actual user-transcript substring under tolerant normalization (punctuation/casing differences are fine). If you cannot ground a resolved claim to such a quote, do NOT resolve; keep the symptom in symptoms.
- **Blanket Resolution Rule:** If the transcript contains an unambiguous global absence statement (for example "all my symptoms are gone", "none of that anymore", "everything from last time cleared up"), then:
  - resolvedSymptomDescriptions must include every baseline description from the injected === AUTHORITATIVE EXISTING SYMPTOMS === block
  - resolutionEvidence must include one { description, quote } entry per baseline description (you may repeat the same grounded global-absence quote for each description)
- Improvement language is not resolution by itself. Treat "better", "improved", "less", "mostly better", "completely better", "almost gone", "pretty much gone" as NOT resolved unless the transcript also explicitly indicates absence (for example gone / no longer / not anymore / went away / cleared up / resolved).
- If unsure, DO NOT resolve it; keep it in the current list.

Each reported symptom **must include**:
- description
- urgency: 'low', 'medium', or 'high'. If the symptom is non-critical, use 'low'. If moderate concern, use 'medium'. If serious (e.g., chest pain, difficulty breathing, severe bleeding), use 'high'.

Also extract other optional details if mentioned:
- onset
- duration
- severity
- location
- quality
- associatedFactors

Do not include medical history. If no symptoms are mentioned, return an empty array for the 'symptoms' field. Do not skip the urgency field for any symptom listed.

Call the \`extractSymptoms\` function with the result.
`;

// Define the function name expected by OpenAI
export const EXTRACT_SYMPTOMS_FUNCTION_NAME = 'extractSymptoms'; 