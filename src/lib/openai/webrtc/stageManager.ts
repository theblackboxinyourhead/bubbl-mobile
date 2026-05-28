import { Stage } from '@/lib/openai/webrtc/types';

/**
 * Simple object to track + set the "current" stage
 * and log transitions for debugging.
 */
export function createStageManager(initialStage: Stage) {
  let currentStage = initialStage;

  return {
    getStage: () => currentStage,
    setStage: (newStage: Stage) => {
      console.log(`🟣 [Realtime] Stage updated to: ${Stage[newStage]}`);
      currentStage = newStage;
    },
  };
} 