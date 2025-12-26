"use client";

import React, { useMemo, useState, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { deleteAccount, updateAccount } from "@/app/actions/accounts";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Flex,
  Input,
  Form,
  Field,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
  Table,
  Text,
  Tooltip,
  useToast,
} from "doom-design-system";
import { Pencil, Trash2, Plus } from "lucide-react";

import { SafeAccount } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

type Account = SafeAccount;

interface AccountsTableProps {
  accounts: Account[];
}

function formatCurrency(amount: number, currency: string | null = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

export default function AccountsTable({ accounts }: AccountsTableProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);

  const handleDelete = useCallback((id: number) => {
    setAccountToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (accountToDelete === null) return;

    try {
      await deleteAccount(accountToDelete);
      toastSuccess("Account deleted successfully");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete account:", err);
      toastError("Failed to delete account");
    } finally {
      setAccountToDelete(null);
    }
  }, [accountToDelete, router, toastError, toastSuccess]);

  const handleEditClick = useCallback((account: Account) => {
    setEditingAccount(account);
    setIsEditModalOpen(true);
  }, []);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAccount) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateAccount(editingAccount.id, formData);
      toastSuccess("Account updated successfully");
      setIsEditModalOpen(false);
      setEditingAccount(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to update account:", err);
      toastError("Failed to update account");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (info) => <Text weight="bold">{info.getValue() as string}</Text>,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: (info) => (
          <Badge variant="secondary" className="capitalize">
            {info.getValue() as string}
          </Badge>
        ),
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: (info) => (
          <Text weight="bold" color="primary">
            {formatCurrency(
              info.getValue() as number,
              info.row.original.currency
            )}
          </Text>
        ),
      },
      {
        accessorKey: "last_updated",
        header: "Last Updated",
        cell: (info) => <Text>{formatDate(info.getValue() as string)}</Text>,
      },
      {
        id: "actions",
        header: "",
        cell: (info) => (
          <Flex gap={2} justify="flex-end" className="row-actions">
            <Tooltip content="Edit account">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(info.row.original)}
                aria-label="Edit account"
              >
                <Pencil size={16} strokeWidth={2.5} />
              </Button>
            </Tooltip>
            <Tooltip content="Delete account">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(info.row.original.id)}
                className="text-error"
                aria-label="Delete account"
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </Button>
            </Tooltip>
          </Flex>
        ),
      },
    ],
    [handleDelete, handleEditClick]
  );

  return (
    <>
      <Card>
        <Flex
          justify="space-between"
          align="center"
          wrap
          gap={4}
          className="mb-6"
        >
          <Text variant="h4">Accounts</Text>
          <Button onClick={() => router.push("/accounts/new")}>
            <Plus size={16} strokeWidth={2.5} className="mr-2" />
            Add Account
          </Button>
        </Flex>

        <Table
          data={accounts}
          columns={columns}
          enablePagination={false}
          enableFiltering={true}
          variant="flat"
          striped
        />
      </Card>

      {editingAccount && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        >
          <ModalHeader>
            <Text variant="h5" className="mb-0" style={{ color: "inherit" }}>
              Edit Account
            </Text>
          </ModalHeader>
          <ModalBody>
            <Form id="edit-account-form" onSubmit={handleUpdate}>
              <Flex direction="column" gap={4}>
                <Field label="Account Name" required>
                  <Input
                    name="name"
                    defaultValue={editingAccount.name}
                    required
                    placeholder="e.g. Chase Checking"
                  />
                </Field>

                <Field label="Type">
                  <Select
                    name="type"
                    defaultValue={editingAccount.type}
                    options={[
                      { value: "checking", label: "Checking" },
                      { value: "savings", label: "Savings" },
                      { value: "investment", label: "Investment" },
                      { value: "credit", label: "Credit Card" },
                      { value: "loan", label: "Loan" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                </Field>

                <Field label="Current Balance" required>
                  <Input
                    name="balance"
                    type="number"
                    step="0.01"
                    defaultValue={editingAccount.balance}
                    required
                  />
                </Field>

                <Field label="Currency">
                  <Select
                    name="currency"
                    defaultValue={editingAccount.currency || "USD"}
                    options={[
                      { value: "USD", label: "USD ($)" },
                      { value: "EUR", label: "EUR (€)" },
                      { value: "GBP", label: "GBP (£)" },
                      { value: "CAD", label: "CAD ($)" },
                    ]}
                  />
                </Field>
              </Flex>
            </Form>
          </ModalBody>
          <ModalFooter>
            <Flex justify="flex-end" gap={4}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-account-form"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </Flex>
          </ModalFooter>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Account"
        message="Are you sure you want to delete this account? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
