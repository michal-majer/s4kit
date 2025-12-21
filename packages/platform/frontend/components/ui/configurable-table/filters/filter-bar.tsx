'use client';

import { FilterConfig, FilterValues } from '../types';
import { TabFilter } from './tab-filter';
import { SelectFilter } from './select-filter';
import { MultiSelectFilter } from './multi-select-filter';

interface FilterBarProps<T> {
  filters: FilterConfig<T>[];
  filterValues: FilterValues;
  onFilterChange: (id: string, value: string | string[]) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  data: T[];
}

export function FilterBar<T>({
  filters,
  filterValues,
  onFilterChange,
  onClearAll,
  hasActiveFilters,
  data,
}: FilterBarProps<T>) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filters.map(filter => {
        if (filter.type === 'tabs') {
          return (
            <TabFilter
              key={filter.id}
              config={filter}
              value={filterValues[filter.id] as string}
              onChange={(v) => onFilterChange(filter.id, v)}
              data={data}
            />
          );
        }

        if (filter.type === 'select') {
          return (
            <SelectFilter
              key={filter.id}
              config={filter}
              value={filterValues[filter.id] as string}
              onChange={(v) => onFilterChange(filter.id, v)}
              data={data}
            />
          );
        }

        if (filter.type === 'multi-select') {
          return (
            <MultiSelectFilter
              key={filter.id}
              config={filter}
              value={filterValues[filter.id] as string[]}
              onChange={(v) => onFilterChange(filter.id, v)}
              data={data}
            />
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
