'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClassRules } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import Papa from 'papaparse';
import {
  Button, Card, Text, Stack, Flex, Badge, FileUpload, Select, Modal,
} from 'doom-design-system';
import { Upload, Download, Save, Check } from 'lucide-react';
import { autoDetectColumns, type ColumnMappingEntry } from '@/lib/auto-detect';
import { createPipeline, type ProcessedRow } from '@/lib/pipeline';
import {
  parseDates, normalizeAmounts, skipRows, setDefaults, validateSchema, detectDuplicates,
} from '@/lib/pipeline-steps';
import { commitImportAction } from '@/app/actions/import';
import {
  getImportConfigurations, createImportConfiguration,
} from '@/app/actions/import-config';
import { recordImportHistory } from '@/app/actions/import-history';
import '@/styles/ag-theme-doom.scss';
import styles from './ImportSpreadsheet.module.scss';

ModuleRegistry.registerModules([AllCommunityModule]);

const EMPTY_TRANSACTIONS: Record<string, unknown>[] = [];
const EMPTY_ACCOUNTS: { id: number; name: string }[] = [];

// Transaction fields available for column mapping
const FIELD_OPTIONS = [
  { value: '', label: 'Skip' },
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'name', label: 'Name / Description' },
  { value: 'tags', label: 'Tags / Category' },
  { value: 'type', label: 'Type' },
  { value: 'account_id', label: 'Account' },
];

interface ImportSpreadsheetProps {
  initialData?: Record<string, string>[];
  filename?: string;
  existingTransactions?: Record<string, unknown>[];
  accounts?: { id: number; name: string }[];
}

