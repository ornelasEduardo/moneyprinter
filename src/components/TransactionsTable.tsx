import React, { useMemo, useState, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import {
  updateTransaction,
  deleteTransaction,
} from "@/app/actions/transactions";
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
  RadioGroup,
  RadioGroupItem,
  Select,
  Spinner,
  Table,
  Text,
  Tooltip,
  useToast,
} from "doom-design-system";
import { Pencil, Trash2, Plus } from "lucide-react";

import { Serialized, Transaction as PrismaTransaction } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Transaction
  extends Serialized<
    Pick<PrismaTransaction, "id" | "name" | "amount" | "date" | "tags" | "type">
  > {
  accountId: number | null;
  accountName?: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  selectedYear: number;
  accounts?: { id: number; name: string }[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string) {
  // Append T00:00:00 to force local time interpretation instead of UTC
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TransactionsTable({
  transactions,
  selectedYear,
  accounts = [],
}: TransactionsTableProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(
    null
  );

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Filter by account
    if (selectedAccount !== "all") {
      result = result.filter((t) => t.accountName === selectedAccount);
    }

    // Filter by date range
    if (startDate) {
      result = result.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      result = result.filter((t) => t.date <= endDate);
    }

    return result;
  }, [transactions, selectedAccount, startDate, endDate]);

  const handleEditClick = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((id: number) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (transactionToDelete === null) return;

    try {
      await deleteTransaction(transactionToDelete);
      toastSuccess("Transaction deleted successfully");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      toastError("Failed to delete transaction");
    } finally {
      setTransactionToDelete(null);
    }
  }, [transactionToDelete, router, toastError, toastSuccess]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateTransaction(editingTransaction.id, formData);
      toastSuccess("Transaction updated successfully");
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to update transaction:", err);
      toastError("Failed to update transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => (
          <Text weight="medium">{formatDate(info.getValue() as string)}</Text>
        ),
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: (info) => (
          <Text weight="medium">{info.getValue() as string}</Text>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: (info) => {
          const type = (info.getValue() as string) || "expense";
          return (
            <Badge
              variant={type === "income" ? "success" : "secondary"}
              className="text-xs"
            >
              {type}
            </Badge>
          );
        },
      },
      {
        accessorKey: "accountName",
        header: "Account",
        cell: (info) => (
          <Text weight="medium">{(info.getValue() as string) || "-"}</Text>
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: (info) => {
          const value = info.getValue() as string;
          if (!value) return null;
          return (
            <Flex gap={1} wrap={true}>
              {value.split(",").map((tag, i) => (
                <Badge key={i} variant="primary" className="text-xs">
                  {tag.trim()}
                </Badge>
              ))}
            </Flex>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: (info) => (
          <Text weight="bold" align="right" as="div">
            {formatCurrency(info.getValue() as number)}
          </Text>
        ),
        meta: {
          style: { textAlign: "right" },
        },
      },
      {
        id: "actions",
        header: "",
        cell: (info) => (
          <Flex gap={2} justify="flex-end" className="row-actions">
            <Tooltip content="Edit transaction">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(info.row.original)}
                aria-label="Edit transaction"
              >
                <Pencil size={16} strokeWidth={2.5} />
              </Button>
            </Tooltip>
            <Tooltip content="Delete transaction">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteClick(info.row.original.id)}
                className="text-error"
                aria-label="Delete transaction"
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </Button>
            </Tooltip>
          </Flex>
        ),
      },
    ],
    [handleDeleteClick, handleEditClick]
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
          <Text variant="h4">Transactions ({selectedYear})</Text>

          <Flex gap={4} align="center">
            <Button
              onClick={() =>
                router.push(`/transactions/new?year=${selectedYear}`)
              }
            >
              <Plus size={16} strokeWidth={2.5} className="mr-2" />
              Add
            </Button>
          </Flex>
        </Flex>

        <Table
          data={filteredTransactions}
          columns={columns}
          enablePagination={true}
          enableFiltering={true}
          pageSize={10}
          variant="flat"
          striped
          toolbarContent={
            <Flex gap={4} align="center" wrap>
              <Flex gap={2} align="center">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: "auto" }}
                  placeholder="Start Date"
                />
                <Text color="muted">-</Text>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: "auto" }}
                  placeholder="End Date"
                />
              </Flex>

              <div className="w-fit">
                <Select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  options={[
                    { value: "all", label: "All Accounts" },
                    ...accounts.map((acc) => ({
                      value: acc.name,
                      label: acc.name,
                    })),
                  ]}
                />
              </div>
            </Flex>
          }
        />
      </Card>

      {editingTransaction && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        >
          <ModalHeader>
            <Text variant="h5" className="mb-0" style={{ color: "inherit" }}>
              Edit Transaction
            </Text>
          </ModalHeader>
          <ModalBody>
            <Form id="edit-transaction-form" onSubmit={handleUpdate}>
              <Flex direction="column" gap={4}>
                <Field label="Name" required>
                  <Input
                    name="name"
                    defaultValue={editingTransaction.name}
                    required
                  />
                </Field>

                <Field label="Type">
                  <RadioGroup
                    name="type"
                    defaultValue={editingTransaction.type || "expense"}
                  >
                    <RadioGroupItem value="expense">Expense</RadioGroupItem>
                    <RadioGroupItem value="income">Income</RadioGroupItem>
                  </RadioGroup>
                </Field>

                <Field label="Amount" required>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={editingTransaction.amount}
                    required
                  />
                </Field>

                <Field label="Date" required>
                  <Input
                    name="date"
                    type="date"
                    defaultValue={editingTransaction.date}
                    required
                  />
                </Field>

                <Field label="Tags">
                  <Input
                    name="tags"
                    defaultValue={editingTransaction.tags || ""}
                    placeholder="e.g. Food, Travel"
                  />
                </Field>

                <Field label="Account">
                  <Select
                    name="accountId"
                    defaultValue={
                      editingTransaction.accountId?.toString() || ""
                    }
                    options={accounts.map((acc) => ({
                      value: acc.id.toString(),
                      label: acc.name,
                    }))}
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
                form="edit-transaction-form"
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
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
