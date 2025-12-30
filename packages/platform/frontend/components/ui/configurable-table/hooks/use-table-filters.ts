'use client';

import { useState, useMemo, useCallback } from 'react';
import { FilterConfig, FilterValues } from '../types';

export function useTableFilters<T>(
  data: T[],
  filterConfigs?: FilterConfig<T>[],
) {
  const [filters, setFilters] = useState<FilterValues>(() => {
    const initial: FilterValues = {};
    filterConfigs?.forEach(fc => {
      if (fc.type === 'tabs') {
        initial[fc.id] = fc.defaultValue ?? (fc.showAllOption ? 'all' : '');
      } else if (fc.type === 'select') {
        initial[fc.id] = fc.defaultValue || fc.allValue || '';
      } else if (fc.type === 'multi-select') {
        initial[fc.id] = [];
      }
    });
    return initial;
  });

  const setFilterValue = useCallback((id: string, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [id]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    const cleared: FilterValues = {};
    filterConfigs?.forEach(fc => {
      if (fc.type === 'tabs') {
        cleared[fc.id] = fc.defaultValue ?? (fc.showAllOption ? 'all' : '');
      } else if (fc.type === 'select') {
        cleared[fc.id] = fc.allValue || '';
      } else if (fc.type === 'multi-select') {
        cleared[fc.id] = [];
      }
    });
    setFilters(cleared);
  }, [filterConfigs]);

  const hasActiveFilters = useMemo(() => {
    if (!filterConfigs) return false;
    return filterConfigs.some(fc => {
      const value = filters[fc.id];
      if (fc.type === 'tabs') {
        const defaultVal = fc.defaultValue ?? (fc.showAllOption ? 'all' : '');
        return value !== defaultVal;
      }
      if (fc.type === 'select') {
        return value && value !== fc.allValue;
      }
      if (fc.type === 'multi-select') {
        return Array.isArray(value) && value.length > 0;
      }
      return false;
    });
  }, [filters, filterConfigs]);

  const filteredData = useMemo(() => {
    if (!filterConfigs || filterConfigs.length === 0) return data;

    return data.filter(item => {
      return filterConfigs.every(fc => {
        const value = filters[fc.id];

        if (fc.type === 'tabs') {
          if (value === 'all' || !value) return true;
          return fc.getItemValue(item) === value;
        }

        if (fc.type === 'select') {
          if (!value || value === fc.allValue) return true;
          const itemValue = fc.getItemValue(item);
          return itemValue === value;
        }

        if (fc.type === 'multi-select') {
          const selected = value as string[];
          if (selected.length === 0) return true;
          return fc.matchesItem(item, selected);
        }

        return true;
      });
    });
  }, [data, filters, filterConfigs]);

  return {
    filters,
    setFilterValue,
    clearAllFilters,
    hasActiveFilters,
    filteredData,
  };
}
