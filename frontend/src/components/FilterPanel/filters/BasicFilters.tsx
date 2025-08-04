import React, { useCallback } from 'react';
import { FilterState } from '../../../types';
import FilterSection from '../FilterSection';
import CheckboxFilter from '../components/CheckboxFilter';

/**
 * Props for the BasicFilters component
 */
interface BasicFiltersProps {
  /** Current filter state */
  filters: FilterState;
  /** Function to update specific filter values */
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  /** Function to handle array-based filter changes */
  handleArrayFilter: (filterKey: keyof FilterState, value: string | number, checked: boolean) => void;
  /** Available seasons from API */
  seasons: string[];
  /** Available transfer types from API */
  transferTypes: string[];
  /** Available transfer windows from API */
  transferWindows: string[];
  /** Expanded sections state */
  expandedSections: Set<string>;
  /** Function to toggle section expansion */
  toggleSection: (section: string) => void;
}

/**
 * Basic filters component for seasons, transfer types, and transfer windows
 * Includes common transfer-related checkboxes
 * Optimized with React.memo for performance
 */
const BasicFilters: React.FC<BasicFiltersProps> = React.memo(({
  filters,
  updateFilter,
  handleArrayFilter,
  seasons,
  transferTypes,
  transferWindows,
  expandedSections,
  toggleSection
}) => {
  // Memoized callbacks for better performance
  const handleSeasonsChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('seasons', item, checked);
  }, [handleArrayFilter]);

  const handleTransferTypesChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('transferTypes', item, checked);
  }, [handleArrayFilter]);

  const handleTransferWindowsChange = useCallback((item: string | number, checked: boolean) => {
    handleArrayFilter('transferWindows', item, checked);
  }, [handleArrayFilter]);

  const handleExcludeLoansChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter('excludeLoans', e.target.checked);
  }, [updateFilter]);

  const handleLoanToBuyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilter('isLoanToBuy', e.target.checked);
  }, [updateFilter]);

  const renderTransferTypeLabel = useCallback((item: string | number) => {
    const labels: { [key: string]: string } = {
      'sale': 'Sale',
      'loan': 'Loan',
      'free': 'Free Transfer',
      'loan_with_option': 'Loan with Option'
    };
    return labels[item as string] || item;
  }, []);

  const renderTransferWindowLabel = useCallback((item: string | number) => {
    const labels: { [key: string]: string } = {
      'summer': 'Summer Window',
      'winter': 'Winter Window'
    };
    return labels[item as string] || item;
  }, []);
  return (
    <>
      {/* Seasons Filter */}
      <FilterSection
        title="Seasons"
        sectionKey="seasons"
        isExpanded={expandedSections.has('seasons')}
        onToggle={toggleSection}
      >
        <CheckboxFilter
          title=""
          items={seasons}
          selectedItems={filters.seasons}
          onItemChange={handleSeasonsChange}
        />
      </FilterSection>

      {/* Transfer Types Filter */}
      <FilterSection
        title="Transfer Types"
        sectionKey="transferTypes"
        isExpanded={expandedSections.has('transferTypes')}
        onToggle={toggleSection}
      >
        <CheckboxFilter
          title=""
          items={transferTypes}
          selectedItems={filters.transferTypes}
          onItemChange={handleTransferTypesChange}
          renderLabel={renderTransferTypeLabel}
        />
        <div className="mt-4 pt-3 border-t space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.excludeLoans}
              onChange={handleExcludeLoansChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Exclude all loans</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.isLoanToBuy}
              onChange={handleLoanToBuyChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Only loan-to-buy transfers</span>
          </label>
        </div>
      </FilterSection>

      {/* Transfer Windows Filter */}
      <FilterSection
        title="Transfer Windows"
        sectionKey="transferWindows"
        isExpanded={expandedSections.has('transferWindows')}
        onToggle={toggleSection}
      >
        <CheckboxFilter
          title=""
          items={transferWindows}
          selectedItems={filters.transferWindows}
          onItemChange={handleTransferWindowsChange}
          renderLabel={renderTransferWindowLabel}
        />
      </FilterSection>
    </>
  );
});

export default BasicFilters;