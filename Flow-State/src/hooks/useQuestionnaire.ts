import { useState, useCallback } from 'react';
import type { MorningCheckinResponse, EndOfDayResponse, QuestionnaireType } from '@/types/flowstate';

/**
 * Hook for managing questionnaire state and submissions.
 */
export function useQuestionnaire() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState<Record<string, any>>({});

    const setResponse = useCallback((key: string, value: any) => {
        setResponses((prev) => ({ ...prev, [key]: value }));
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep((prev) => prev + 1);
    }, []);

    const prevStep = useCallback(() => {
        setCurrentStep((prev) => Math.max(0, prev - 1));
    }, []);

    const submitMorningCheckin = useCallback(async (data: MorningCheckinResponse) => {
        setIsSubmitting(true);
        try {
            if (window.electron?.saveQuestionnaire) {
                await window.electron.saveQuestionnaire({
                    questionnaire_type: 'morning_checkin',
                    ...data,
                });
            }
            // Reset form
            setCurrentStep(0);
            setResponses({});
            return true;
        } catch (error) {
            console.error('Failed to submit morning checkin:', error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const submitEndOfDay = useCallback(async (data: EndOfDayResponse) => {
        setIsSubmitting(true);
        try {
            if (window.electron?.saveQuestionnaire) {
                await window.electron.saveQuestionnaire({
                    questionnaire_type: 'end_of_day',
                    ...data,
                });
            }
            setCurrentStep(0);
            setResponses({});
            return true;
        } catch (error) {
            console.error('Failed to submit end of day reflection:', error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const reset = useCallback(() => {
        setCurrentStep(0);
        setResponses({});
    }, []);

    return {
        currentStep,
        responses,
        isSubmitting,
        setResponse,
        nextStep,
        prevStep,
        submitMorningCheckin,
        submitEndOfDay,
        reset,
    };
}
