/**
 * frontend/src/analytics/hooks/useFlow.ts
 *
 * Multi-step Funnel Flow Helper.
 */

import { useRef } from 'react';
import { dispatcher } from '../core/dispatcher';

export function useFlow(flowId: string, totalSteps: number) {
  const currentStepRef = useRef(1);

  const trackStep = (
    stepIndex: number,
    stepName: string,
    status: 'start' | 'completed' | 'skipped' | 'failed' = 'completed',
    props: Record<string, any> = {}
  ) => {
    currentStepRef.current = stepIndex;
    dispatcher.track('flow_step', {
      flow_id: flowId,
      flow_step_index: stepIndex,
      flow_step_name: stepName,
      total_steps: totalSteps,
      status,
      ...props,
    });
  };

  return {
    currentStep: currentStepRef.current,
    trackStep,
  };
}
