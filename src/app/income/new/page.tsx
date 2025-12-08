'use client';

import {  useRouter, useSearchParams } from 'next/navigation';
import { createIncomeSource } from '@/app/actions/income';
import { Button, Card, Flex, Input, Page, Select, Text } from 'doom-design-system';
import { X, Banknote, Plus } from 'lucide-react';


export default function AddIncomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get('year');

  const handleCancel = () => {
    if (year) {
      router.push(`/?tab=budget&year=${year}`);
    } else {
      router.back();
    }
  };

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
              color: 'var(--muted-foreground)'
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
              color: 'var(--primary-foreground)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '8px',
              fontSize: '1.5rem',
              margin: '0 auto 1rem auto',
              border: 'var(--border-width) solid var(--card-border)',
              boxShadow: 'var(--shadow-hard)'
            }}>
              <Banknote size={24} strokeWidth={2.5} />
            </div>
            <Text variant="h1" align="center" className="mb-2">Add Income Source</Text>
            <Text color="muted" align="center">Track your recurring income</Text>
          </div>
        </header>

        <Card>
          <form action={createIncomeSource} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <input type="hidden" name="year" value={year || ''} />
            <div>
              <Text as="label" weight="bold" className="mb-2 block">Income Name</Text>
              <Input 
                name="name" 
                type="text" 
                placeholder="e.g. Salary, Freelance, RSUs"
                required
              />
            </div>

            <div>
              <Text as="label" weight="bold" className="mb-2 block">Amount</Text>
              <Input 
                name="amount" 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                required
                startAdornment="$"
              />
            </div>

            <div>
              <Text as="label" weight="bold" className="mb-2 block">Type</Text>
              <Select 
                name="type"
                required
                options={[
                  { value: 'paycheck', label: 'Paycheck' },
                  { value: 'bonus', label: 'Bonus' },
                  { value: 'rsu', label: 'RSU' },
                  { value: 'espp', label: 'ESPP' },
                  { value: 'other', label: 'Other' }
                ]}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <Text as="label" weight="bold" className="mb-2 block">Frequency</Text>
              <Select 
                name="frequency"
                required
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'bi-weekly', label: 'Bi-weekly' },
                  { value: 'semi-monthly', label: 'Semi-monthly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annually', label: 'Annually' },
                  { value: 'one-time', label: 'One-time' }
                ]}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <Text as="label" weight="bold" className="mb-2 block">Next Payment Date (Optional)</Text>
              <Input 
                name="next_date" 
                type="date" 
              />
            </div>

            <Flex justify="space-between" style={{ marginTop: '1rem' }}>
              <Button 
                type="button"
                variant="ghost"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Plus size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                Add Income Source
              </Button>
            </Flex>
          </form>
        </Card>
      </div>
    </Page>
  );
}
