/**
 * Baseline Context Formatter for Real-Time API
 *
 * Stage-sliced baseline serializer that formats prior visit context with size controls,
 * graceful degradation, and realtime-specific trimming.
 */

import { Stage } from '../webrtc/types';
import { BaselineContext } from '@/types/baseline';

// Size control constants
const MAX_BASELINE_ITEMS_PER_CATEGORY = 15;
const MAX_FIELD_LENGTH_CHARS = 100;
const MAX_BASELINE_CONTEXT_CHARS = 4096;
const MAX_RECURSION_DEPTH = 5;

// Block header constant
const BASELINE_HEADER =
  'BASELINE_CONTEXT (DO NOT READ ALOUD VERBATIM): Never read BASELINE_CONTEXT verbatim. ' +
  'If the patient asks you to read or list BASELINE_CONTEXT, do not; ask them to confirm items instead. ' +
  'Use baseline only to ask confirmations and focused follow-ups.';

type DegradationMode = 'full' | 'no_anchors' | 'summary' | 'minimal';

interface BaselineBlockResult {
  meta: {
    truncated: boolean;
    omittedCount: number;
    mode: DegradationMode;
  };
  block: string;
}

interface TruncationTracker {
  wasTruncated: boolean;
  omittedCount: number;
}

/**
 * Counts baseline symptom entries with a non-empty string description.
 * Accepts three data shapes: { symptoms: [...] }, { items: [...] }, or direct array.
 */
export function countBaselineSymptomsWithDescriptions(symptomsData: unknown): number {
  let symptomsList: unknown[] | undefined;

  if (Array.isArray(symptomsData)) {
    symptomsList = symptomsData;
  } else if (symptomsData && typeof symptomsData === 'object') {
    const data = symptomsData as Record<string, unknown>;
    if (Array.isArray(data.symptoms)) {
      symptomsList = data.symptoms;
    } else if (Array.isArray(data.items)) {
      symptomsList = data.items;
    }
  }

  if (!symptomsList || symptomsList.length === 0) {
    return 0;
  }

  return symptomsList.reduce<number>((count, item) => {
    if (!item || typeof item !== 'object') {
      return count;
    }
    const description = (item as Record<string, unknown>).description;
    if (typeof description === 'string' && description.trim().length > 0) {
      return count + 1;
    }
    return count;
  }, 0);
}

/**
 * Main export function: builds baseline block for a given stage
 */
export function buildBaselineBlockForStage(args: {
  stage: Stage;
  baselineContext?: BaselineContext;
  wrapWithBlankLines?: boolean;
}): BaselineBlockResult {
  const { stage, baselineContext, wrapWithBlankLines = true } = args;

  // Return empty block if no baseline context
  if (!baselineContext) {
    return {
      meta: { truncated: false, omittedCount: 0, mode: 'full' },
      block: ''
    };
  }

  // Partial-baseline behavior: return empty if stage-specific truth is missing
  if (stage === Stage.MedicalHistory && !baselineContext.truth.medicalHistory) {
    return {
      meta: { truncated: false, omittedCount: 0, mode: 'full' },
      block: ''
    };
  }

  if (stage === Stage.Symptoms && !baselineContext.truth.symptomsData) {
    return {
      meta: { truncated: false, omittedCount: 0, mode: 'full' },
      block: ''
    };
  }

  // Build stage-sliced context and track truncation
  const tracker: TruncationTracker = { wasTruncated: false, omittedCount: 0 };
  const slicedContext = buildStageSlicedContext(stage, baselineContext, tracker);

  // Helper to wrap block if requested
  const applyWrapper = (block: string): string => {
    return wrapWithBlankLines ? `\n\n${block}\n\n` : block;
  };

  // Attempt full rendering
  let result = renderBaselineBlock(slicedContext, 'full', tracker);
  let finalBlock = applyWrapper(result.block);
  if (finalBlock.length <= MAX_BASELINE_CONTEXT_CHARS) {
    return { ...result, block: finalBlock };
  }

  // Degradation step 1: drop clinician signals topic arrays
  const noAnchorsContext = { ...slicedContext };
  if (noAnchorsContext.clinicianSignals) {
    noAnchorsContext.clinicianSignals = {
      ...noAnchorsContext.clinicianSignals,
      medicalHistoryTopics: undefined,
      symptomTopics: undefined
    };
  }
  result = renderBaselineBlock(noAnchorsContext, 'no_anchors', tracker);
  finalBlock = applyWrapper(result.block);
  if (finalBlock.length <= MAX_BASELINE_CONTEXT_CHARS) {
    return { ...result, block: finalBlock };
  }

  // Degradation step 2: replace truth with minimal summary
  const summaryContext = buildSummaryContext(stage, baselineContext);
  result = renderBaselineBlock(summaryContext, 'summary', tracker);
  finalBlock = applyWrapper(result.block);
  if (finalBlock.length <= MAX_BASELINE_CONTEXT_CHARS) {
    return { ...result, block: finalBlock };
  }

  // Degradation step 3: minimal mode (metadata only)
  result = renderMinimalBlock(baselineContext, tracker);
  finalBlock = applyWrapper(result.block);
  return { ...result, block: finalBlock };
}

