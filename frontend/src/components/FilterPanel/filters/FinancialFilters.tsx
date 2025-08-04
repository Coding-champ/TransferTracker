import React from 'react';
import { FilterState } from '../../../types';
import { formatCurrency } from '../../../utils';
import FilterSection from '../FilterSection';
import RangeFilter from '../components/RangeFilter';

/**
 * Props for the FinancialFilters component
 */
interface FinancialFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Function to update specific filter values */
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  /** Expanded sections state */
  expandedSections: Set<string>;
  /** Function to toggle section expansion */
  toggleSection: (section: string) => void;
}

/**
 * Financial filters component for transfer fees, ROI, and payment options
 * Groups all money-related filtering options
 */
const FinancialFilters: React.FC<FinancialFiltersProps> = ({
  filters,
  updateFilter,
  expandedSections,
  toggleSection
}) => {
  return (
    <FilterSection
      title="Financial Filters"
      sectionKey="financial"
      isExpanded={expandedSections.has('financial')}
      onToggle={toggleSection}
    >
      <div className="space-y-4">
        {/* Paid Transfers Only */}
        <div>
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={filters.hasTransferFee}
              onChange={(e) => updateFilter('hasTransferFee', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Only paid transfers</span>
          </label>
        </div>

        {/* Transfer Fee Range */}
        <RangeFilter
          title="Transfer Fee Range"
          minValue={filters.minTransferFee}
          maxValue={filters.maxTransferFee}
          onMinChange={(value) => updateFilter('minTransferFee', value)}
          onMaxChange={(value) => updateFilter('maxTransferFee', value)}
          formatValue={formatCurrency}
          unit="€"
          placeholder={{ min: "0", max: "∞" }}
        />

        {/* ROI Range */}
        <RangeFilter
          title="ROI Range (%)"
          minValue={filters.minROI}
          maxValue={filters.maxROI}
          onMinChange={(value) => updateFilter('minROI', value)}
          onMaxChange={(value) => updateFilter('maxROI', value)}
          step="0.1"
          placeholder={{ min: "-100", max: "1000" }}
        />
      </div>
    </FilterSection>
  );
};

export default FinancialFilters;