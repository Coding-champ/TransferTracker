import React from 'react';

/**
 * Generic checkbox filter component for selecting multiple items from a list
 * @template T - The type of items in the list
 */
interface CheckboxFilterProps<T> {
  /** The title/label for the filter section */
  title: string;
  /** Array of items to display as checkboxes */
  items: T[];
  /** Array of currently selected items */
  selectedItems: T[];
  /** Callback when an item's checked state changes */
  onItemChange: (item: T, checked: boolean) => void;
  /** Optional custom render function for item labels */
  renderLabel?: (item: T) => React.ReactNode;
  /** Maximum height for the scrollable container */
  maxHeight?: string;
}

/**
 * Reusable checkbox filter component that displays a list of items with checkboxes
 * Supports custom label rendering and scrollable containers for long lists
 * Wrapped with React.memo to prevent unnecessary re-renders when props haven't changed
 */
const CheckboxFilter = React.memo(function CheckboxFilter<T extends string | number>({
  title,
  items,
  selectedItems,
  onItemChange,
  renderLabel,
  maxHeight = "max-h-32"
}: CheckboxFilterProps<T>) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-600 mb-2">{title}</h4>
      <div className={`space-y-2 ${maxHeight} overflow-y-auto custom-scrollbar`}>
        {items.map(item => (
          <label key={item} className="flex items-center">
            <input
              type="checkbox"
              checked={selectedItems.includes(item)}
              onChange={(e) => onItemChange(item, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">
              {renderLabel ? renderLabel(item) : item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
});

export default CheckboxFilter;