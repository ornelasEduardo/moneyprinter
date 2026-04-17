'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Field,
  Flex,
  Form,
  Input,
  Modal,
  Spinner,
  Text,
  useToast,
} from 'doom-design-system';
import { createTransfer, updateTransfer, deleteTransfer } from '@/app/actions/transfers';

export interface TransferModalAccount {
  id: number;
  name: string;
}

export interface TransferModalInitial {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transfer_date: string; // ISO yyyy-mm-dd
  note?: string | null;
  tags?: string | null;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: TransferModalAccount[];
  initial?: TransferModalInitial | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// Field ids used for htmlFor/id association so getByLabelText resolves in tests.
const FROM_ID = 'transfer-from-account';
const TO_ID = 'transfer-to-account';
const AMOUNT_ID = 'transfer-amount';
const DATE_ID = 'transfer-date';
const NOTE_ID = 'transfer-note';
const TAGS_ID = 'transfer-tags';

export default function TransferModal({
  isOpen,
  onClose,
  accounts,
  initial,
}: TransferModalProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();

  const [fromId, setFromId] = useState<string>(
    initial ? String(initial.from_account_id) : ''
  );
  const [toId, setToId] = useState<string>(
    initial ? String(initial.to_account_id) : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const isEdit = Boolean(initial);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIsLoading(true);
    try {
      if (isEdit && initial) {
        await updateTransfer(initial.id, fd);
        toastSuccess('Transfer updated');
      } else {
        await createTransfer(fd);
        toastSuccess('Transfer created');
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save transfer';
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    setIsLoading(true);
    try {
      await deleteTransfer(initial.id);
      toastSuccess('Transfer deleted');
      onClose();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete transfer';
      toastError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header>
        <Text variant="h5" className="mb-0" style={{ color: 'inherit' }}>
          {isEdit ? 'Edit Transfer' : 'New Transfer'}
        </Text>
      </Modal.Header>
      <Modal.Body>
        <Form id="transfer-form" onSubmit={handleSubmit}>
          <Flex direction="column" gap={4}>
            <Field label="From" htmlFor={FROM_ID} required>
              <select
                id={FROM_ID}
                name="fromAccountId"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select account…
                </option>
                {accounts.map((a) => (
                  <option
                    key={a.id}
                    value={String(a.id)}
                    disabled={String(a.id) === toId}
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To" htmlFor={TO_ID} required>
              <select
                id={TO_ID}
                name="toAccountId"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select account…
                </option>
                {accounts.map((a) => (
                  <option
                    key={a.id}
                    value={String(a.id)}
                    disabled={String(a.id) === fromId}
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount" htmlFor={AMOUNT_ID} required>
              <Input
                id={AMOUNT_ID}
                name="amount"
                type="number"
                step="any"
                min="0.01"
                defaultValue={initial?.amount ?? ''}
                required
              />
            </Field>
            <Field label="Date" htmlFor={DATE_ID} required>
              <Input
                id={DATE_ID}
                name="transferDate"
                type="date"
                defaultValue={initial?.transfer_date ?? todayIso()}
                required
              />
            </Field>
            <Field label="Note" htmlFor={NOTE_ID}>
              <Input
                id={NOTE_ID}
                name="note"
                defaultValue={initial?.note ?? ''}
                placeholder="e.g. Monthly savings sweep"
              />
            </Field>
            <Field label="Tags" htmlFor={TAGS_ID}>
              <Input
                id={TAGS_ID}
                name="tags"
                defaultValue={initial?.tags ?? ''}
                placeholder="e.g. savings"
              />
            </Field>
          </Flex>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Flex justify="space-between" align="center" style={{ width: '100%' }}>
          <div>
            {isEdit && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isLoading}
              >
                Delete
              </Button>
            )}
          </div>
          <Flex gap={4}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" form="transfer-form" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size="sm" /> Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Transfer'
              )}
            </Button>
          </Flex>
        </Flex>
      </Modal.Footer>
    </Modal>
  );
}
