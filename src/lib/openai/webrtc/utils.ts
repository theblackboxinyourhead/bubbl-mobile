import { RealtimeCallbacks, Stage, ConnectionState, addStageSnapshot, type RTCDataChannel } from '@/lib/openai/webrtc/types';

/**
 * Helper to parse user-defined function schema JSON for the Conclusion stage.
 */
export function parseFunctionSchema(
  schemaString: string | undefined,
  callbacks: RealtimeCallbacks
): unknown[] {
  if (!schemaString) return []
  try {
    const schemaObject: unknown = JSON.parse(schemaString)
    if (
      typeof schemaObject !== 'object' ||
      schemaObject === null ||
      !('name' in schemaObject) ||
      !('parameters' in schemaObject)
    ) {
      throw new Error('Parsed function schema is invalid.')
    }
    const o = schemaObject as { name: string; description?: string; parameters: unknown }
    return [
      {
        type: 'function',
        name: o.name,
        description: o.description || 'Extract structured medical data',
        parameters: o.parameters,
      },
    ]
  } catch (error) {
    console.error('🔴 [Realtime] Error parsing function schema:', error)
    callbacks.onError(new Error('Failed to parse function schema for Conclusion'))
    return []
  }
}

export function waitForOpen(
  dataChannel: RTCDataChannel,
  onOpen: () => void
) {
  if (dataChannel.readyState === 'open') {
    onOpen();
    return;
  }
  const openHandler = () => {
    onOpen();
    dataChannel.removeEventListener('open', openHandler);
  };
  dataChannel.addEventListener('open', openHandler);
}

/**
 * Sends the "response.create" instruction payload through the data channel, adding
 * function schema based on the current stage.
 */
export function sendPromptInstruction(
  dataChannel: RTCDataChannel | null,
  getCurrentStage: () => Stage,
  callbacks: RealtimeCallbacks,
  promptContent: string | undefined,
  functionSchema?: string | undefined,
  options?: { 
    toolChoice?: 'auto' | 'none' | { type: 'function'; name: string },
    expectedStage?: Stage,
    connectionState?: ConnectionState, // ADD THIS
    isStageEntry?: boolean
  }
) {
  if (!promptContent) {
    console.error("🔴 [Realtime] Attempted to send undefined prompt content.");
    callbacks.onError(new Error("Internal error: Tried to send empty prompt"));
    return;
  }
  if (!dataChannel) {
    console.error("🔴 [Realtime] Data channel not available to send prompt instruction.");
    callbacks.onError(new Error("Internal error: Data channel missing"));
    return;
  }

  const stageNow = getCurrentStage();
  
  // PRE-SEND STAGE SNAPSHOT CAPTURE (also store optional refs on connectionState)
  const preSnapshotStage = stageNow;
  const snapshotId = `pre_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  if (options?.connectionState) {
    addStageSnapshot(options.connectionState, snapshotId, preSnapshotStage);
    options.connectionState.preSendSnapshotId = snapshotId;
    options.connectionState.preSendSnapshotStage = preSnapshotStage;
    console.log(`🟢 [Snapshot] Pre-send stage captured: ${Stage[preSnapshotStage]} with id: ${snapshotId} (session: ${options?.connectionState?.sessionId || 'unknown'})`);
    
    // Open audio window immediately before sending
    options.connectionState.audioWindowActive = true;
    console.log(`🔊 [Audio Gate] Opening audio window for new prompt (session: ${options?.connectionState?.sessionId || 'unknown'})`);
  }
  
  // Check expected stage mismatch
  if (options?.expectedStage !== undefined && options.expectedStage !== stageNow) {
    console.warn(`🟡 [Stage Mismatch] Expected: ${Stage[options.expectedStage]}, Actual: ${Stage[stageNow]}`);
  }

  // Parse the function schema if provided
  const tools = functionSchema ? parseFunctionSchema(functionSchema, callbacks) : []

  const USE_STRICT_STAGE_ENTRY = process.env.EXPO_PUBLIC_STRICT_STAGE_ENTRY === 'true'

  let toolChoice: 'auto' | 'none' | { type: 'function'; name: string } =
    options?.toolChoice ?? 'auto'

  if (USE_STRICT_STAGE_ENTRY && options?.isStageEntry) {
    toolChoice = 'none'
  }
  if (tools.length === 1) {
    const first = tools[0] as { name?: string }
    const toolName = first?.name
    if (toolName === 'extractMedicalData') {
      toolChoice = options?.toolChoice ?? { type: 'function', name: 'extractMedicalData' }
    }
  }

  const message: Record<string, unknown> = {
    type: "response.create",
    response: {
      modalities: ["text", "audio"],
      instructions: promptContent,
      temperature: 0.6,
      tools: tools,
      tool_choice: toolChoice,
      metadata: { snapshotId } // Include snapshot ID if API supports it
    }
  };

  const sessionLabel = options?.connectionState?.sessionId || 'unknown';
  console.log(
    `🟢 [Realtime] Sending prompt for stage ${Stage[stageNow]} (instruction length: ${promptContent.length}, session: ${sessionLabel})`
  );
  
  // Send the message
  try {
    if (dataChannel.readyState === 'open') {
      console.log(`🔵 [Realtime] Sending instruction for stage: ${Stage[stageNow]} (session: ${options?.connectionState?.sessionId || 'unknown'})`);
      dataChannel.send(JSON.stringify(message));
    } else {
      console.log(`🟡 [Realtime] Data channel not open, waiting for open state (session: ${options?.connectionState?.sessionId || 'unknown'})...`);
      
      const openHandler = () => {
        console.log(`🔵 [Realtime] Data channel now open, sending instruction for stage: ${Stage[stageNow]} (session: ${options?.connectionState?.sessionId || 'unknown'})`);
        dataChannel.send(JSON.stringify(message));
        dataChannel.removeEventListener('open', openHandler);
      };
      
      dataChannel.addEventListener('open', openHandler);
    }
  } catch (error) {
    console.error(`🔴 [Realtime] Error sending prompt instruction (session: ${options?.connectionState?.sessionId || 'unknown'}):`, error);
    callbacks.onError(new Error('Failed to send prompt instruction to OpenAI'));
  }
}

/**
 * Updates the session-level instructions for stage-specific context.
 * Sends session.update to prevent server VAD auto-responses from using
 * multi-stage context, eliminating cross-stage confusion.
 */
export function updateSessionInstructions(
  dataChannel: RTCDataChannel,
  instructions: string,
  options?: { sessionId?: string }
): void {
  if (!dataChannel) {
    console.error('🔴 [Session Update] Data channel not available');
    return;
  }

  if (dataChannel.readyState !== 'open') {
    console.warn(`🟡 [Session Update] Data channel not open (state: ${dataChannel.readyState}), skipping instruction update`);
    return;
  }

  const sessionUpdate = {
    type: 'session.update',
    session: {
      instructions,
      temperature: 0.6
    }
  };

  try {
    dataChannel.send(JSON.stringify(sessionUpdate));
    console.log(
      `🔄 [Session Update] Updated session instructions (length: ${instructions.length}, session: ${options?.sessionId || 'unknown'})`
    );
  } catch (error) {
    console.error(`🔴 [Session Update] Failed to update session instructions (session: ${options?.sessionId || 'unknown'}):`, error);
  }
}