export default function ImportSpreadsheet({
  initialData,
  filename,
  existingTransactions = EMPTY_TRANSACTIONS,
  accounts = EMPTY_ACCOUNTS,
}: ImportSpreadsheetProps) {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);

  // State
  const [rawData, setRawData] = useState<Record<string, string>[]>(initialData ?? []);
  const [currentFilename, setCurrentFilename] = useState(filename ?? '');
  const [columnMapping, setColumnMapping] = useState<Record<string, ColumnMappingEntry>>({});
  const [behaviors, setBehaviors] = useState<Record<string, unknown>>({});
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [showSaveConfig, setShowSaveConfig] = useState(false);
  const [configName, setConfigName] = useState('');
  const [savedConfigs, setSavedConfigs] = useState<{ id: number; name: string }[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);

  // Load saved configurations
  useEffect(() => {
    getImportConfigurations().then((configs) => {
      setSavedConfigs(configs.map((c) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
  }, []);

  // Auto-detect columns when initialData is provided
  useEffect(() => {
    if (initialData && initialData.length > 0 && Object.keys(columnMapping).length === 0) {
      const detected = autoDetectColumns(initialData);
      setColumnMapping(detected.columns);
      if (Object.keys(detected.detectedBehaviors).length > 0) {
        setBehaviors((prev) => ({ ...prev, ...detected.detectedBehaviors }));
      }
    }
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run preprocessor when data or mapping changes
  useEffect(() => {
    if (rawData.length === 0 || Object.keys(columnMapping).length === 0) return;

    // Map raw CSV data through column mapping
    const mappedRows: ProcessedRow[] = rawData.map((raw) => {
      const data: Record<string, unknown> = {};
      for (const [csvCol, mapping] of Object.entries(columnMapping)) {
        if (mapping.field) {
          data[mapping.field] = raw[csvCol];
        }
      }
      return { data, status: 'valid' as const, tags: [], errors: [] };
    });

    // Build and run pipeline
    const pipeline = createPipeline()
      .use(parseDates)
      .use(normalizeAmounts)
      .use(skipRows)
      .use(setDefaults)
      .use(validateSchema)
      .use(detectDuplicates)
      .build();

    const effectiveBehaviors = {
      ...behaviors,
      ...(defaultAccountId ? { default_account_id: defaultAccountId } : {}),
    };

    const results = pipeline.run(mappedRows, effectiveBehaviors, { existingTransactions });
    setProcessedRows(results);
  }, [rawData, columnMapping, behaviors, existingTransactions, defaultAccountId]);

  // Handle file upload
  const handleFileUpload = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setCurrentFilename(file.name);
    setImportResult(null);

    file.text().then((text) => {
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      setRawData(result.data);

      // Auto-detect columns
      const detected = autoDetectColumns(result.data);
      setColumnMapping(detected.columns);
      if (Object.keys(detected.detectedBehaviors).length > 0) {
        setBehaviors((prev) => ({ ...prev, ...detected.detectedBehaviors }));
      }
    });
  }, []);

  // Handle column mapping change
  const handleMappingChange = useCallback((csvColumn: string, field: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: { ...prev[csvColumn], field: field || null },
    }));
  }, []);

  // Summary counts
  const summary = useMemo(() => {
    const valid = processedRows.filter((r) => r.status === 'valid').length;
    const duplicates = processedRows.filter((r) => r.status === 'duplicate').length;
    const errors = processedRows.filter((r) => r.status === 'error').length;
    const skipped = processedRows.filter((r) => r.status === 'skipped').length;
    return { valid, duplicates, errors, skipped, total: processedRows.length };
  }, [processedRows]);

  // AG Grid column definitions
  const colDefs = useMemo<ColDef[]>(() => {
    if (rawData.length === 0) return [];

    const csvColumns = Object.keys(rawData[0]);
    return [
      {
        headerName: '',
        field: '__status',
        width: 50,
        pinned: 'left' as const,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        cellRenderer: (params: any) => {
          const row = processedRows[params.rowIndex];
          if (!row) return null;
          const icons: Record<string, string> = {
            valid: '✓', duplicate: '⚠', error: '✗', skipped: '—',
          };
          return icons[row.status] || '';
        },
      },
      ...csvColumns.map((col) => ({
        headerName: col,
        field: col,
        editable: true,
        flex: 1,
        minWidth: 120,
      })),
    ];
  }, [rawData, processedRows]);

  // Row class rules for status styling
  const rowClassRules = useMemo<RowClassRules>(() => ({
    'row-valid': (params) => processedRows[params.rowIndex ?? -1]?.status === 'valid',
    'row-duplicate': (params) => processedRows[params.rowIndex ?? -1]?.status === 'duplicate',
    'row-error': (params) => processedRows[params.rowIndex ?? -1]?.status === 'error',
    'row-skipped': (params) => processedRows[params.rowIndex ?? -1]?.status === 'skipped',
  }), [processedRows]);

  // Import selected rows
  const handleImport = useCallback(async () => {
    const selectedNodes = gridRef.current?.api?.getSelectedNodes() ?? [];
    const selectedIndices = new Set(selectedNodes.map((n) => n.rowIndex));
    const rowsToImport = processedRows
      .filter((_, i) => selectedIndices.has(i))
      .filter((r) => r.status === 'valid' || r.status === 'duplicate')
      .map((r) => r.data);

    if (rowsToImport.length === 0) return;

    setIsImporting(true);
    try {
      const result = await commitImportAction('transactions', rowsToImport, 'skip');
      setImportResult(result);

      // Record in history
      const errorRows = processedRows.filter((r) => r.status === 'error');
      await recordImportHistory({
        filename: currentFilename,
        status: errorRows.length > 0 ? 'partial' : 'completed',
        summary: {
          total_rows: processedRows.length,
          imported: result.created + result.updated,
          duplicates_skipped: summary.duplicates,
          validation_errors: summary.errors,
        },
        errors: errorRows.flatMap((r, i) =>
          r.errors.map((e) => ({
            row_number: i + 2,
            field: e.field,
            message: e.message,
            severity: 'error' as const,
          }))
        ),
      });

      router.refresh();
    } finally {
      setIsImporting(false);
    }
  }, [processedRows, currentFilename, summary, router]);

  // Save configuration
  const handleSaveConfig = useCallback(async () => {
    if (!configName.trim()) return;
    await createImportConfiguration({
      name: configName,
      column_mapping: columnMapping,
      behaviors,
    });
    setShowSaveConfig(false);
    setConfigName('');
    // Refresh config list
    const configs = await getImportConfigurations();
    setSavedConfigs(configs.map((c) => ({ id: c.id, name: c.name })));
  }, [configName, columnMapping, behaviors]);

  // No data yet — show upload
  if (rawData.length === 0) {
    return (
      <Card className={styles.uploadCard}>
        <Stack gap={4} align="center">
          <Upload size={32} strokeWidth={2.5} />
          <Text variant="h4" weight="bold">Import Bank Transactions</Text>
          <Text color="muted" align="center">
            Upload a CSV export from your bank. We&apos;ll auto-detect the columns and let you review before importing.
          </Text>

          {savedConfigs.length > 0 && (
            <Select
              label="Use saved configuration"
              value={selectedConfigId ?? ''}
              onChange={(e) => setSelectedConfigId(e.target.value ? Number(e.target.value) : null)}
              options={[
                { value: '', label: 'Auto-detect' },
                ...savedConfigs.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          )}

          <FileUpload
            accept=".csv"
            label="Upload CSV"
            helperText="CSV export from your bank"
            onChange={handleFileUpload}
          />
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap={4}>
      {/* Toolbar */}
      <Card className={styles.toolbar}>
        <Flex align="center" justify="space-between" gap={4} wrap={true}>
          <Flex align="center" gap={3}>
            <Text variant="small" weight="bold">{currentFilename}</Text>
            <Badge variant="success">{summary.valid} valid</Badge>
            {summary.duplicates > 0 && <Badge variant="warning">{summary.duplicates} duplicates</Badge>}
            {summary.errors > 0 && <Badge variant="error">{summary.errors} errors</Badge>}
            {summary.skipped > 0 && <Badge variant="secondary">{summary.skipped} skipped</Badge>}
          </Flex>
          <Flex align="center" gap={2}>
            {accounts.length > 0 && (
              <Select
                size="sm"
                value={defaultAccountId ?? ''}
                onChange={(e) => setDefaultAccountId(e.target.value ? Number(e.target.value) : null)}
                options={[
                  { value: '', label: 'Default account' },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSaveConfig(true)}
            >
              <Save size={14} strokeWidth={2.5} />
              Save Config
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={isImporting || summary.valid === 0}
            >
              <Download size={14} strokeWidth={2.5} />
              {isImporting ? 'Importing...' : `Import ${summary.valid} rows`}
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* Column mapping bar */}
      <Card className={styles.mappingBar}>
        <Flex gap={2} wrap={true} align="center">
          <Text variant="caption" weight="bold" className="uppercase">Column Mapping</Text>
          {Object.entries(columnMapping).map(([csvCol, mapping]) => (
            <Flex key={csvCol} align="center" gap={1} className={styles.mappingChip}>
              <Text variant="caption" color="muted">{csvCol} →</Text>
              <Select
                size="sm"
                value={mapping.field ?? ''}
                onChange={(e) => handleMappingChange(csvCol, e.target.value)}
                options={FIELD_OPTIONS}
              />
            </Flex>
          ))}
        </Flex>
      </Card>

      {/* AG Grid */}
      <div className={`ag-theme-doom ${styles.gridContainer}`}>
        <AgGridReact
          ref={gridRef}
          rowData={rawData}
          columnDefs={colDefs}
          rowSelection="multiple"
          rowClassRules={rowClassRules}
          suppressRowClickSelection
          animateRows={false}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          onGridReady={(params) => {
            // Auto-select valid rows
            params.api.forEachNode((node) => {
              const row = processedRows[node.rowIndex ?? -1];
              if (row?.status === 'valid') {
                node.setSelected(true);
              }
            });
          }}
        />
      </div>

      {/* Import result */}
      {importResult && (
        <Card className={styles.resultCard}>
          <Flex gap={3} align="center">
            <Check size={20} strokeWidth={2.5} />
            <Text weight="bold">Import complete</Text>
            <Badge variant="success">{importResult.created} created</Badge>
            {importResult.updated > 0 && <Badge variant="warning">{importResult.updated} updated</Badge>}
            {importResult.skipped > 0 && <Badge variant="secondary">{importResult.skipped} skipped</Badge>}
          </Flex>
        </Card>
      )}

      {/* Save config modal */}
      <Modal isOpen={showSaveConfig} onClose={() => setShowSaveConfig(false)}>
        <Modal.Header>
          <Text variant="h4">Save Import Configuration</Text>
        </Modal.Header>
        <Modal.Body>
          <Stack gap={3}>
            <Text color="muted">
              Save the current column mapping and settings so you can reuse them next time you import from this bank.
            </Text>
            <input
              className={styles.configInput}
              type="text"
              placeholder="e.g., Chase Checking"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              autoFocus
            />
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Flex justify="flex-end" gap={2}>
            <Button variant="ghost" onClick={() => setShowSaveConfig(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={!configName.trim()}>Save</Button>
          </Flex>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
