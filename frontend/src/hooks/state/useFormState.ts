import { useCallback, useEffect, useRef, useState } from 'react';
import { FormState, FormFieldConfig, FormError } from './types';

/**
 * Enhanced form state management hook with validation and auto-save
 * 
 * Features:
 * - Field-level validation and error handling
 * - Dirty state tracking
 * - Auto-save capabilities
 * - Integration with state history
 * - TypeScript generics for type safety
 * - Custom validation rules
 * - Form submission handling
 * 
 * @param initialValues - Initial form values
 * @param config - Form configuration options
 * @returns Form state and handlers
 * 
 * @example
 * ```typescript
 * interface TransferForm {
 *   playerName: string;
 *   fee: number;
 *   club: string;
 * }
 * 
 * const {
 *   values,
 *   errors,
 *   touched,
 *   dirty,
 *   setValue,
 *   handleSubmit,
 *   reset
 * } = useFormState<TransferForm>({
 *   playerName: '',
 *   fee: 0,
 *   club: ''
 * }, {
 *   validationRules: {
 *     playerName: [{ type: 'required', message: 'Player name is required' }],
 *     fee: [{ type: 'custom', message: 'Fee must be positive', validator: (value) => value > 0 }]
 *   },
 *   autoSave: true,
 *   autoSaveDelay: 2000
 * });
 * ```
 */
