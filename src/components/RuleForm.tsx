'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Field,
  Flex,
  Form,
  Input,
  Select,
  Spinner,
  Switch,
  Text,
  useToast,
} from 'doom-design-system';
import BackLink from './BackLink';
import {
  FilterBuilder,
  type Filter,
  type FilterDraftGroup,
  filterToDraft,
  draftToFilter,
} from 'doom-design-system/filter';
import { createRule, updateRule } from '@/app/actions/rules';
import {
  transactionFilterFields,
  normalizeFilterValues,
} from '@/lib/rule-conditions';

export interface RuleFormInitial {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: Filter;
  actions: { addTags: string[]; setType?: 'income' | 'expense' };
}

interface RuleFormProps {
  accounts: { id: number; name: string }[];
  initial?: RuleFormInitial | null;
}

function emptyDraftGroup(): FilterDraftGroup {
  return {
    type: 'group',
    id: `group-${Date.now()}`,
    children: [],
  };
}

const NAME_ID = 'rule-name';
const PRIORITY_ID = 'rule-priority';
const TAGS_ID = 'rule-tags';

export default function RuleForm({ accounts, initial }: RuleFormProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const isEdit = Boolean(initial);
  const fields = useMemo(() => transactionFilterFields(accounts), [accounts]);

  const [draft, setDraft] = useState<FilterDraftGroup>(() => {
    if (initial && initial.conditions) {
      const d = filterToDraft(initial.conditions);
      if (d.type === 'group') return d as FilterDraftGroup;
      // Wrap a top-level condition in a group
      return {
        type: 'group',
        id: `group-${Date.now()}`,
        children: [d],
      };
    }
    return emptyDraftGroup();
  });

  const [tagsText, setTagsText] = useState(initial?.actions.addTags.join(',') ?? '');
  const [setType, setSetType] = useState<'' | 'income' | 'expense'>(initial?.actions.setType ?? '');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const filter = normalizeFilterValues(draftToFilter(draft) as Filter, fields);
      fd.set('conditions', JSON.stringify(filter));
      const addTags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const actions: { addTags: string[]; setType?: 'income' | 'expense' } = { addTags };
      if (setType === 'income' || setType === 'expense') actions.setType = setType;
      fd.set('actions', JSON.stringify(actions));
      fd.set('enabled', enabled ? 'true' : 'false');

      if (isEdit && initial) {
        await updateRule(initial.id, fd);
        toastSuccess('Rule updated');
      } else {
        await createRule(fd);
        toastSuccess('Rule created');
      }
      router.push('/rules');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save rule';
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <BackLink href="/rules" />
      <Card>
        <Form onSubmit={handleSubmit}>
        <Flex direction="column" gap={6}>
          <Field label="Name" htmlFor={NAME_ID} required>
            <Input
              id={NAME_ID}
              name="name"
              defaultValue={initial?.name ?? ''}
              required
            />
          </Field>

          <Field label="Enabled">
            <Switch checked={enabled} onChange={setEnabled} />
          </Field>

          <Field label="Priority" htmlFor={PRIORITY_ID}>
            <Input
              id={PRIORITY_ID}
              name="priority"
              type="number"
              step="1"
              defaultValue={initial?.priority ?? 0}
            />
          </Field>

          <div>
            <Text variant="h6" style={{ marginBottom: 8 }}>Conditions</Text>
            <FilterBuilder
              fields={fields}
              value={draft}
              onChange={(d) => setDraft(d as FilterDraftGroup)}
            />
          </div>

          <div>
            <Text variant="h6" style={{ marginBottom: 8 }}>Actions</Text>
            <Flex direction="column" gap={4}>
              <Field label="Tags to add" htmlFor={TAGS_ID}>
                <Input
                  id={TAGS_ID}
                  name="tags"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="e.g. coffee, treat"
                />
              </Field>
              <Field label="Set type">
                <Select
                  aria-label="Set type"
                  value={setType}
                  onChange={(e) => setSetType(e.target.value as '' | 'income' | 'expense')}
                  options={[
                    { value: '', label: '— no change —' },
                    { value: 'income', label: 'Income' },
                    { value: 'expense', label: 'Expense' },
                  ]}
                />
              </Field>
            </Flex>
          </div>

          <Flex justify="flex-end" gap={4}>
            <Button type="button" variant="ghost" onClick={() => router.push('/rules')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Spinner size="sm" /> Saving...</> : isEdit ? 'Save Changes' : 'Create Rule'}
            </Button>
          </Flex>
        </Flex>
        </Form>
      </Card>
    </>
  );
}
