'use client';

import {  useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAccount } from '@/app/actions/accounts';
import { Badge, Button, Card, Flex, Input, Page, Select } from '@design-system';
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
              <Wallet size={24} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Add New Account</h1>
            <p className="text-muted">Step {step} of 3</p>
          </div>
        </header>

        <Card>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>How would you like to connect?</h2>
              
              <button 
                style={{ 
                  display: 'flex',
                  justifyContent: 'flex-start', 
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.5rem', 
                  border: 'var(--border-width) solid #000000',
                  borderRadius: 'var(--radius)',
                  background: connectionType === 'manual' ? 'var(--background)' : 'transparent',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: connectionType === 'manual' ? 'var(--shadow-hard)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  top: connectionType === 'manual' ? '-2px' : '0',
                  left: connectionType === 'manual' ? '-2px' : '0'
                }}
                onClick={() => setConnectionType('manual')}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: '#000', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  <SquarePen size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Manual Entry</div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Enter account details yourself</div>
                </div>
              </button>

              <button 
                style={{ 
                  display: 'flex',
                  justifyContent: 'flex-start', 
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.5rem', 
                  border: 'var(--border-width) solid #000000',
                  borderRadius: 'var(--radius)',
                  background: '#f9fafb',
                  color: 'var(--muted-foreground)',
                  cursor: 'not-allowed',
                  textAlign: 'left',
                  opacity: 0.7
                }}
                disabled
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  background: 'var(--muted)', 
                  color: '#fff', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  <Zap size={20} strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Auto Import</div>
                    <Badge variant="warning">Coming soon</Badge>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>Connect your bank directly</div>
                </div>
              </button>

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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Account Name</label>
                <Input 
                  name="name" 
                  type="text" 
                  placeholder="e.g. Chase Checking"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Account Type</label>
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>Current Balance</label>
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
                    name="balance" 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    required
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Integration Coming Soon</h2>
                <Badge variant="warning">Coming Soon</Badge>
              </div>
              <p className="text-muted" style={{ marginBottom: '2rem' }}>
                We are working on integrating with Plaid to allow automatic imports.
              </p>
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