export function useFormState<T extends Record<string, any>>(
  initialValues: T,
  config: {
    validationRules?: Partial<Record<keyof T, FormFieldConfig['validation']>>;
    autoSave?: boolean;
    autoSaveDelay?: number;
    onAutoSave?: (values: T) => Promise<void>;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    onSubmit?: (values: T) => Promise<void> | void;
    onValidationError?: (errors: Record<keyof T, string>) => void;
  } = {}
) {
  const {
    validationRules = {},
    autoSave = false,
    autoSaveDelay = 2000,
    onAutoSave,
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
    onValidationError
  } = config;

  // Form state
  const [formState, setFormState] = useState<FormState<T>>(() => ({
    values: initialValues,
    errors: Object.keys(initialValues).reduce((acc, key) => {
      acc[key as keyof T] = '';
      return acc;
    }, {} as Record<keyof T, string>),
    touched: Object.keys(initialValues).reduce((acc, key) => {
      acc[key as keyof T] = false;
      return acc;
    }, {} as Record<keyof T, boolean>),
    dirty: Object.keys(initialValues).reduce((acc, key) => {
      acc[key as keyof T] = false;
      return acc;
    }, {} as Record<keyof T, boolean>),
    isValid: true,
    isSubmitting: false,
    submitCount: 0
  }));

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const lastAutoSaveRef = useRef<T>(initialValues);

  // Validation function for a single field
  const validateField = useCallback(async (
    name: keyof T,
    value: any,
    allValues: T
  ): Promise<string> => {
    const rules = (validationRules as any)[name] || [];
    
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            return rule.message;
          }
          break;
          
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            return rule.message;
          }
          break;
          
        case 'phone':
          if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(String(value))) {
            return rule.message;
          }
          break;
          
        case 'custom':
          if (rule.validator) {
            try {
              const isValid = await rule.validator(value, allValues);
              if (!isValid) {
                return rule.message;
              }
            } catch (error) {
              return rule.message;
            }
          }
          break;
          
        default:
          break;
      }
    }
    
    return '';
  }, [validationRules]);

  // Validate all fields
  const validateForm = useCallback(async (values: T): Promise<Record<keyof T, string>> => {
    const errors = {} as Record<keyof T, string>;
    
    const validationPromises = Object.keys(values).map(async (key) => {
      const fieldName = key as keyof T;
      const error = await validateField(fieldName, values[fieldName], values);
      if (error) {
        errors[fieldName] = error;
      }
    });
    
    await Promise.all(validationPromises);
    return errors;
  }, [validateField]);

  // Set field value
  const setValue = useCallback(async <K extends keyof T>(
    name: K,
    value: T[K],
    options: {
      shouldValidate?: boolean;
      shouldTouch?: boolean;
      shouldMarkDirty?: boolean;
    } = {}
  ) => {
    const {
      shouldValidate = validateOnChange,
      shouldTouch = true,
      shouldMarkDirty = true
    } = options;

    setFormState(prevState => {
      const newValues = { ...prevState.values, [name]: value };
      const newTouched = shouldTouch 
        ? { ...prevState.touched, [name]: true }
        : prevState.touched;
      const newDirty = shouldMarkDirty
        ? { ...prevState.dirty, [name]: value !== initialValues[name] }
        : prevState.dirty;

      return {
        ...prevState,
        values: newValues,
        touched: newTouched,
        dirty: newDirty
      };
    });

    // Validate field if needed
    if (shouldValidate) {
      const newValues = { ...formState.values, [name]: value };
      const fieldError = await validateField(name, value, newValues);
      
      setFormState(prevState => ({
        ...prevState,
        errors: { ...prevState.errors, [name]: fieldError },
        isValid: Object.values({ ...prevState.errors, [name]: fieldError }).every(err => !err)
      }));
    }

    // Trigger auto-save
    if (autoSave && onAutoSave) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(async () => {
        const currentValues = { ...formState.values, [name]: value };
        if (JSON.stringify(currentValues) !== JSON.stringify(lastAutoSaveRef.current)) {
          try {
            await onAutoSave(currentValues);
            lastAutoSaveRef.current = currentValues;
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, autoSaveDelay);
    }
  }, [
    formState.values,
    initialValues,
    validateOnChange,
    validateField,
    autoSave,
    onAutoSave,
    autoSaveDelay
  ]);

  // Set multiple values
  const setValues = useCallback(async (values: Partial<T>) => {
    setFormState(prevState => {
      const newValues = { ...prevState.values, ...values };
      const newTouched = { ...prevState.touched };
      const newDirty = { ...prevState.dirty };

      // Mark all updated fields as touched and dirty
      Object.keys(values).forEach(key => {
        const fieldName = key as keyof T;
        newTouched[fieldName] = true;
        newDirty[fieldName] = newValues[fieldName] !== initialValues[fieldName];
      });

      return {
        ...prevState,
        values: newValues,
        touched: newTouched,
        dirty: newDirty
      };
    });

    // Validate if needed
    if (validateOnChange) {
      const newValues = { ...formState.values, ...values };
      const errors = await validateForm(newValues);
      
      setFormState(prevState => ({
        ...prevState,
        errors,
        isValid: Object.values(errors).every(err => !err)
      }));
    }
  }, [formState.values, initialValues, validateOnChange, validateForm]);

  // Handle field blur
  const handleBlur = useCallback(async <K extends keyof T>(name: K) => {
    setFormState(prevState => ({
      ...prevState,
      touched: { ...prevState.touched, [name]: true }
    }));

    if (validateOnBlur) {
      const fieldError = await validateField(name, formState.values[name], formState.values);
      
      setFormState(prevState => ({
        ...prevState,
        errors: { ...prevState.errors, [name]: fieldError },
        isValid: Object.values({ ...prevState.errors, [name]: fieldError }).every(err => !err)
      }));
    }
  }, [formState.values, validateOnBlur, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    setFormState(prevState => ({
      ...prevState,
      isSubmitting: true,
      submitCount: prevState.submitCount + 1
    }));

    try {
      // Validate entire form
      const errors = await validateForm(formState.values);
      const isValid = Object.values(errors).every(err => !err);

      setFormState(prevState => ({
        ...prevState,
        errors,
        isValid,
        touched: Object.keys(formState.values).reduce((acc, key) => {
          acc[key as keyof T] = true;
          return acc;
        }, {} as Record<keyof T, boolean>)
      }));

      if (!isValid) {
        onValidationError?.(errors);
        return false;
      }

      // Submit form
      if (onSubmit) {
        await onSubmit(formState.values);
      }

      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setFormState(prevState => ({
        ...prevState,
        isSubmitting: false
      }));
    }
  }, [formState.values, validateForm, onSubmit, onValidationError]);

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    
    setFormState({
      values: resetValues,
      errors: Object.keys(initialValues).reduce((acc, key) => {
        acc[key as keyof T] = '';
        return acc;
      }, {} as Record<keyof T, string>),
      touched: Object.keys(initialValues).reduce((acc, key) => {
        acc[key as keyof T] = false;
        return acc;
      }, {} as Record<keyof T, boolean>),
      dirty: Object.keys(initialValues).reduce((acc, key) => {
        acc[key as keyof T] = false;
        return acc;
      }, {} as Record<keyof T, boolean>),
      isValid: true,
      isSubmitting: false,
      submitCount: 0
    });

    lastAutoSaveRef.current = resetValues;
  }, [initialValues]);

  // Get field props helper
  const getFieldProps = useCallback(<K extends keyof T>(name: K) => ({
    name: String(name),
    value: formState.values[name],
    onChange: (value: T[K]) => setValue(name, value),
    onBlur: () => handleBlur(name),
    error: formState.errors[name] || '',
    touched: formState.touched[name] || false,
    dirty: formState.dirty[name] || false
  }), [formState, setValue, handleBlur]);

  // Check if form has changes
  const hasChanges = useCallback(() => {
    return Object.values(formState.dirty).some(Boolean);
  }, [formState.dirty]);

  // Get form errors array
  const getFormErrors = useCallback((): FormError[] => {
    return Object.entries(formState.errors)
      .filter(([, message]) => message)
      .map(([field, message]) => ({
        field,
        message: message as string,
        type: 'validation'
      }));
  }, [formState.errors]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    dirty: formState.dirty,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    submitCount: formState.submitCount,
    
    // Actions
    setValue,
    setValues,
    handleBlur,
    handleSubmit,
    reset,
    
    // Utilities
    getFieldProps,
    hasChanges,
    getFormErrors,
    validateForm: () => validateForm(formState.values),
    validateField: (name: keyof T) => validateField(name, formState.values[name], formState.values)
  };
}