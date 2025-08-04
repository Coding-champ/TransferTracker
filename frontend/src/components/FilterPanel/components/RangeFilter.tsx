import React from 'react';

/**
 * Props for the RangeFilter component
 */
interface RangeFilterProps {
  /** The title/label for the range filter */
  title: string;
  /** Current minimum value */
  minValue?: number;
  /** Current maximum value */
  maxValue?: number;
  /** Callback when minimum value changes */
  onMinChange: (value: number | undefined) => void;
  /** Callback when maximum value changes */
  onMaxChange: (value: number | undefined) => void;
  /** Optional function to format displayed values */
  formatValue?: (value: number) => string;
  /** Optional unit to display */
  unit?: string;
  /** Placeholder text for min and max inputs */
  placeholder?: { min: string; max: string };
  /** Input step for number inputs */
  step?: string;
  /** Minimum allowed value */
  min?: string;
  /** Maximum allowed value */
  max?: string;
}

/**
 * Reusable range filter component for numeric min/max value inputs
 * Supports custom formatting, units, and validation
 * Wrapped with React.memo to prevent unnecessary re-renders
 */
const RangeFilter: React.FC<RangeFilterProps> = React.memo(({
  title,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  formatValue,
  unit,
  placeholder = { min: "", max: "" },
  step = "1",
  min,
  max
}) => {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-600 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${title}-min`} className="block text-xs text-gray-500 mb-1">
            Min{unit && ` (${unit})`}
          </label>
          <input
            id={`${title}-min`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={minValue || ''}
            onChange={(e) => onMinChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={placeholder.min}
          />
          {minValue && formatValue && (
            <p className="text-xs text-gray-500 mt-1">
              Min: {formatValue(minValue)}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${title}-max`} className="block text-xs text-gray-500 mb-1">
            Max{unit && ` (${unit})`}
          </label>
          <input
            id={`${title}-max`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={maxValue || ''}
            onChange={(e) => onMaxChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={placeholder.max}
          />
          {maxValue && formatValue && (
            <p className="text-xs text-gray-500 mt-1">
              Max: {formatValue(maxValue)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default RangeFilter;