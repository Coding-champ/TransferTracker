import { renderHook, act } from '@testing-library/react';
import { useFormState } from '../useFormState';

interface TestForm {
  name: string;
  email: string;
  age: number;
}

describe('useFormState', () => {
  const initialValues: TestForm = {
    name: '',
    email: '',
    age: 0
  };

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with provided values', () => {
    const { result } = renderHook(() => 
      useFormState(initialValues)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.isValid).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should update field values', async () => {
    const { result } = renderHook(() => 
      useFormState(initialValues)
    );

    await act(async () => {
      await result.current.setValue('name', 'John Doe');
    });

    expect(result.current.values.name).toBe('John Doe');
    expect(result.current.dirty.name).toBe(true);
    expect(result.current.touched.name).toBe(true);
  });

  it('should validate required fields', async () => {
    const { result } = renderHook(() => 
      useFormState(initialValues, {
        validationRules: {
          name: [{ type: 'required', message: 'Name is required' }]
        },
        validateOnChange: true
      })
    );

    await act(async () => {
      await result.current.setValue('name', '');
    });

    expect(result.current.errors.name).toBe('Name is required');
    expect(result.current.isValid).toBe(false);
  });

  it('should validate email format', async () => {
    const { result } = renderHook(() => 
      useFormState(initialValues, {
        validationRules: {
          email: [{ type: 'email', message: 'Invalid email format' }]
        },
        validateOnChange: true
      })
    );

    await act(async () => {
      await result.current.setValue('email', 'invalid-email');
    });

    expect(result.current.errors.email).toBe('Invalid email format');
    expect(result.current.isValid).toBe(false);

    await act(async () => {
      await result.current.setValue('email', 'valid@email.com');
    });

    expect(result.current.errors.email).toBe('');
    expect(result.current.isValid).toBe(true);
  });

  it('should handle custom validation', async () => {
    const customValidator = jest.fn((value) => value > 18);

    const { result } = renderHook(() => 
      useFormState(initialValues, {
        validationRules: {
          age: [{
            type: 'custom',
            message: 'Must be over 18',
            validator: customValidator
          }]
        },
        validateOnChange: true
      })
    );

    await act(async () => {
      await result.current.setValue('age', 16);
    });

    expect(customValidator).toHaveBeenCalledWith(16, expect.any(Object));
    expect(result.current.errors.age).toBe('Must be over 18');

    await act(async () => {
      await result.current.setValue('age', 25);
    });

    expect(result.current.errors.age).toBe('');
  });

  it('should handle async validation', async () => {
    const asyncValidator = jest.fn().mockResolvedValue(false);

    const { result } = renderHook(() => 
      useFormState(initialValues, {
        validationRules: {
          email: [{
            type: 'custom',
            message: 'Email already exists',
            validator: asyncValidator
          }]
        },
        validateOnChange: true
      })
    );

    await act(async () => {
      await result.current.setValue('email', 'existing@email.com');
    });

    expect(asyncValidator).toHaveBeenCalled();
    expect(result.current.errors.email).toBe('Email already exists');
  });

  it('should handle form submission', async () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() => 
      useFormState(initialValues, {
        onSubmit,
        validationRules: {
          name: [{ type: 'required', message: 'Name is required' }]
        }
      })
    );

    // Submit empty form (should fail validation)
    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.submitCount).toBe(1);

    // Fill required field and submit
    await act(async () => {
      await result.current.setValue('name', 'John Doe');
    });

    await act(async () => {
      submitResult = await result.current.handleSubmit();
    });

    expect(submitResult).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'John Doe'
    }));
  });

  it('should handle auto-save', async () => {
    const onAutoSave = jest.fn();
    const { result } = renderHook(() => 
      useFormState(initialValues, {
        autoSave: true,
        autoSaveDelay: 1000,
        onAutoSave
      })
    );

    await act(async () => {
      await result.current.setValue('name', 'John Doe');
    });

    // Auto-save should not have been called yet
    expect(onAutoSave).not.toHaveBeenCalled();

    // Advance timers to trigger auto-save
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await Promise.resolve(); // Wait for async operations
    });

    expect(onAutoSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'John Doe'
    }));
  });

  it('should reset form', () => {
    const { result } = renderHook(() => 
      useFormState(initialValues)
    );

    act(() => {
      result.current.setValue('name', 'John Doe');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.dirty.name).toBe(false);
    expect(result.current.touched.name).toBe(false);
    expect(result.current.errors.name).toBe(''); // Now properly initialized
    expect(result.current.errors.email).toBe('');
    expect(result.current.errors.age).toBe('');
  });

  it('should provide field props helper', () => {
    const { result } = renderHook(() => 
      useFormState(initialValues)
    );

    const fieldProps = result.current.getFieldProps('name');

    expect(fieldProps).toEqual({
      name: 'name',
      value: '',
      onChange: expect.any(Function),
      onBlur: expect.any(Function),
      error: '',
      touched: false,
      dirty: false
    });
  });

  it('should detect form changes', async () => {
    const { result } = renderHook(() => 
      useFormState(initialValues)
    );

    expect(result.current.hasChanges()).toBe(false);

    await act(async () => {
      await result.current.setValue('name', 'John Doe');
    });

    expect(result.current.hasChanges()).toBe(true);
  });

  it('should handle validation on blur', async () => {
    const { result } = renderHook(() => 
      useFormState(initialValues, {
        validationRules: {
          name: [{ type: 'required', message: 'Name is required' }]
        },
        validateOnBlur: true,
        validateOnChange: false
      })
    );

    await act(async () => {
      await result.current.handleBlur('name');
    });

    expect(result.current.touched.name).toBe(true);
    expect(result.current.errors.name).toBe('Name is required');
  });

  it('should provide form errors array', async () => {
    const { result } = renderHook(() => 
      useFormState(initialValues, {
        validationRules: {
          name: [{ type: 'required', message: 'Name is required' }],
          email: [{ type: 'email', message: 'Invalid email' }]
        }
      })
    );

    await act(async () => {
      await result.current.setValue('email', 'invalid');
    });

    const errors = result.current.getFormErrors();
    expect(errors).toEqual([
      { field: 'email', message: 'Invalid email', type: 'validation' }
    ]);
  });
});