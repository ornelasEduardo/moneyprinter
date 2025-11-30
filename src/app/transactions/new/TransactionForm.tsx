'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { createTransaction } from '@/app/actions/transactions';
import { X, Receipt, Plus } from 'lucide-react';
import { Button, Card, Form, FormGroup, Input, Label, Page, Select } from '@design-system';

interface Account {
  id: number;
  name: string;
}

interface TransactionFormProps {
  accounts: Account[];
}


export default function TransactionForm({ accounts }: TransactionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get('year');

  const handleCancel = () => {
    if (year) {
      router.push(`/?tab=transactions&year=${year}`);
    } else {
      router.back();
    }
  };

  const accountOptions = accounts.map(acc => ({
    value: acc.id,
    label: acc.name
  }));

  return (
    <Page>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem', position: 'relative' }}>
          <Button
            variant="ghost"
            onClick={handleCancel}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              padding: '0.5rem',
              fontSize: '1.25rem',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.5} />
          </Button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'var(--primary)', 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '8px',
              fontSize: '1.5rem',
              margin: '0 auto 1rem auto',
              border: '2px solid #000',
              boxShadow: '4px 4px 0 #000'
            }}>
              <Receipt size={24} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Add Transaction</h1>
            <p className="text-muted">Record a new expense or income</p>
          </div>
        </header>

        <Card>
          <Form action={createTransaction}>
            <input type="hidden" name="year" value={year || ''} />
            <FormGroup>
              <Label>Type</Label>
              <Select
                name="type"
                options={[
                  { value: 'expense', label: 'Expense' },
                  { value: 'income', label: 'Income' }
                ]}
                defaultValue="expense"
                style={{ width: '100%' }}
              />
            </FormGroup>

            <FormGroup>
              <Label>Description</Label>
              <Input 
                name="name" 
                type="text" 
                placeholder="e.g. Grocery Store, Salary, Rent"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>Amount</Label>
              <div style={{ position: 'relative' }}>
                <span style={{ 
                  position: 'absolute', 
                  left: '1rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  color: 'var(--muted-foreground)'
                }}>$</span>
                <Input 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  required
                  style={{ paddingLeft: '2rem' }}
                />
              </div>
            </FormGroup>

            <FormGroup>
              <Label>Date</Label>
              <Input 
                name="date" 
                type="date" 
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </FormGroup>

            <FormGroup>
              <Label>Tags</Label>
              <Input 
                name="tags" 
                type="text" 
                placeholder="e.g. Food, Housing, Transport"
              />
            </FormGroup>

            <FormGroup>
              <Label>Account</Label>
              <Select 
                name="accountId"
                required
                options={accountOptions}
                style={{ width: '100%' }}
              />
            </FormGroup>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <Button 
                type="button"
                variant="ghost"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Plus size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                Add Transaction
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </Page>
  );
}
