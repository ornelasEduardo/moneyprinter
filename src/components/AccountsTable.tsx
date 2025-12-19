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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Table,
  Text,
  useToast,
} from "doom-design-system";
import { Pencil, Trash2, Plus } from "lucide-react";

import { SafeAccount } from "@/lib/types";

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

  const handleDelete = useCallback(
    async (id: number) => {
      if (
        confirm(
          "Are you sure you want to delete this account? This action cannot be undone."
        )
      ) {
        try {
          await deleteAccount(id);
          toastSuccess("Account deleted successfully");
          router.refresh();
        } catch (err) {
          console.error("Failed to delete account:", err);
          toastError("Failed to delete account");
        }
      }
    },
    [router, toastError, toastSuccess]
  );

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
          <Flex gap="0.5rem" justify="flex-end" className="row-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(info.row.original)}
              aria-label="Edit account"
            >
              <Pencil size={16} strokeWidth={2.5} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(info.row.original.id)}
              className="text-error"
              aria-label="Delete account"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </Button>
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
          gap="1rem"
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

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        {editingAccount && (
          <form onSubmit={handleUpdate}>
            <ModalHeader>Edit Account</ModalHeader>
            <ModalBody>
              <Flex direction="column" gap="1rem">
                <div>
                  <Input
                    label="Account Name"
                    name="name"
                    defaultValue={editingAccount.name}
                    required
                    placeholder="e.g. Chase Checking"
                  />
                </div>

                <div>
                  <Select
                    label="Type"
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
                </div>

                <div>
                  <Input
                    label="Current Balance"
                    name="balance"
                    type="number"
                    step="0.01"
                    defaultValue={editingAccount.balance}
                    required
                  />
                </div>

                <div>
                  <Text as="label" weight="bold" className="mb-2 block">
                    Currency
                  </Text>
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
                </div>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Flex justify="flex-end" gap="1rem">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </Flex>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </>
  );
}
