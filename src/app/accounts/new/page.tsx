'use client';

import {  useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount } from '@/app/actions/accounts';
import { Badge, Button, Card, Flex, Input, Page, Select, Text } from '@design-system';
import { X, Wallet, SquarePen, Zap, ArrowRight, ArrowLeft, Check } from 'lucide-react';


export default function AccountWizard() {
  const [step, setStep] = useState(1);
  const [connectionType, setConnectionType] = useState<'manual' | 'auto' | null>(null);
  const router = useRouter();

  return (
    <Page>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem', position: 'relative' }}>
          <Button
            variant="ghost"
            onClick={() => router.back()}
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
              <Wallet size={24} strokeWidth={2.5} />
            </div>
            <Text variant="h1" align="center" className="mb-2">Add New Account</Text>
            <Text color="muted" align="center">Step {step} of 3</Text>
          </div>
        </header>

        <Card>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Text variant="h4" weight="bold" className="mb-4">How would you like to connect?</Text>
              
              <Card
                as="button"
                onClick={() => setConnectionType('manual')}
                className={`text-left transition-all duration-200 ${connectionType === 'manual' ? 'translate-x-[-2px] translate-y-[-2px]' : 'hover:translate-y-[-2px] hover:shadow-hover'}`}
                style={{
                  border: 'var(--border-width) solid var(--card-border)',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  background: connectionType === 'manual' ? 'var(--background)' : 'transparent',
                  boxShadow: connectionType === 'manual' ? 'var(--shadow-hard)' : 'none',
                  width: '100%'
                }}
              >
                <Flex gap="1rem" align="center">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: 'var(--foreground)', 
                    color: 'var(--background)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                  }}>
                    <SquarePen size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <Text as="div" weight="bold" className="mb-1">Manual Entry</Text>
                    <Text as="div" variant="small" color="muted">Enter account details yourself</Text>
                  </div>
                </Flex>
              </Card>

              <Card
                as="button"
                disabled
                className="text-left opacity-70 cursor-not-allowed"
                style={{
                  border: 'var(--border-width) solid var(--card-border)',
                  padding: '1.5rem',
                  background: 'var(--background)',
                  width: '100%'
                }}
              >
                <Flex gap="1rem" align="center">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    background: 'var(--muted)', 
                    color: 'var(--background)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                  }}>
                    <Zap size={20} strokeWidth={2.5} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Flex justify="space-between" align="center" gap="0.5rem" className="mb-1">
                      <Text weight="bold">Auto Import</Text>
                      <Badge variant="warning">Coming soon</Badge>
                    </Flex>
                    <Text as="div" variant="small" color="muted">Connect your bank directly</Text>
                  </div>
                </Flex>
              </Card>

              <Flex justify="flex-end" style={{ marginTop: '1rem' }}>
                <Button 
                  variant="primary" 
                  disabled={!connectionType}
                  onClick={() => setStep(2)}
                >
                  Next
                  <ArrowRight size={16} strokeWidth={2.5} style={{ marginLeft: '0.5rem' }} />
                </Button>
              </Flex>
            </div>
          )}

          {step === 2 && connectionType === 'manual' && (
            <form action={createAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <Text as="label" weight="bold" className="mb-2 block">Account Name</Text>
                <Input 
                  name="name" 
                  type="text" 
                  placeholder="e.g. Chase Checking"
                  required
                />
              </div>

              <div>
                <Text as="label" weight="bold" className="mb-2 block">Account Type</Text>
                <Select 
                  name="type"
                  required
                  options={[
                    { value: 'checking', label: 'Checking' },
                    { value: 'savings', label: 'Savings' },
                    { value: 'credit', label: 'Credit Card' },
                    { value: 'investment', label: 'Investment' }
                  ]}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <Text as="label" weight="bold" className="mb-2 block">Current Balance</Text>
                  <Input 
                    name="balance" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    required
                    startAdornment="$"
                  />
              </div>

              <Flex justify="space-between" style={{ marginTop: '1rem' }}>
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                  Back
                </Button>
                <Button type="submit" variant="primary">
                  <Check size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                  Create Account
                </Button>
              </Flex>
            </form>
          )}

          {step === 2 && connectionType === 'auto' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Text variant="h3" weight="bold">Integration Coming Soon</Text>
                <Badge variant="warning">Coming Soon</Badge>
              </div>
              <Text color="muted" align="center" className="mb-8">
                We are working on integrating with Plaid to allow automatic imports.
              </Text>
              <Button 
                variant="ghost"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} strokeWidth={2.5} style={{ marginRight: '0.5rem' }} />
                Go Back
              </Button>
            </div>
          )}

        </Card>
      </div>
    </Page>
  );
}
