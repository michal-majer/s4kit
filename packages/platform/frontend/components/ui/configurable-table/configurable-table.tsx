'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { FilterBar } from './filters/filter-bar';
import { useTableFilters } from './hooks/use-table-filters';
import { createActionsColumn } from './actions/action-column';
import { ConfigurableTableProps } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ConfigurableTable<T extends Record<string, any>>({
  data,
  config,
  className,
  filterSlot,
}: ConfigurableTableProps<T>) {
  const {
    filters,
    setFilterValue,
    clearAllFilters,
    hasActiveFilters,
    filteredData,
  } = useTableFilters(data, config.filters);

  // Build columns, appending actions column if configured
  // NOTE: Must be before any early returns to maintain consistent hook order
  const columns = useMemo(() => {
    if (!config.actions) return config.columns;
    const actionsColumn = createActionsColumn(config.actions);
    return [...config.columns, actionsColumn];
  }, [config.columns, config.actions]);

  // If no data at all, show empty state
  if (data.length === 0 && config.emptyState) {
    return (
      <EmptyState
        icon={config.emptyState.icon}
        title={config.emptyState.title}
        description={config.emptyState.description}
      >
        {config.emptyState.action}
      </EmptyState>
    );
  }

  // Handle filtered empty state
  const showFilteredEmpty = filteredData.length === 0 && hasActiveFilters;

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar */}
      {config.filters && config.filters.length > 0 && (
        <FilterBar
          filters={config.filters}
          filterValues={filters}
          onFilterChange={setFilterValue}
          onClearAll={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
          data={data}
        />
      )}

      {filterSlot}

      {/* Filtered Empty State */}
      {showFilteredEmpty ? (
        typeof config.filteredEmptyMessage === 'string' ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">{config.filteredEmptyMessage}</p>
          </div>
        ) : config.filteredEmptyMessage ? (
          config.filteredEmptyMessage
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">No results match your filters.</p>
          </div>
        )
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          searchPlaceholder={config.searchPlaceholder}
          searchableColumns={config.searchableColumns as string[]}
          pageSize={config.pageSize}
          pageSizeOptions={config.pageSizeOptions}
          rowClassName={config.rowClassName}
          getRowId={config.getRowId}
          onRowClick={config.onRowClick}
          expandableContent={config.expandableContent}
          isExpandable={config.isExpandable}
          className={className}
        />
      )}
    </div>
  );
}
