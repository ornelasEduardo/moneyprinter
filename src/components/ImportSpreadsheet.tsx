'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowClassRules } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import Papa from 'papaparse';
import {
  Button, Card, Popover, Slat, Text, Stack, Flex, Badge, FileUpload, Select, Modal, Switch, useToast,
} from 'doom-design-system';
import { Upload, Download, Settings2, Check, ArrowRight, FileSpreadsheet, Columns3, ScanSearch, Trash2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { autoDetectColumns, type ColumnMappingEntry } from '@/lib/auto-detect';
import { createPipeline, type ProcessedRow } from '@/lib/pipeline';
import {
  parseDates, normalizeAmounts, skipRows, setDefaults, validateSchema, detectDuplicates,
} from '@/lib/pipeline-steps';
import { commitImportAction } from '@/app/actions/import';
import {
  getImportConfigurations, createImportConfiguration, deleteImportConfiguration,
} from '@/app/actions/import-config';
import { recordImportHistory } from '@/app/actions/import-history';
import '@/styles/ag-theme-doom.scss';
import styles from './ImportSpreadsheet.module.scss';

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Constants ────────────────────────────────────────────

const EMPTY_TRANSACTIONS: Record<string, unknown>[] = [];
const EMPTY_ACCOUNTS: { id: number; name: string }[] = [];

const SUPPORTED_FORMATS = {
  extensions: ['.csv', '.tsv', '.txt'],
  mimeTypes: ['text/csv', 'text/tab-separated-values', 'text/plain'],
};
const ACCEPT_STRING = [...SUPPORTED_FORMATS.extensions, ...SUPPORTED_FORMATS.mimeTypes].join(',');

const FIELD_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'name', label: 'Name / Description' },
  { value: 'tags', label: 'Tags / Category' },
  { value: 'type', label: 'Type' },
  { value: 'account_id', label: 'Account' },
];

function fieldLabel(value: string | null): string | undefined {
  return FIELD_OPTIONS.find((o) => o.value === value)?.label;
}

// ── Types ────────────────────────────────────────────────

interface ImportSpreadsheetProps {
  initialData?: Record<string, string>[];
  filename?: string;
  existingTransactions?: Record<string, unknown>[];
  accounts?: { id: number; name: string }[];
}

interface ImportSummary {
  valid: number;
  duplicates: number;
  errors: number;
  skipped: number;
  total: number;
}

interface ErrorGroup {
  field: string;
  message: string;
  count: number;
}

// ── Sub-components ───────────────────────────────────────

function MappingHeader(props: any) {
  const { displayName, mappedField, onHeaderClick, csvColumn } = props;
  return (
    <div
      className={styles.mappingHeader}
      onClick={(e) => { e.stopPropagation(); onHeaderClick(csvColumn); }}
    >
      <span className={styles.mappingHeaderLabel}>{displayName}</span>
      {mappedField ? (
        <span className={styles.mappingHeaderBadge}>{fieldLabel(mappedField)}</span>
      ) : (
        <span className={styles.mappingHeaderSkipped}>skip</span>
      )}
    </div>
  );
}

