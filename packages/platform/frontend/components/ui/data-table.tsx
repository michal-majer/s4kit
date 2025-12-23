'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  ChevronDown,
} from 'lucide-react';

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchableColumns?: (keyof T)[];
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  getRowId?: (row: T) => string;
  expandableContent?: (row: T) => React.ReactNode;
  isExpandable?: (row: T) => boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Search...',
  searchableColumns,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  emptyMessage = 'No results found.',
  className,
  onRowClick,
  rowClassName,
  getRowId,
  expandableContent,
  isExpandable,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    column: '',
    direction: null,
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const hasExpandableRows = !!expandableContent;

  // Get value from row using accessor
  const getValue = React.useCallback(
    (row: T, column: Column<T>): any => {
      if (column.accessorFn) {
        return column.accessorFn(row);
      }
      if (column.accessorKey) {
        return row[column.accessorKey];
      }
      return row[column.id as keyof T];
    },
    []
  );

  // Filter data based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    const columnsToSearch =
      searchableColumns ||
      columns.filter((col) => col.searchable !== false).map((col) => col.accessorKey || col.id as keyof T);

    return data.filter((row) =>
      columnsToSearch.some((key) => {
        const value = row[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchableColumns, columns]);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) return filteredData;

    const column = columns.find((col) => col.id === sortConfig.column);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, column);
      const bValue = getValue(b, column);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, columns, getValue]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  // Reset to first page when data or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, data.length]);

  // Handle sort
  const handleSort = (columnId: string) => {
    setSortConfig((prev) => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column: columnId, direction: 'desc' };
      }
      return { column: '', direction: null };
    });
  };

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // Render sort icon
  const renderSortIcon = (columnId: string) => {
    if (sortConfig.column !== columnId) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="ml-1 h-3.5 w-3.5 text-foreground" />;
    }
    return <ArrowDown className="ml-1 h-3.5 w-3.5 text-foreground" />;
  };

  const showPagination = data.length > pageSizeOptions[0];
  const showSearch = data.length > 5;
  const totalColumns = columns.length + (hasExpandableRows ? 1 : 0);

  return (
    <div className={cn('rounded-3xl border-0 bg-card shadow-sm overflow-hidden', className)}>
      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-border/20 px-5 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {filteredData.length} of {data.length} results
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {hasExpandableRows && (
              <TableHead className="w-10" />
            )}
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  'font-semibold',
                  column.sortable !== false && 'cursor-pointer select-none',
                  column.headerClassName
                )}
                onClick={() =>
                  column.sortable !== false && handleSort(column.id)
                }
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable !== false && renderSortIcon(column.id)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={totalColumns}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row, index) => {
              const rowId = getRowId
                ? getRowId(row)
                : row.id || `row-${startIndex + index}`;
              const isExpanded = expandedRows.has(rowId);
              const canExpand = hasExpandableRows && (!isExpandable || isExpandable(row));
              const expandedContent = canExpand && isExpanded ? expandableContent?.(row) : null;

              return (
                <React.Fragment key={rowId}>
                  <TableRow
                    className={cn(
                      'group',
                      onRowClick && 'cursor-pointer',
                      rowClassName?.(row)
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {hasExpandableRows && (
                      <TableCell className="w-10">
                        {canExpand && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(rowId);
                            }}
                          >
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                isExpanded ? 'rotate-0' : '-rotate-90'
                              )}
                            />
                          </Button>
                        )}
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {column.cell
                          ? column.cell(row)
                          : getValue(row, column) ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedContent && (
                    <TableRow>
                      <TableCell
                        colSpan={totalColumns}
                        className="bg-muted/30 p-4"
                      >
                        {expandedContent}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between border-t border-border/20 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground mr-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
