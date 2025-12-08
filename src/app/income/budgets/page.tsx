'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useRef } from 'react';
import { saveIncomeBudgets, getBudgetsForIncomeSource, getIncomeSources } from '@/app/actions/budgets';
import { X, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Button, Card, Flex, Grid, Input, Page, Select, Table, Tabs, TabsBody, TabsContent, TabsList, TabsTrigger, Text, Textarea } from 'doom-design-system';

interface Budget {
  id: string;
  name: string;
  unit: 'percentage' | 'fixed';
  value: number;
  type: 'savings' | 'investment' | 'expense';
  increasesNetWorth: boolean;
}

export default function IncomeBudgetPage() {
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

  const [paycheckAmount, setPaycheckAmount] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'csv'>('table');
  
  const [incomeSources, setIncomeSources] = useState<{ id: number; name: string; type: string; amount: number }[]>([]);
  const [selectedIncomeSourceId, setSelectedIncomeSourceId] = useState<string>('');
  
  const [isEditingPaycheck, setIsEditingPaycheck] = useState(false);
  const paycheckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paycheckRef.current && !paycheckRef.current.contains(event.target as Node)) {
        setIsEditingPaycheck(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load income sources on mount
  useEffect(() => {
    async function loadSources() {
      try {
        const sources = await getIncomeSources();
        setIncomeSources(sources);
        if (sources.length > 0) {
          // Default to the first source if none selected, or try to find "Primary Paycheck"
          const defaultSource = sources.find(s => s.name === 'Primary Paycheck') || sources[0];
          setSelectedIncomeSourceId(defaultSource.id.toString());
        }
      } catch (error) {
        console.error('Failed to load income sources:', error);
      }
    }
    loadSources();
  }, []);

  // Load budgets when selected source changes
  useEffect(() => {
    if (!selectedIncomeSourceId) return;

    async function loadData() {
      setLoading(true);
      try {
        const data = await getBudgetsForIncomeSource(parseInt(selectedIncomeSourceId));
        setPaycheckAmount(data.paycheckAmount.toString());
        setBudgets(data.budgets);
      } catch (error) {
        console.error('Failed to load budgets:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedIncomeSourceId]);

  // Sync CSV content when switching to CSV mode or when allocations change (if we want live sync, but maybe only on mode switch is safer to avoid overwriting user edits in CSV mode)
  // Let's sync when entering CSV mode.
  useEffect(() => {
    if (viewMode === 'csv') {
      const csv = budgets.map(a => {
        const valStr = a.unit === 'percentage' ? `${a.value}%` : `$${a.value}`;
        return `${a.name}, ${valStr}, ${a.type}`;
      }).join('\n');
      setCsvContent(csv);
    }
  }, [viewMode, budgets]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!selectedIncomeSourceId) throw new Error('No income source selected');
      
      await saveIncomeBudgets(
        parseInt(selectedIncomeSourceId),
        parseFloat(paycheckAmount) || 0,
        budgets.map(a => ({
          name: a.name,
          unit: a.unit,
          value: a.value,
          type: a.type,
          increasesNetWorth: a.increasesNetWorth
        }))
      );
      alert('Configuration saved successfully!');
      if (year) {
        router.push(`/?tab=budget&year=${year}`);
      } else {
        router.push('/?tab=budget');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCSVImport = () => {
    const lines = csvContent.trim().split('\n');
    const newBudgets: Budget[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) continue; // Relaxed check, category optional

      const name = parts[0];
      let valueStr = parts[1];
      let unit: 'percentage' | 'fixed' = 'fixed';
      
      if (valueStr.endsWith('%')) {
        unit = 'percentage';
        valueStr = valueStr.replace('%', '');
      } else if (valueStr.startsWith('$')) {
        valueStr = valueStr.replace('$', '');
      }
      
      const value = parseFloat(valueStr);
      const typeStr = parts[2]?.toLowerCase() || 'expense';
      
      let type: Budget['type'] = 'expense';
      if (['savings', 'investment', 'expense'].includes(typeStr)) {
        type = typeStr as Budget['type'];
      }

      if (name && !isNaN(value)) {
        newBudgets.push({
          id: crypto.randomUUID(),
          name,
          unit,
          value,
          type,
          increasesNetWorth: ['savings', 'investment'].includes(type)
        });
      }
    }
    
    if (newBudgets.length > 0) {
      setBudgets(newBudgets);
      setViewMode('table');
    } else {
      alert('No valid budget items found in CSV');
    }
  };
  
  const addBudget = () => {
    const newBudget: Budget = {
      id: crypto.randomUUID(), // Changed to crypto.randomUUID()
      name: '',
      unit: 'percentage',
      value: 0,
      type: 'expense',
      increasesNetWorth: false
    };
    setBudgets(prev => [...prev, newBudget]);
  };

  const updateBudget = (id: string, field: keyof Budget, value: any) => {
    setBudgets(prev => prev.map(a => {
      if (a.id !== id) return a;
      
      const updates: Partial<Budget> = { [field]: value };
      
      // Auto-update increasesNetWorth if type changes
      if (field === 'type') {
        const cat = value as Budget['type'];
        updates.increasesNetWorth = ['savings', 'investment'].includes(cat);
      }
      
      return { ...a, ...updates };
    }));
  };

  const removeBudget = (id: string) => {
    setBudgets(prev => prev.filter(a => a.id !== id));
  };

  const columns = useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => (
          <Input
            value={info.getValue() as string}
            onChange={(e) => updateBudget(info.row.original.id, 'name', e.target.value)}
            placeholder="Name"
          />
        ),
        size: 250,
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: (info) => (
          <Select
            value={info.getValue() as string}
            onChange={(e) => updateBudget(info.row.original.id, 'unit', e.target.value)}
            options={[
              { value: 'percentage', label: 'Percentage' },
              { value: 'fixed', label: 'Fixed Amount' }
            ]}
          />
        ),
        size: 150,
      },
      {
        accessorKey: 'value',
        header: 'Amount',
        cell: (info) => (
          <Input
            type="number"
            step="0.01"
            value={info.getValue() as number || ''}
            onChange={(e) => updateBudget(info.row.original.id, 'value', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            startAdornment={info.row.original.unit === 'fixed' ? '$' : undefined}
            endAdornment={info.row.original.unit === 'percentage' ? '%' : undefined}
          />
        ),
        size: 150,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (info) => (
          <Select
            value={info.getValue() as string}
            onChange={(e) => updateBudget(info.row.original.id, 'type', e.target.value)}
            options={[
              { value: 'savings', label: 'Savings' },
              { value: 'investment', label: 'Investment' },
              { value: 'expense', label: 'Expense' }
            ]}
          />
        ),
        size: 200,
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button
            variant="ghost"
            onClick={() => removeBudget(info.row.original.id)}
            style={{ color: 'var(--error)', padding: '0.5rem' }}
          >
            <X size={20} strokeWidth={2.5} />
          </Button>
        ),
        size: 50,
      },
    ],
    []
  );

  const calculateNetWorthIncrease = () => {
    const amount = parseFloat(paycheckAmount) || 0;
    return budgets.reduce((sum, a) => {
      if (!a.increasesNetWorth) return sum;
      if (a.unit === 'percentage') {
        return sum + (amount * a.value / 100);
      }
      return sum + a.value;
    }, 0);
  };

  const calculateRemaining = () => {
    const amount = parseFloat(paycheckAmount) || 0;
    const allocated = budgets.reduce((sum, a) => {
      if (a.unit === 'percentage') {
        return sum + (amount * a.value / 100);
      }
      return sum + a.value;
    }, 0);
    return amount - allocated;
  };

  const remaining = calculateRemaining();
  const netWorthIncrease = calculateNetWorthIncrease();

  if (loading) {
    return (
      <Page>
        <div style={{ textAlign: 'center' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <header style={{ marginBottom: '2rem', position: 'relative' }}>
        <Button
          variant="ghost"
          onClick={handleCancel}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            padding: '0.5rem',
            fontSize: '1.5rem',
            lineHeight: 1
          }}
          aria-label="Close"
        >
          <X size={20} strokeWidth={2.5} />
        </Button>
        <div style={{ textAlign: 'center' }}>
          <Text variant="h1" weight="bold" align="center" className="mb-2">Income Budget</Text>
          <Text color="muted" align="center">Define how your paycheck is distributed</Text>
        </div>
      </header>

      <Grid columns="1fr 350px" gap="2rem">
        {/* Left Column: Inputs */}
        <Flex direction="column" gap="2rem">
          {incomeSources.length > 0 && (
            <Card>
              <Text variant="h4" className="mb-4">Income Source</Text>
              <Select
                value={selectedIncomeSourceId}
                onChange={(e) => setSelectedIncomeSourceId(e.target.value)}
                options={incomeSources.map(s => ({
                  value: s.id.toString(),
                  label: `${s.name} (${s.type})`
                }))}
              />
            </Card>
          )}

          <Card>
            <Text variant="h4" className="mb-4">Paycheck Amount</Text>
            <div ref={paycheckRef}>
              {isEditingPaycheck ? (
                <Input
                  autoFocus
                  type="number"
                  step="0.01"
                  placeholder="Enter your paycheck amount"
                  value={paycheckAmount}
                  onChange={(e) => setPaycheckAmount(e.target.value)}
                  startAdornment="$"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    padding: '1rem',
                    paddingLeft: '2.5rem'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingPaycheck(false);
                  }}
                />
              ) : (
                <div
                  onClick={() => setIsEditingPaycheck(true)}
                  style={{
                    fontSize: '3rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    padding: '0.5rem 0',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: '3.5rem',
                    transition: 'all 0.2s ease',
                    color: 'var(--primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    const icon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                    if (icon) icon.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    const icon = e.currentTarget.querySelector('.edit-icon') as HTMLElement;
                    if (icon) icon.style.opacity = '0';
                  }}
                >
                  ${paycheckAmount ? parseFloat(paycheckAmount).toFixed(2) : '0.00'}
                  <Pencil 
                    size={14} 
                    strokeWidth={2.5} 
                    className="edit-icon"
                    style={{ 
                      fontSize: '1.25rem',
                      marginLeft: '0.75rem', 
                      opacity: 0, 
                      transition: 'opacity 0.2s ease',
                      color: 'inherit',
                      marginBottom: '0.25rem'
                    }} 
                  />
                </div>
              )}
            </div>
          </Card>

          <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'table' | 'csv')} className="w-full">
            <Flex justify="space-between" align="center" style={{ marginBottom: '-2px', paddingLeft: '0.5rem', position: 'relative' }}>
              <Text variant="h4">Budgets</Text>
              <TabsList>
                <TabsTrigger value="table">Table View</TabsTrigger>
                <TabsTrigger value="csv">CSV Editor</TabsTrigger>
              </TabsList>
            </Flex>

            <TabsBody style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, minHeight: 'auto', marginTop: 0 }}>
              <TabsContent value="table">
                <Table 
                  data={budgets} 
                  columns={columns} 
                  enablePagination={false}
                  enableFiltering={false}
                  enableSorting={false}
                />
                <Button 
                  className="mt-3 p-4 w-full"
                  onClick={addBudget} 
                  variant="ghost" 
                  style={{ 
                    border: 'var(--border-width) dashed var(--card-border)',
                    borderRadius: 'var(--radius)',
                    justifyContent: 'center'
                  }}
                >
                  + Add Budget Item
                </Button>
              </TabsContent>

              <TabsContent value="csv">
                <Card style={{ borderTopLeftRadius: 0 }}>
                  <div style={{ padding: '1rem' }}>
                    <Text color="muted" variant="small" className="mb-2 block">
                      Edit your budgets as CSV. Format: <code>Name, Amount, Type</code>
                    </Text>
                    <Text color="muted" variant="small" className="mb-4 block">
                      Example: <code>401k, 20%, savings</code> or <code>Netflix, $15, expense</code>
                    </Text>
                    <Textarea
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      style={{
                        minHeight: '300px',
                        fontFamily: 'monospace',
                        marginBottom: '1rem'
                      }}
                    />
                    <Button onClick={handleCSVImport} variant="primary">
                      Apply CSV Changes
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </TabsBody>
          </Tabs>
        </Flex>

        {/* Right Column: Sticky Summary */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <Card>
            <Text variant="h4" className="mb-6 pb-2" style={{ borderBottom: 'var(--border-width) solid var(--card-border)' }}>Summary</Text>
            
            <Flex direction="column" gap="1.5rem" style={{ marginBottom: '2rem' }}>
              <Flex justify="space-between" align="center">
                <Text color="muted">Total Paycheck</Text>
                <Text weight="bold" variant="h5">
                  ${parseFloat(paycheckAmount || '0').toFixed(2)}
                </Text>
              </Flex>
              
              <Flex justify="space-between" align="center">
                <Text color="muted">Net Worth +</Text>
                <Text weight="bold" variant="h5" color="success">
                  +${netWorthIncrease.toFixed(2)}
                </Text>
              </Flex>
              
              <div style={{ height: '1px', background: 'var(--card-border)' }} />

              <Flex justify="space-between" align="center">
                <Text color="muted">Remaining</Text>
                <Text weight="bold" style={{ fontSize: '1.5rem' }} color={remaining < 0 ? 'error' : undefined}>
                  ${remaining.toFixed(2)}
                </Text>
              </Flex>
            </Flex>
            
            <Flex direction="column" gap="0.75rem">
              <Button 
                variant="primary"
                onClick={handleSave}
                disabled={saving || !paycheckAmount || budgets.length === 0}
                style={{ width: '100%' }}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button 
                onClick={handleCancel}
                variant="ghost"
                disabled={saving}
                style={{ width: '100%' }}
              >
                Cancel
              </Button>
            </Flex>
          </Card>
        </div>
      </Grid>
    </Page>
  );
}