function UploadLanding({
  savedConfigs,
  selectedConfigId,
  onConfigChange,
  onFileUpload,
}: {
  savedConfigs: { id: number; name: string }[];
  selectedConfigId: number | null;
  onConfigChange: (id: number | null) => void;
  onFileUpload: (files: File[]) => void;
}) {
  return (
    <div className={styles.uploadPage}>
      <a href="/" className={styles.uploadBackLink}><Logo size={28} /></a>
      <div className={styles.uploadHero}>
        <Text variant="h2" weight="bold" className={styles.uploadTitle}>Import Transactions</Text>
        <Text color="muted" className={styles.uploadSubtitle}>
          Drop a CSV from your bank and we'll take it from there.
        </Text>
      </div>

      <div className={styles.uploadDropArea}>
        <FileUpload accept={ACCEPT_STRING} onChange={onFileUpload} />
      </div>

      {savedConfigs.length > 0 && (
        <div className={styles.uploadConfigs}>
          <Select
            label="Use a saved config"
            size="sm"
            value={selectedConfigId ?? ''}
            onChange={(e) => onConfigChange(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Auto-detect' },
              ...savedConfigs.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      )}

      <ImportSteps />
    </div>
  );
}

function ImportSteps() {
  const steps = [
    { icon: <FileSpreadsheet size={20} strokeWidth={2.5} />, label: 'Upload', desc: "Your bank's CSV" },
    { icon: <Columns3 size={20} strokeWidth={2.5} />, label: 'Map', desc: "We'll guess the columns" },
    { icon: <ScanSearch size={20} strokeWidth={2.5} />, label: 'Review', desc: 'Spot dupes and errors' },
    { icon: <Check size={20} strokeWidth={2.5} />, label: 'Import', desc: 'Add to your transactions' },
  ];

  return (
    <div className={styles.uploadSteps}>
      {steps.map((step, i) => (
        <div key={step.label} style={{ display: 'contents' }}>
          {i > 0 && <ArrowRight size={16} className={styles.uploadStepArrow} />}
          <div className={styles.uploadStep}>
            <div className={styles.uploadStepIcon}>{step.icon}</div>
            <div>
              <Text weight="bold" variant="small">{step.label}</Text>
              <Text color="muted" variant="caption">{step.desc}</Text>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorPopover({
  summary,
  errorGroups,
  isOpen,
  onToggle,
  onClose,
}: {
  summary: ImportSummary;
  errorGroups: ErrorGroup[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-start"
      trigger={
        <button className={styles.errorBadgeButton} onClick={onToggle}>
          <Badge variant="error">{summary.errors} errors</Badge>
        </button>
      }
      content={
        <div className={styles.errorPopover}>
          <Stack gap={0}>
            {errorGroups.slice(0, 5).map((group, i) => (
              <Slat
                key={i}
                label={group.field || 'Row'}
                secondaryLabel={group.message}
                appendContent={<Badge variant="error">{group.count}</Badge>}
              />
            ))}
          </Stack>
          {errorGroups.length > 5 && (
            <Text variant="caption" color="muted" align="center" className={styles.errorPopoverFooter}>
              +{errorGroups.length - 5} more error type{errorGroups.length - 5 !== 1 ? 's' : ''}
            </Text>
          )}
        </div>
      }
    />
  );
}

function ColumnConfigModal({
  column,
  columnMapping,
  rawData,
  onMappingChange,
  onClose,
}: {
  column: string;
  columnMapping: Record<string, ColumnMappingEntry>;
  rawData: Record<string, string>[];
  onMappingChange: (col: string, field: string) => void;
  onClose: () => void;
}) {
  const isSkipped = !columnMapping[column]?.field;
  return (
    <Modal isOpen onClose={onClose}>
      <Modal.Header>
        <Text weight="bold">{column} column</Text>
      </Modal.Header>
      <Modal.Body>
        <Stack gap={4}>
          <Stack gap={1}>
            <Text variant="caption" color="muted">Here's what's in this column</Text>
            <div className={styles.sampleValues}>
              {rawData.slice(0, 5).map((row, i) => (
                <Text key={i} variant="small" className={styles.sampleValue}>{row[column] || '-'}</Text>
              ))}
            </div>
          </Stack>
          <Switch
            label="Skip this one"
            checked={isSkipped}
            onChange={(checked) => onMappingChange(column, checked ? '' : FIELD_OPTIONS[0].value)}
          />
          {!isSkipped && (
            <Select
              label="Maps to"
              value={columnMapping[column]?.field ?? ''}
              onChange={(e) => onMappingChange(column, e.target.value)}
              options={FIELD_OPTIONS}
            />
          )}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Flex justify="flex-end">
          <Button onClick={onClose}>Done</Button>
        </Flex>
      </Modal.Footer>
    </Modal>
  );
}

function ConfigModal({
  isOpen,
  columnMapping,
  defaultAccountId,
  accounts,
  configName,
  savedConfigs,
  onConfigNameChange,
  onSave,
  onDelete,
  onApply,
  onClose,
}: {
  isOpen: boolean;
  columnMapping: Record<string, ColumnMappingEntry>;
  defaultAccountId: number | null;
  accounts: { id: number; name: string }[];
  configName: string;
  savedConfigs: { id: number; name: string }[];
  onConfigNameChange: (name: string) => void;
  onSave: () => void;
  onDelete: (id: number) => void;
  onApply: (id: number) => void;
  onClose: () => void;
}) {
  const activeMappings = Object.entries(columnMapping).filter(([, m]) => m.field);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header>
        <Text weight="bold">Column Configs</Text>
      </Modal.Header>
      <Modal.Body>
        <Stack gap={6}>
          <Stack gap={2}>
            <Text variant="caption" color="muted">Current mapping</Text>
            <div className={styles.configSummary}>
              {activeMappings.map(([csv, m]) => (
                <Flex key={csv} gap={2} align="center">
                  <Text variant="small" color="muted">{csv}</Text>
                  <Text variant="small">→</Text>
                  <Text variant="small" weight="bold">{fieldLabel(m.field) ?? m.field}</Text>
                </Flex>
              ))}
              {defaultAccountId && (
                <Flex gap={2} align="center">
                  <Text variant="small" color="muted">Default account</Text>
                  <Text variant="small">→</Text>
                  <Text variant="small" weight="bold">
                    {accounts.find((a) => a.id === defaultAccountId)?.name ?? `#${defaultAccountId}`}
                  </Text>
                </Flex>
              )}
              {activeMappings.length === 0 && (
                <Text variant="small" color="muted">No columns mapped yet</Text>
              )}
            </div>
          </Stack>

          <Stack gap={2}>
            <Text variant="caption" color="muted">Save this mapping for next time</Text>
            <Flex gap={2}>
              <input
                className={styles.configInput}
                type="text"
                placeholder="e.g., Chase Checking"
                value={configName}
                onChange={(e) => onConfigNameChange(e.target.value)}
              />
              <Button onClick={onSave} disabled={!configName.trim()}>Save</Button>
            </Flex>
          </Stack>

          {savedConfigs.length > 0 && (
            <Stack gap={2}>
              <Text variant="caption" color="muted">Saved configurations</Text>
              <Stack gap={0}>
                {savedConfigs.map((config) => (
                  <Slat
                    key={config.id}
                    label={config.name}
                    appendContent={
                      <Flex gap={2}>
                        <Button size="sm" variant="ghost" onClick={() => onApply(config.id)}>Apply</Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(config.id)}>
                          <Trash2 size={14} strokeWidth={2.5} />
                        </Button>
                      </Flex>
                    }
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Flex justify="flex-end">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </Flex>
      </Modal.Footer>
    </Modal>
  );
}


// ── Pipeline helpers ─────────────────────────────────────

function mapRawToPipelineRows(
  rawData: Record<string, string>[],
  columnMapping: Record<string, ColumnMappingEntry>,
): ProcessedRow[] {
  return rawData.map((raw) => {
    const data: Record<string, unknown> = {};
    for (const [csvCol, mapping] of Object.entries(columnMapping)) {
      if (mapping.field) data[mapping.field] = raw[csvCol];
    }
    return { data, status: 'valid' as const, tags: [], errors: [] };
  });
}

function runPipeline(
  rows: ProcessedRow[],
  behaviors: Record<string, unknown>,
  existingTransactions: Record<string, unknown>[],
): ProcessedRow[] {
  const pipeline = createPipeline()
    .use(parseDates)
    .use(normalizeAmounts)
    .use(skipRows)
    .use(setDefaults)
    .use(validateSchema)
    .use(detectDuplicates)
    .build();
  return pipeline.run(rows, behaviors, { existingTransactions });
}

function summarizeRows(rows: ProcessedRow[]): ImportSummary {
  const valid = rows.filter((r) => r.status === 'valid').length;
  const duplicates = rows.filter((r) => r.status === 'duplicate').length;
  const errors = rows.filter((r) => r.status === 'error').length;
  const skipped = rows.filter((r) => r.status === 'skipped').length;
  return { valid, duplicates, errors, skipped, total: rows.length };
}

function groupErrors(rows: ProcessedRow[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();
  rows
    .filter((r) => r.status === 'error')
    .forEach((r) => r.errors.forEach((e) => {
      const key = `${e.field}::${e.message}`;
      const existing = groups.get(key);
      if (existing) existing.count++;
      else groups.set(key, { field: e.field, message: e.message, count: 1 });
    }));
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

// ── Grid column builder ──────────────────────────────────

function buildColDefs(
  rawData: Record<string, string>[],
  processedRows: ProcessedRow[],
  columnMapping: Record<string, ColumnMappingEntry>,
  onHeaderClick: (col: string) => void,
): ColDef[] {
  if (rawData.length === 0) return [];
  const csvColumns = Object.keys(rawData[0]);
  return [
    {
      headerName: '',
      field: '__status',
      width: 60,
      pinned: 'left' as const,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      resizable: false,
      tooltipValueGetter: (params: any) => {
        const row = processedRows[params.rowIndex];
        if (!row) return '';
        if (row.status === 'error' && row.errors.length > 0) {
          return row.errors.map((e) => `${e.field}: ${e.message}`).join('\n');
        }
        if (row.status === 'duplicate') return 'Looks like a duplicate';
        return '';
      },
    },
    ...csvColumns.map((col) => ({
      headerName: col,
      field: col,
      editable: true,
      flex: 1,
      minWidth: 150,
      headerComponent: MappingHeader,
      headerComponentParams: {
        csvColumn: col,
        mappedField: columnMapping[col]?.field ?? null,
        onHeaderClick,
      },
    })),
  ];
}

function buildRowClassRules(processedRows: ProcessedRow[]): RowClassRules {
  return {
    'row-valid': (params) => processedRows[params.rowIndex ?? -1]?.status === 'valid',
    'row-duplicate': (params) => processedRows[params.rowIndex ?? -1]?.status === 'duplicate',
    'row-error': (params) => processedRows[params.rowIndex ?? -1]?.status === 'error',
    'row-skipped': (params) => processedRows[params.rowIndex ?? -1]?.status === 'skipped',
  };
}

// ── Main component ───────────────────────────────────────

export default function ImportSpreadsheet({
  initialData,
  filename,
  existingTransactions = EMPTY_TRANSACTIONS,
  accounts = EMPTY_ACCOUNTS,
}: ImportSpreadsheetProps) {
  const router = useRouter();
  const gridRef = useRef<AgGridReact>(null);

  // Data state
  const [rawData, setRawData] = useState<Record<string, string>[]>(initialData ?? []);
  const [currentFilename, setCurrentFilename] = useState(filename ?? '');
  const [columnMapping, setColumnMapping] = useState<Record<string, ColumnMappingEntry>>({});
  const [behaviors, setBehaviors] = useState<Record<string, unknown>>({});
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);

  const { toastSuccess, toastError } = useToast();

  // UI state
  const [isImporting, setIsImporting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState('');
  const [savedConfigs, setSavedConfigs] = useState<{ id: number; name: string }[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [configuringColumn, setConfiguringColumn] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  // Derived data
  const summary = useMemo(() => summarizeRows(processedRows), [processedRows]);
  const errorGroups = useMemo(() => groupErrors(processedRows), [processedRows]);
  const colDefs = useMemo(
    () => buildColDefs(rawData, processedRows, columnMapping, setConfiguringColumn),
    [rawData, processedRows, columnMapping],
  );
  const rowClassRules = useMemo(() => buildRowClassRules(processedRows), [processedRows]);

  // ── Effects ──────────────────────────────────────────

  // Select valid rows whenever processed results change
  const autoSelectRows = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api || processedRows.length === 0) return;
    api.forEachNode((node) => {
      const row = processedRows[node.rowIndex ?? -1];
      node.setSelected(row?.status === 'valid');
    });
    setSelectedCount(api.getSelectedNodes().length);
  }, [processedRows]);

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

  // Run pipeline when data or config changes
  useEffect(() => {
    if (rawData.length === 0 || Object.keys(columnMapping).length === 0) return;
    const mapped = mapRawToPipelineRows(rawData, columnMapping);
    const effectiveBehaviors = {
      ...behaviors,
      ...(defaultAccountId ? { default_account_id: defaultAccountId } : {}),
    };
    setProcessedRows(runPipeline(mapped, effectiveBehaviors, existingTransactions));
  }, [rawData, columnMapping, behaviors, existingTransactions, defaultAccountId]);

  // ── Handlers ─────────────────────────────────────────

  const handleFileUpload = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setCurrentFilename(file.name);
    file.text().then((text) => {
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      setRawData(result.data);
      const detected = autoDetectColumns(result.data);
      setColumnMapping(detected.columns);
      if (Object.keys(detected.detectedBehaviors).length > 0) {
        setBehaviors((prev) => ({ ...prev, ...detected.detectedBehaviors }));
      }
    });
  }, []);

  const handleMappingChange = useCallback((csvColumn: string, field: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: { ...prev[csvColumn], field: field || null },
    }));
  }, []);

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
          r.errors.map((e) => ({ row_number: i + 2, field: e.field, message: e.message, severity: 'error' as const }))
        ),
      });

      const parts = [`${result.created} imported`];
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
      toastSuccess(parts.join(', '));

      router.push('/?tab=transactions');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Import failed');
      setIsImporting(false);
    }
  }, [processedRows, currentFilename, summary, router]);

  const handleSaveConfig = useCallback(async () => {
    if (!configName.trim()) return;
    await createImportConfiguration({
      name: configName,
      column_mapping: columnMapping,
      behaviors: { ...behaviors, ...(defaultAccountId ? { default_account_id: defaultAccountId } : {}) },
    });
    setConfigName('');
    const configs = await getImportConfigurations();
    setSavedConfigs(configs.map((c) => ({ id: c.id, name: c.name })));
  }, [configName, columnMapping, behaviors, defaultAccountId]);

  const handleDeleteConfig = useCallback(async (id: number) => {
    await deleteImportConfiguration(id);
    const configs = await getImportConfigurations();
    setSavedConfigs(configs.map((c) => ({ id: c.id, name: c.name })));
  }, []);

  const refreshConfigs = useCallback(async () => {
    const configs = await getImportConfigurations();
    setSavedConfigs(configs.map((c) => ({ id: c.id, name: c.name })));
  }, []);

  // ── Render ───────────────────────────────────────────

  if (rawData.length === 0) {
    return (
      <UploadLanding
        savedConfigs={savedConfigs}
        selectedConfigId={selectedConfigId}
        onConfigChange={setSelectedConfigId}
        onFileUpload={handleFileUpload}
      />
    );
  }

  return (
    <div className={styles.editorPage}>
      <div className={styles.topBar}>
        <Flex align="center" gap={0}>
          <a href="/" className={styles.backLink}><Logo size={22} /></a>
          <Flex align="center" gap={3} className={styles.topBarInfo}>
            <Text weight="bold" variant="small">{currentFilename}</Text>
            <Badge variant="success">{summary.valid} valid</Badge>
            {summary.duplicates > 0 && <Badge variant="warning">{summary.duplicates} duplicates</Badge>}
            {summary.errors > 0 && (
              <ErrorPopover
                summary={summary}
                errorGroups={errorGroups}
                isOpen={showErrorDetail}
                onToggle={() => setShowErrorDetail(!showErrorDetail)}
                onClose={() => setShowErrorDetail(false)}
              />
            )}
            {summary.skipped > 0 && <Badge variant="secondary">{summary.skipped} skipped</Badge>}
          </Flex>
        </Flex>
        <Flex align="center" gap={3}>
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
          <Button size="sm" variant="ghost" onClick={() => setShowConfigModal(true)}>
            <Settings2 size={14} strokeWidth={2.5} />
            Configs
          </Button>
          <Button size="sm" onClick={handleImport} disabled={isImporting || selectedCount === 0}>
            <Download size={14} strokeWidth={2.5} />
            {isImporting ? 'Importing...' : `Import ${selectedCount} rows`}
          </Button>
        </Flex>
      </div>

      <div className={`ag-theme-doom ${styles.gridContainer}`}>
        <AgGridReact
          ref={gridRef}
          rowData={rawData}
          columnDefs={colDefs}
          rowSelection="multiple"
          rowClassRules={rowClassRules}
          suppressRowClickSelection
          animateRows={false}
          headerHeight={44}
          tooltipShowDelay={300}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          onFirstDataRendered={autoSelectRows}
          onRowDataUpdated={autoSelectRows}
          onSelectionChanged={(e) => setSelectedCount(e.api.getSelectedNodes().length)}
        />
      </div>

      {configuringColumn && (
        <ColumnConfigModal
          column={configuringColumn}
          columnMapping={columnMapping}
          rawData={rawData}
          onMappingChange={handleMappingChange}
          onClose={() => setConfiguringColumn(null)}
        />
      )}

      <ConfigModal
        isOpen={showConfigModal}
        columnMapping={columnMapping}
        defaultAccountId={defaultAccountId}
        accounts={accounts}
        configName={configName}
        savedConfigs={savedConfigs}
        onConfigNameChange={setConfigName}
        onSave={handleSaveConfig}
        onDelete={handleDeleteConfig}
        onApply={(id) => { setSelectedConfigId(id); setShowConfigModal(false); }}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
