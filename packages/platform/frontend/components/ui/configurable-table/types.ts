import { Column } from '@/components/ui/data-table';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

// ============ FILTER TYPES ============

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface TabFilter<T> {
  type: 'tabs';
  id: string;
  options: FilterOption[] | ((data: T[]) => FilterOption[]);
  defaultValue?: string;
  getItemValue: (item: T) => string;
  showAllOption?: boolean;
  allLabel?: string;
}

export interface SelectFilter<T> {
  type: 'select';
  id: string;
  placeholder: string;
  options: FilterOption[] | ((data: T[]) => FilterOption[]);
  defaultValue?: string;
  width?: string;
  getItemValue: (item: T) => string | undefined;
  allValue?: string;
}

export interface MultiSelectFilter<T> {
  type: 'multi-select';
  id: string;
  placeholder: string;
  searchPlaceholder?: string;
  options: FilterOption[] | ((data: T[]) => FilterOption[]);
  width?: string;
  matchesItem: (item: T, selectedValues: string[]) => boolean;
}

export type FilterConfig<T> = TabFilter<T> | SelectFilter<T> | MultiSelectFilter<T>;

// ============ ACTION TYPES ============

export interface ActionMenuItem<T> {
  label: string | ((item: T) => string);
  icon?: LucideIcon;
  onClick: (item: T) => void;
  show?: (item: T) => boolean;
  variant?: 'default' | 'destructive';
  separator?: boolean;
  href?: string | ((item: T) => string);
}

export interface InlineActions<T> {
  type: 'inline';
  showOnHover?: boolean;
  items: ActionMenuItem<T>[];
}

export interface DropdownActions<T> {
  type: 'dropdown';
  items: ActionMenuItem<T>[];
  triggerIcon?: LucideIcon;
}

export type ActionsConfig<T> = InlineActions<T> | DropdownActions<T> | null;

// ============ EMPTY STATE ============

export interface EmptyStateConfig {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

// ============ MAIN CONFIGURATION ============

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ConfigurableTableConfig<T extends Record<string, any>> {
  columns: Column<T>[];
  filters?: FilterConfig<T>[];
  actions?: ActionsConfig<T>;
  emptyState?: EmptyStateConfig;
  filteredEmptyMessage?: string | ReactNode;
  searchPlaceholder?: string;
  searchableColumns?: (keyof T)[];
  pageSize?: number;
  pageSizeOptions?: number[];
  rowClassName?: (item: T) => string;
  getRowId: (item: T) => string;
  onRowClick?: (item: T) => void;
  expandableContent?: (item: T) => ReactNode;
  isExpandable?: (item: T) => boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ConfigurableTableProps<T extends Record<string, any>> {
  data: T[];
  config: ConfigurableTableConfig<T>;
  className?: string;
  filterSlot?: ReactNode;
}

export type FilterValues = Record<string, string | string[]>;