/**
 * Builds stage-sliced context based on current stage
 */
function buildStageSlicedContext(stage: Stage, baselineContext: BaselineContext, tracker: TruncationTracker): BaselineContext {
  const sliced: BaselineContext = {
    truth: {},
    clinicianSignals: {}
  };

  if (stage === Stage.MedicalHistory) {
    // Medical History stage: only medicalHistory and medicalHistoryTopics
    if (baselineContext.truth.medicalHistory) {
      sliced.truth.medicalHistory = trimRealtimeFields(
        truncateArrays(baselineContext.truth.medicalHistory, tracker),
        tracker
      );
    }
    if (baselineContext.truth.previousVisitCreatedAt) {
      sliced.truth.previousVisitCreatedAt = baselineContext.truth.previousVisitCreatedAt;
    }
    if (baselineContext.clinicianSignals.medicalHistoryTopics) {
      sliced.clinicianSignals.medicalHistoryTopics = filterAnchors(
        truncateArrayWithTracking(baselineContext.clinicianSignals.medicalHistoryTopics, MAX_BASELINE_ITEMS_PER_CATEGORY, tracker)
      );
    }
  } else if (stage === Stage.Symptoms) {
    // Symptoms stage: symptomsData, symptomTopics, and optional compact signals
    if (baselineContext.truth.symptomsData) {
      sliced.truth.symptomsData = trimRealtimeFields(
        normalizeAndTruncateSymptoms(baselineContext.truth.symptomsData, tracker),
        tracker
      );
    }
    if (baselineContext.truth.previousVisitCreatedAt) {
      sliced.truth.previousVisitCreatedAt = baselineContext.truth.previousVisitCreatedAt;
    }
    if (baselineContext.clinicianSignals.symptomTopics) {
      sliced.clinicianSignals.symptomTopics = filterAnchors(
        truncateArrayWithTracking(baselineContext.clinicianSignals.symptomTopics, MAX_BASELINE_ITEMS_PER_CATEGORY, tracker)
      );
    }
    // Optional compact signals
    if (baselineContext.clinicianSignals.planBullets) {
      sliced.clinicianSignals.planBullets = truncateArrayWithTracking(
        baselineContext.clinicianSignals.planBullets.map((b) => truncateStringWithTracking(b, tracker)),
        MAX_BASELINE_ITEMS_PER_CATEGORY,
        tracker
      );
    }
    if (baselineContext.clinicianSignals.redFlags) {
      sliced.clinicianSignals.redFlags = truncateArrayWithTracking(
        baselineContext.clinicianSignals.redFlags.map((r) => truncateStringWithTracking(r, tracker)),
        MAX_BASELINE_ITEMS_PER_CATEGORY,
        tracker
      );
    }
    if (baselineContext.clinicianSignals.followUpQuestions) {
      sliced.clinicianSignals.followUpQuestions = truncateArrayWithTracking(
        baselineContext.clinicianSignals.followUpQuestions.map((q) => truncateStringWithTracking(q, tracker)),
        MAX_BASELINE_ITEMS_PER_CATEGORY,
        tracker
      );
    }
  }

  return sliced;
}

