/**
 * frontend/src/analytics/hooks/useFormAnalytics.ts
 *
 * Form Analytics Hook — tracks form_start, form_field_complete, form_submit, form_error.
 */

import { useRef } from 'react';
import { dispatcher } from '../core/dispatcher';

export function useFormAnalytics(formId: string) {
  const startedRef = useRef(false);

  const trackFormStart = (firstFieldName?: string) => {
    if (!startedRef.current) {
      startedRef.current = true;
      dispatcher.track('form_start', {
        form_id: formId,
        first_field: firstFieldName,
      });
    }
  };

  const trackFieldComplete = (fieldName: string, hasValue: boolean) => {
    if (hasValue) {
      dispatcher.track('form_field_complete', {
        form_id: formId,
        field_name: fieldName,
      });
    }
  };

  const trackFormSubmit = (extraProps: Record<string, any> = {}) => {
    dispatcher.track('form_submit', {
      form_id: formId,
      ...extraProps,
    });
  };

  const trackFormError = (fieldName: string, errorCode: string) => {
    dispatcher.track('form_error', {
      form_id: formId,
      error_field: fieldName,
      error_code: errorCode,
    });
  };

  return {
    trackFormStart,
    trackFieldComplete,
    trackFormSubmit,
    trackFormError,
  };
}
