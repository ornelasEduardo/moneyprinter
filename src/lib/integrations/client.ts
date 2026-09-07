import prisma from '@/lib/prisma';
import { integrationRegistry } from './registry';

async function isEnabled(userId: number, enabledKey: string): Promise<boolean> {
  const row = await prisma.user_settings.findUnique({
    where: { user_id_key: { user_id: userId, key: enabledKey } },
  });
  return row?.value === 'true';
}

// The single outbound path. Enforces opt-in + host allowlist, then records the
// egress locally BEFORE the request leaves. No integration calls fetch directly.
export async function governedFetch(
  userId: number,
  integrationId: string,
  url: string,
  purpose: string,
  init?: RequestInit,
): Promise<Response> {
  const integration = integrationRegistry[integrationId];
  if (!integration) throw new Error(`Unknown integration: ${integrationId}`);

  if (!(await isEnabled(userId, integration.enabledKey))) {
    throw new Error(`Integration '${integrationId}' is not enabled`);
  }

  const host = new URL(url).host;
  if (!integration.allowedHosts.includes(host)) {
    throw new Error(`Host '${host}' is not allowlisted for integration '${integrationId}'`);
  }

  await prisma.integration_audit.create({
    data: { user_id: userId, integration_id: integrationId, host, purpose },
  });

  return fetch(url, init);
}
