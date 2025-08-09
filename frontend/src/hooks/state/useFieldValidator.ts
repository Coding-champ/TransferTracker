import { useCallback, useEffect, useRef, useState } from 'react';
import { ValidationRule } from './types';

/**
 * Real-time field validation hook with async support and debouncing
 * 
 * Features:
 * - Real-time field validation
 * - Async validation support  
 * - Custom validation rules
 * - Debounced validation to prevent excessive API calls
 * - Cross-field validation
 * - Validation state management
 * 
 * @param initialValue - Initial field value
 * @param validationRules - Array of validation rules
 * @param config - Configuration options
 * @returns Field validation interface
 * 
 * @example
 * ```typescript
 * const {
 *   value,
 *   error,
 *   isValidating,
 *   isValid,
 *   setValue,
 *   validate,
 *   clearError
 * } = useFieldValidator('', [
 *   { type: 'required', message: 'Email is required' },
 *   { type: 'email', message: 'Invalid email format' },
 *   { 
 *     type: 'custom', 
 *     message: 'Email already exists',
 *     validator: async (email) => {
 *       const exists = await api.checkEmailExists(email);
 *       return !exists;
 *     }
 *   }
 * ], {
 *   debounceMs: 500,
 *   validateOnChange: true
 * });
 * ```
 */
