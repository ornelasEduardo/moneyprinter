'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Flex, Input, Stack, Switch, Text, useToast } from 'doom-design-system';
import { getLlmSettings, saveLlmSettings, type LlmSettingsView } from '@/app/actions/llm';

export default function LlmSettings() {
  const { toastError, toastSuccess } = useToast();
  const [cfg, setCfg] = useState<LlmSettingsView | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    getLlmSettings()
      .then((s) => {
        setCfg(s);
        setEnabled(s.enabled);
        setEndpoint(s.endpoint);
        setModel(s.model);
      })
      .catch(() => {});

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveLlmSettings({ enabled, endpoint, model });
      await load(); // re-check reachability with the saved endpoint
      toastSuccess('LLM settings saved.');
    } catch {
      toastError("Couldn't save — check that the endpoint is a valid URL.");
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return <Text color="muted">Loading…</Text>;

  return (
    <Stack gap={4}>
      <Switch checked={enabled} onChange={setEnabled} label="Enable the local LLM plugin" />
      <Text variant="caption" color="muted">
        Runs entirely on your machine via Ollama — no financial data leaves your device.
      </Text>

      <Input
        label="Ollama endpoint"
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
        placeholder="http://localhost:11434"
      />
      <Input
        label="Model"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder="gpt-oss:20b"
      />

      <Flex align="center" gap={2} wrap>
        <Button variant="primary" onClick={save} disabled={saving} data-testid="llm-save">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {cfg.reachable ? (
          <Badge variant="success">● Connected{cfg.version ? ` · Ollama ${cfg.version}` : ''}</Badge>
        ) : (
          <Badge variant="error">● Not reachable at {cfg.endpoint}</Badge>
        )}
      </Flex>

      {!cfg.reachable && (
        <Text variant="caption" color="muted">
          Start Ollama (<code>ollama serve</code> or <code>brew services start ollama</code>), then Save to re-check.
        </Text>
      )}
    </Stack>
  );
}
