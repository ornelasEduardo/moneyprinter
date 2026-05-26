import type { Filter, FilterField } from 'doom-design-system/filter';

export interface AccountOption {
  id: number;
  name: string;
}

export function transactionFilterFields(accounts: AccountOption[] = []): FilterField[] {
  const accountOptions = accounts.map((a) => ({ value: String(a.id), label: a.name }));
  return [
    {
      key: 'name',
      label: 'Name',
      type: 'text',
      operators: ['contains', 'startsWith', 'endsWith', 'eq', 'neq'],
    },
    {
      key: 'amount',
      label: 'Amount',
      type: 'number',
      operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'income', label: 'Income' },
        { value: 'expense', label: 'Expense' },
      ],
      operators: ['eq', 'neq'],
    },
    {
      key: 'account_id',
      label: 'Account',
      type: 'select',
      options: accountOptions,
      operators: ['eq', 'neq', 'in', 'notIn'],
    },
  ];
}

export function normalizeFilterValues(filter: Filter, fields: FilterField[]): Filter {
  const byKey = new Map(fields.map((f) => [f.key, f]));

  function walk(node: Filter): Filter {
    if (node.type === 'group') {
      return {
        type: 'group',
        id: node.id,
        logic: node.logic,
        conditions: node.conditions.map(walk),
      };
    }
    const fieldDef = byKey.get(node.field);
    if (
      fieldDef?.type === 'number' &&
      typeof node.value === 'string' &&
      node.value !== ''
    ) {
      return { ...node, value: Number(node.value) };
    }
    return node;
  }

  return walk(filter);
}