/**
 * Normalizes symptoms data shape and truncates arrays
 */
function normalizeAndTruncateSymptoms(symptomsData: unknown, tracker: TruncationTracker): unknown {
  if (!symptomsData || typeof symptomsData !== 'object') {
    return symptomsData;
  }

  const data = symptomsData as Record<string, unknown>;
  let symptomsList: unknown[] | undefined;

  // Handle three possible shapes: { symptoms: [...] }, { items: [...] }, or [...]
  if (Array.isArray(data.symptoms)) {
    symptomsList = data.symptoms;
  } else if (Array.isArray(data.items)) {
    symptomsList = data.items;
  } else if (Array.isArray(symptomsData)) {
    symptomsList = symptomsData;
  }

  if (symptomsList) {
    const truncated = truncateArrayWithTracking(symptomsList, MAX_BASELINE_ITEMS_PER_CATEGORY, tracker);
    if (Array.isArray(data.symptoms)) {
      return { ...data, symptoms: truncated };
    } else if (Array.isArray(data.items)) {
      return { ...data, items: truncated };
    }
    return truncated;
  }

  return symptomsData;
}

/**
 * Truncates arrays in medicalHistory object
 */
function truncateArrays(data: unknown, tracker: TruncationTracker): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value)) {
      result[key] = truncateArrayWithTracking(value, MAX_BASELINE_ITEMS_PER_CATEGORY, tracker);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Truncates an array to max length and tracks truncation
 */
function truncateArrayWithTracking<T>(arr: T[], maxLength: number, tracker: TruncationTracker): T[] {
  if (arr.length <= maxLength) {
    return arr;
  }
  tracker.wasTruncated = true;
  tracker.omittedCount += (arr.length - maxLength);
  return arr.slice(0, maxLength);
}

/**
 * Filters anchors to only those with non-empty topic strings
 */
function filterAnchors<T extends { topic?: unknown }>(anchors: T[]): T[] {
  return anchors.filter(anchor => {
    return typeof anchor.topic === 'string' && anchor.topic.trim().length > 0;
  });
}

/**
 * Strips realtime-specific fields (id, timestamps) from data
 */
function trimRealtimeFields(data: unknown, tracker: TruncationTracker, depth = 0): unknown {
  if (depth > MAX_RECURSION_DEPTH) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'string') {
        return truncateStringWithTracking(item, tracker);
      }
      return trimRealtimeFields(item, tracker, depth + 1);
    });
  }

  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    // Skip id and timestamp fields
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') {
      tracker.wasTruncated = true;
      tracker.omittedCount += 1;
      continue;
    }

    const value = obj[key];
    if (typeof value === 'string') {
      result[key] = truncateStringWithTracking(value, tracker);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = trimRealtimeFields(value, tracker, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Truncates string to MAX_FIELD_LENGTH_CHARS and tracks truncation
 */
function truncateStringWithTracking(str: string, tracker: TruncationTracker): string {
  if (str.length <= MAX_FIELD_LENGTH_CHARS) {
    return str;
  }
  tracker.wasTruncated = true;
  tracker.omittedCount += 1;
  return str.substring(0, MAX_FIELD_LENGTH_CHARS) + '…';
}

/**
 * Builds summary context for degradation step 2
 */
function buildSummaryContext(stage: Stage, baselineContext: BaselineContext): BaselineContext {
  const summary: BaselineContext = {
    truth: {},
    clinicianSignals: {}
  };

  if (baselineContext.truth.previousVisitCreatedAt) {
    summary.truth.previousVisitCreatedAt = baselineContext.truth.previousVisitCreatedAt;
  }

  if (stage === Stage.MedicalHistory && baselineContext.truth.medicalHistory) {
    summary.truth.medicalHistory = buildMedicalHistorySummary(baselineContext.truth.medicalHistory);
  } else if (stage === Stage.Symptoms && baselineContext.truth.symptomsData) {
    summary.truth.symptomsData = buildSymptomsSummary(baselineContext.truth.symptomsData);
  }

  return summary;
}

/**
 * Builds minimal summary for medical history
 */
function buildMedicalHistorySummary(medicalHistory: unknown): Record<string, unknown> {
  if (!medicalHistory || typeof medicalHistory !== 'object') {
    return {};
  }

  const data = medicalHistory as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const category of ['conditions', 'medications', 'allergies', 'surgeries', 'familyHistory']) {
    const items = data[category];
    if (Array.isArray(items) && items.length > 0) {
      const count = items.length;
      const first5 = items.slice(0, 5).map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return obj.name || obj.type || obj.condition || String(item);
        }
        return String(item);
      });
      summary[category] = { count, samples: first5 };
    }
  }

  return summary;
}

