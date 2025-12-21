'use client';

import { useMemo } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { MultiSelectFilter as MultiSelectFilterConfig } from '../types';

interface MultiSelectFilterProps<T> {
  config: MultiSelectFilterConfig<T>;
  value: string[];
  onChange: (value: string[]) => void;
  data: T[];
}

export function MultiSelectFilter<T>({ config, value, onChange, data }: MultiSelectFilterProps<T>) {
  const options = useMemo(() => {
    return typeof config.options === 'function'
      ? config.options(data)
      : config.options;
  }, [config.options, data]);

  return (
    <div style={{ width: config.width || '220px' }}>
      <MultiSelect
        options={options}
        selected={value}
        onSelectionChange={onChange}
        placeholder={config.placeholder}
        searchPlaceholder={config.searchPlaceholder}
      />
    </div>
  );
}
