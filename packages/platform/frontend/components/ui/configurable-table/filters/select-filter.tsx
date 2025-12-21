'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectFilter as SelectFilterConfig } from '../types';

interface SelectFilterProps<T> {
  config: SelectFilterConfig<T>;
  value: string;
  onChange: (value: string) => void;
  data: T[];
}

export function SelectFilter<T>({ config, value, onChange, data }: SelectFilterProps<T>) {
  const options = useMemo(() => {
    return typeof config.options === 'function'
      ? config.options(data)
      : config.options;
  }, [config.options, data]);

  return (
    <Select value={value || config.allValue || ''} onValueChange={onChange}>
      <SelectTrigger style={{ width: config.width || '140px' }}>
        <SelectValue placeholder={config.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {config.allValue && (
          <SelectItem value={config.allValue}>{config.placeholder}</SelectItem>
        )}
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
