import { Column } from '@/components/ui/data-table';
import { ActionsConfig } from '../types';
import { InlineActions } from './inline-actions';
import { DropdownActions } from './dropdown-actions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createActionsColumn<T extends Record<string, any>>(
  actionsConfig: ActionsConfig<T>,
): Column<T> {
  return {
    id: 'actions',
    header: actionsConfig?.type === 'inline' ? 'Actions' : '',
    sortable: false,
    headerClassName: actionsConfig?.type === 'dropdown' ? 'w-[60px]' : 'text-right',
    className: 'text-right',
    cell: (row: T) => {
      if (!actionsConfig) return null;

      if (actionsConfig.type === 'inline') {
        return <InlineActions config={actionsConfig} item={row} />;
      }

      if (actionsConfig.type === 'dropdown') {
        return <DropdownActions config={actionsConfig} item={row} />;
      }

      return null;
    },
  };
}
