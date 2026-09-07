export interface Integration {
  id: string;
  label: string;
  allowedHosts: string[];
  egress: string;          // plain-English: what leaves the machine
  credentialKey?: string;  // user_settings key holding the user's own credential
  enabledKey: string;      // user_settings key holding 'true' | 'false'
}

export const BEA_COL: Integration = {
  id: 'bea-col',
  label: 'BEA Cost-of-Living (Regional Price Parities)',
  allowedHosts: ['apps.bea.gov'],
  egress: 'The metropolitan region you selected — a public data request. No financial data.',
  credentialKey: 'integration.bea-col.key',
  enabledKey: 'integration.bea-col.enabled',
};

export const integrationRegistry: Record<string, Integration> = {
  [BEA_COL.id]: BEA_COL,
};