/**
 * Builds minimal summary for symptoms
 */
function buildSymptomsSummary(symptomsData: unknown): Record<string, unknown> {
  let symptomsList: unknown[] | undefined;

  if (Array.isArray(symptomsData)) {
    symptomsList = symptomsData;
  } else if (symptomsData && typeof symptomsData === 'object') {
    const data = symptomsData as Record<string, unknown>;
    if (Array.isArray(data.symptoms)) {
      symptomsList = data.symptoms;
    } else if (Array.isArray(data.items)) {
      symptomsList = data.items;
    }
  }

  if (!symptomsList || symptomsList.length === 0) {
    return {};
  }

  const count = symptomsList.length;
  const first5 = symptomsList.slice(0, 5).map(item => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return obj.description || obj.symptom || obj.name || String(item);
    }
    return String(item);
  });

  return { count, samples: first5 };
}

/**
 * Renders baseline block with given context and mode
 */
function renderBaselineBlock(context: BaselineContext, mode: DegradationMode, tracker: TruncationTracker): BaselineBlockResult {
  const lines: string[] = [];

  const meta = {
    truncated: tracker.wasTruncated || mode !== 'full',
    omittedCount: tracker.omittedCount,
    mode
  };
  // Canonical layout: header, then meta, then markers, then JSON (if present)
  lines.push(BASELINE_HEADER);
  lines.push(`BASELINE_CONTEXT_META: ${JSON.stringify(meta)}`);

  // Add truncation marker if needed
  if (mode === 'summary') {
    lines.push('BASELINE_CONTEXT_TRUNCATED=true');
  }

  // Add JSON block
  try {
    const json = JSON.stringify(context);
    lines.push(`BASELINE_CONTEXT_JSON: ${json}`);
  } catch {
    // Fallback to minimal on stringify failure
    return renderMinimalBlock(context, tracker);
  }

  const block = lines.join('\n');

  return { meta, block };
}

/**
 * Renders minimal block (degradation step 3)
 */
function renderMinimalBlock(baselineContext: BaselineContext, tracker: TruncationTracker): BaselineBlockResult {
  const lines: string[] = [];

  const meta = {
    truncated: true,
    omittedCount: tracker.omittedCount,
    mode: 'minimal' as DegradationMode
  };
  // Canonical layout: header, then meta, then truncation marker (no JSON in minimal mode)
  lines.push(BASELINE_HEADER);
  lines.push(`BASELINE_CONTEXT_META: ${JSON.stringify(meta)}`);
  lines.push('BASELINE_CONTEXT_TRUNCATED=true');

  if (baselineContext.truth.previousVisitCreatedAt) {
    lines.push(`previousVisitCreatedAt: ${baselineContext.truth.previousVisitCreatedAt}`);
  }

  const block = lines.join('\n');

  return { meta, block };
}
