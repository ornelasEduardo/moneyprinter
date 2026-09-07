'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Stack,
  Flex,
  Input,
  Button,
  Select,
  ToggleGroup,
  ToggleGroupItem,
  Checkbox,
  Badge,
} from 'doom-design-system';
import {
  getPlanningColConfig,
  savePlanningColConfig,
  getIntegrationAudit,
  type ColConfigView,
  type IntegrationAuditRow,
} from '@/app/actions/integrations';
import { BEA_COL } from '@/lib/integrations/registry';
import { METROS } from '@/lib/planning/metros';

const TIER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'high', label: 'High' },
  { value: 'veryHigh', label: 'Very High' },
  { value: 'extreme', label: 'Extreme' },
];

export default function IntegrationsSettings() {
  const [cfg, setCfg] = useState<ColConfigView | null>(null);
  const [beaKey, setBeaKey] = useState('');
  const [audit, setAudit] = useState<IntegrationAuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPlanningColConfig().then(setCfg).catch(() => {});
    getIntegrationAudit(BEA_COL.id).then(setAudit).catch(() => {});
  }, []);

  // The egress disclosure must render even before config has loaded, so the
  // user can always inspect what would leave the machine before opting in.
  const egressNotice = (
    <Text data-testid="col-egress" color="muted">
      {BEA_COL.egress}
    </Text>
  );

  if (!cfg) {
    return (
      <Card className="mb-2">
        <Text color="muted">Loading…</Text>
        {egressNotice}
      </Card>
    );
  }

  const onSave = async () => {
    setError(null);
    setSaved(false);
    try {
      await savePlanningColConfig({
        mode: cfg.mode,
        tier: cfg.tier,
        front: cfg.front,
        back: cfg.back,
        region: cfg.region,
        beaEnabled: cfg.beaEnabled,
        // A blank key field means "keep the stored key" — never overwrite it with empty.
        ...(beaKey ? { beaKey } : {}),
      });
      setBeaKey('');
      setSaved(true);
    } catch (e) {
      setSaved(false);
      setError(e instanceof Error ? e.message : 'Could not save');
    }
  };

  return (
    <Stack gap={4}>
      <div>
        <Text variant="h6" weight="bold">
          Mode
        </Text>
        {/* ToggleGroup doesn't forward arbitrary DOM attributes (no ...rest spread on
            its root), so the testid goes on a wrapping element instead. */}
        <div data-testid="col-mode">
          <ToggleGroup
            type="single"
            value={cfg.mode}
            onValueChange={(v) =>
              setCfg((c) => (c ? { ...c, mode: (v as 'manual' | 'bea') || c.mode } : c))
            }
            aria-label="Cost of living mode"
          >
            <ToggleGroupItem value="manual">Manual</ToggleGroupItem>
            <ToggleGroupItem value="bea">BEA</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {cfg.mode === 'manual' && (
        <Stack gap={3}>
          <Select
            label="Tier"
            options={TIER_OPTIONS}
            value={cfg.tier ?? 'standard'}
            onChange={(e) => setCfg((c) => (c ? { ...c, tier: e.target.value } : c))}
            data-testid="col-tier"
          />
          <Flex gap={3}>
            <Input
              type="number"
              label="Custom front cap"
              placeholder="0.40"
              value={cfg.front ?? ''}
              onChange={(e) =>
                setCfg((c) =>
                  c ? { ...c, front: e.target.value === '' ? undefined : Number(e.target.value) } : c
                )
              }
              data-testid="col-front"
            />
            <Input
              type="number"
              label="Custom back cap"
              placeholder="0.40"
              value={cfg.back ?? ''}
              onChange={(e) =>
                setCfg((c) =>
                  c ? { ...c, back: e.target.value === '' ? undefined : Number(e.target.value) } : c
                )
              }
              data-testid="col-back"
            />
          </Flex>
          <Text variant="small" color="muted">
            Custom front/back caps override the selected tier when both are set.
          </Text>
        </Stack>
      )}

      {cfg.mode === 'bea' && (
        <Stack gap={3}>
          <Select
            label="Metro area"
            options={[{ value: '', label: 'Select your metro…' }, ...METROS.map((m) => ({ value: m.fips, label: m.name }))]}
            value={cfg.region ?? ''}
            onChange={(e) => setCfg((c) => (c ? { ...c, region: e.target.value } : c))}
            data-testid="col-region"
          />
          <Input
            type="password"
            label="BEA API key"
            placeholder={cfg.hasBeaKey ? 'key saved' : ''}
            value={beaKey}
            onChange={(e) => setBeaKey(e.target.value)}
            data-testid="col-bea-key"
          />
          <Checkbox
            label="Enable BEA integration"
            checked={cfg.beaEnabled}
            onChange={(e) => setCfg((c) => (c ? { ...c, beaEnabled: e.target.checked } : c))}
            data-testid="col-bea-enable"
          />
          <Flex gap={2} align="center">
            <Badge variant="outline">Declared egress</Badge>
            {egressNotice}
          </Flex>
        </Stack>
      )}

      {/* Egress disclosure is always visible, even in manual mode, so the user can
          read exactly what BEA would receive before ever switching modes. */}
      {cfg.mode !== 'bea' && egressNotice}

      <Flex gap={3} align="center">
        <Button variant="primary" onClick={onSave} data-testid="col-save">
          Save
        </Button>
        {saved && (
          <Text color="success" variant="small">
            Saved.
          </Text>
        )}
      </Flex>

      {error && (
        <Text data-testid="col-error" color="error">
          {error}
        </Text>
      )}

      <div>
        <Text variant="h6" weight="bold">
          Egress audit log
        </Text>
        <Stack gap={1} data-testid="col-audit">
          {audit.length === 0 ? (
            <Text color="muted">Nothing has left your machine yet.</Text>
          ) : (
            audit.map((row) => (
              <Text key={row.id} variant="small">
                {row.host} — {row.purpose}
              </Text>
            ))
          )}
        </Stack>
      </div>
    </Stack>
  );
}
