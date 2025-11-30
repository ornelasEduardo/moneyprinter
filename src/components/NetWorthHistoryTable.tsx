'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { updateNetWorthEntry, deleteNetWorthEntry, createNetWorthEntry } from '@/app/actions/networth';
import { Button, Flex, Input, Modal, Table, Text, useToast } from '@design-system';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface NetWorthEntry {
  id: number;
  date: string;
  netWorth: number;
}

interface NetWorthHistoryTableProps {
  entries: NetWorthEntry[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function NetWorthHistoryTable({ entries }: NetWorthHistoryTableProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const [editingEntry, setEditingEntry] = useState<NetWorthEntry | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const filteredEntries = useMemo(() => {
    let result = entries;
    
    // Filter by date range
    if (startDate) {
      result = result.filter(e => e.date >= startDate);
    }
    if (endDate) {
      result = result.filter(e => e.date <= endDate);
    }
    
    return result;
  }, [entries, startDate, endDate]);

  const handleEditClick = (entry: NetWorthEntry) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleAddClick = () => {
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteNetWorthEntry(id);
        toastSuccess('Net worth entry deleted successfully');
        router.refresh();
      } catch (err) {
        console.error('Failed to delete entry:', err);
        toastError('Failed to delete entry');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEntry) return;

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateNetWorthEntry(editingEntry.id, formData);
      toastSuccess('Net worth entry updated successfully');
      setIsEditModalOpen(false);
      setEditingEntry(null);
      router.refresh();
    } catch (err) {
      console.error('Failed to update entry:', err);
      toastError('Failed to update entry');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createNetWorthEntry(formData);
      toastSuccess('Net worth entry created successfully');
      setIsAddModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error('Failed to create entry:', err);
      toastError('Failed to create entry');
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<NetWorthEntry>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => formatDate(info.getValue() as string),
      },
      {
        accessorKey: 'netWorth',
        header: 'Net Worth',
        cell: (info) => formatCurrency(info.getValue() as number),
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <Flex gap="0.5rem" justify="flex-end" className="row-actions">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleEditClick(info.row.original)}
            >
              <Pencil size={16} strokeWidth={2.5} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDeleteClick(info.row.original.id)}
              className="text-error"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </Button>
          </Flex>
        ),
      },
    ],
    [handleDeleteClick, handleEditClick]
  );

  return (
    <>
      <Flex justify="space-between" align="center" className="mb-4" wrap gap="1rem">
        <Text variant="h4">Net Worth History</Text>
        
        <Button onClick={handleAddClick}>
          <Plus size={16} strokeWidth={2.5} className="mr-2" />
          Add Entry
        </Button>
      </Flex>

      <Table 
        data={filteredEntries} 
        columns={columns}
        enablePagination={true}
        enableFiltering={true}
        enableSorting={true}
        pageSize={20}
        striped
        toolbarContent={
          <Flex gap="0.5rem" align="center">
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              style={{ width: 'auto' }}
              placeholder="Start Date"
            />
            <Text color="muted">-</Text>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              style={{ width: 'auto' }}
              placeholder="End Date"
            />
          </Flex>
        }
      />

      {/* Edit Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Net Worth Entry"
      >
        {editingEntry && (
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="1rem">
              <div>
                <Input
                  label="Date"
                  type="date"
                  name="date"
                  defaultValue={editingEntry.date}
                  required
                />
              </div>

              <div>
                <Input
                  label="Net Worth"
                  type="number"
                  step="0.01"
                  name="netWorth"
                  defaultValue={editingEntry.netWorth}
                  startAdornment="$"
                  required
                />
              </div>

              <Flex gap="0.5rem" justify="flex-end">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Modal>

      {/* Add Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Add Net Worth Entry"
      >
        <form onSubmit={handleCreate}>
          <Flex direction="column" gap="1rem">
            <div>
              <Input
                label="Date"
                type="date"
                name="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <Input
                label="Net Worth"
                type="number"
                step="0.01"
                name="netWorth"
                startAdornment="$"
                placeholder="0.00"
                required
              />
            </div>

            <Flex gap="0.5rem" justify="flex-end">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsAddModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Entry'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Modal>
    </>
  );
}