export function useFieldValidator<T = string>(
  initialValue: T,
  validationRules: ValidationRule[] = [],
  config: {
    debounceMs?: number;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    dependentFields?: Record<string, any>;
    onValidationStart?: () => void;
    onValidationEnd?: (isValid: boolean, error?: string) => void;
  } = {}
) {
  const {
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true,
    dependentFields = {},
    onValidationStart,
    onValidationEnd
  } = config;

  // Field state
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState(false);

  // Validation control
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const validationAbortControllerRef = useRef<AbortController>();

  // Validate single rule
  const validateRule = useCallback(async (
    rule: ValidationRule,
    currentValue: T,
    allFields: Record<string, any> = {},
    signal?: AbortSignal
  ): Promise<boolean> => {
    // Check if validation was aborted
    if (signal?.aborted) {
      throw new Error('Validation aborted');
    }

    switch (rule.type) {
      case 'required':
        return currentValue !== undefined && 
               currentValue !== null && 
               String(currentValue).trim() !== '';

      case 'email':
        if (!currentValue) return true; // Allow empty for optional fields
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(currentValue));

      case 'phone':
        if (!currentValue) return true;
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(String(currentValue).replace(/\s/g, ''));

      case 'custom':
        if (rule.validator) {
          if (signal?.aborted) {
            throw new Error('Validation aborted');
          }
          return await rule.validator(currentValue, allFields);
        }
        return true;

      default:
        return true;
    }
  }, []);

  // Main validation function
  const validate = useCallback(async (
    valueToValidate: T = value,
    allFields: Record<string, any> = dependentFields,
    immediate: boolean = false
  ): Promise<boolean> => {
    // Clear existing timeout if not immediate
    if (!immediate && validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Abort any ongoing validation
    if (validationAbortControllerRef.current) {
      validationAbortControllerRef.current.abort();
    }

    const validateInternal = async (): Promise<boolean> => {
      // Create new abort controller for this validation
      const abortController = new AbortController();
      validationAbortControllerRef.current = abortController;

      setIsValidating(true);
      onValidationStart?.();

      try {
        // Run all validation rules
        for (const rule of validationRules) {
          if (abortController.signal.aborted) {
            throw new Error('Validation aborted');
          }

          const isRuleValid = await validateRule(
            rule, 
            valueToValidate, 
            allFields, 
            abortController.signal
          );

          if (!isRuleValid) {
            setError(rule.message);
            setIsValid(false);
            onValidationEnd?.(false, rule.message);
            return false;
          }
        }

        // All rules passed
        setError('');
        setIsValid(true);
        onValidationEnd?.(true);
        return true;

      } catch (error) {
        if ((error as Error).message === 'Validation aborted') {
          // Validation was aborted, don't update state
          return isValid;
        }

        // Validation error
        const errorMessage = 'Validation failed';
        setError(errorMessage);
        setIsValid(false);
        onValidationEnd?.(false, errorMessage);
        return false;

      } finally {
        setIsValidating(false);
        // Clear the abort controller reference if it's the current one
        if (validationAbortControllerRef.current === abortController) {
          validationAbortControllerRef.current = undefined;
        }
      }
    };

    if (immediate) {
      return validateInternal();
    } else {
      // Debounced validation
      return new Promise((resolve) => {
        validationTimeoutRef.current = setTimeout(async () => {
          const result = await validateInternal();
          resolve(result);
        }, debounceMs);
      });
    }
  }, [
    value,
    dependentFields,
    validationRules,
    validateRule,
    debounceMs,
    isValid,
    onValidationStart,
    onValidationEnd
  ]);

  // Handle value change
  const handleValueChange = useCallback(async (newValue: T) => {
    setValue(newValue);
    
    if (validateOnChange && validationRules.length > 0) {
      await validate(newValue, dependentFields);
    }
  }, [validateOnChange, validationRules, validate, dependentFields]);

  // Handle field blur
  const handleBlur = useCallback(async () => {
    setTouched(true);
    
    if (validateOnBlur && validationRules.length > 0) {
      await validate(value, dependentFields, true); // Immediate validation on blur
    }
  }, [validateOnBlur, validationRules, validate, value, dependentFields]);

  // Clear error
  const clearError = useCallback(() => {
    setError('');
    setIsValid(true);
  }, []);

  // Reset field
  const reset = useCallback((newValue?: T) => {
    const resetValue = newValue !== undefined ? newValue : initialValue;
    setValue(resetValue);
    setError('');
    setIsValid(true);
    setTouched(false);
    setIsValidating(false);

    // Clear any pending validation
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    if (validationAbortControllerRef.current) {
      validationAbortControllerRef.current.abort();
      validationAbortControllerRef.current = undefined;
    }
  }, [initialValue]);

  // Validate dependent fields when they change
  useEffect(() => {
    if (touched && validateOnChange && validationRules.length > 0) {
      validate(value, dependentFields);
    }
  }, [dependentFields, touched, validateOnChange, validationRules.length, validate, value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (validationAbortControllerRef.current) {
        validationAbortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    value,
    error,
    isValidating,
    isValid,
    touched,
    
    // Actions
    setValue: handleValueChange,
    validate: (immediate?: boolean) => validate(value, dependentFields, immediate),
    handleBlur,
    clearError,
    reset,
    
    // Utilities
    hasError: error !== '',
    shouldShowError: touched && error !== '',
    
    // Field props for easy form integration
    fieldProps: {
      value,
      onChange: handleValueChange,
      onBlur: handleBlur,
      error: touched ? error : '',
      'aria-invalid': touched && error !== '',
      'aria-describedby': error ? `field-error-${Math.random()}` : undefined
    }
  };
}

/**
 * Hook for validating multiple fields with cross-field dependencies
 * 
 * @param fields - Object with field names and their validation configs
 * @returns Multi-field validation interface
 */
export function useMultiFieldValidator<T extends Record<string, any>>(
  initialValues: T,
  fieldConfigs: Record<keyof T, {
    validationRules: ValidationRule[];
    config?: Parameters<typeof useFieldValidator>[2];
  }>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [isFormValid, setIsFormValid] = useState(true);
  const [isAnyValidating, setIsAnyValidating] = useState(false);

  // Create validators for each field - using any to avoid complex type inference
  const validators = Object.keys(fieldConfigs).reduce((acc, fieldName) => {
    const key = fieldName as keyof T;
    const { validationRules, config = {} } = fieldConfigs[key];
    
    // Type assertion to work around complex generic inference
    (acc as any)[key] = useFieldValidator(
      initialValues[key],
      validationRules,
      {
        ...config,
        dependentFields: values,
        onValidationStart: () => setIsAnyValidating(true),
        onValidationEnd: (isValid) => {
          setIsAnyValidating(false);
          // Update form validity
          setIsFormValid(prevFormValid => {
            const otherFieldsValid = Object.keys(validators)
              .filter(k => k !== fieldName)
              .every(k => (validators as any)[k as keyof T]?.isValid !== false);
            return isValid && otherFieldsValid;
          });
        }
      }
    );
    
    return acc;
  }, {} as Record<keyof T, any>); // Using any for the return type

  // Update field value
  const setFieldValue = useCallback(<K extends keyof T>(
    fieldName: K,
    value: T[K]
  ) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    (validators as any)[fieldName]?.setValue(value);
  }, [validators]);

  // Validate all fields
  const validateAll = useCallback(async (): Promise<boolean> => {
    const validationPromises = Object.values(validators).map((validator: any) => 
      validator.validate(true) // Immediate validation
    );
    
    const results = await Promise.all(validationPromises);
    const allValid = results.every(Boolean);
    setIsFormValid(allValid);
    return allValid;
  }, [validators]);

  // Reset all fields
  const resetAll = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    setValues(resetValues);
    
    Object.keys(validators).forEach(fieldName => {
      const key = fieldName as keyof T;
      (validators as any)[key]?.reset(resetValues[key]);
    });
    
    setIsFormValid(true);
    setIsAnyValidating(false);
  }, [initialValues, validators]);

  // Get all errors
  const getAllErrors = useCallback(() => {
    return Object.keys(validators).reduce((acc, fieldName) => {
      const key = fieldName as keyof T;
      const validator = (validators as any)[key];
      if (validator?.error) {
        acc[key] = validator.error;
      }
      return acc;
    }, {} as Partial<Record<keyof T, string>>);
  }, [validators]);

  return {
    validators,
    values,
    isFormValid,
    isAnyValidating,
    setFieldValue,
    validateAll,
    resetAll,
    getAllErrors,
    
    // Utility getters
    hasAnyErrors: Object.values(validators).some((v: any) => v.hasError),
    touchedFields: Object.keys(validators).filter(k => (validators as any)[k as keyof T]?.touched)
  };
}