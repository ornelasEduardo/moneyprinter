import type { PlanKind } from './registry';

// Client-safe catalog of Plan tools for the hub. Kept separate from the
// compute-heavy PlanDefinition so importing it into the client bundle never
// drags in server context. Add a tool = add an entry; add a life-area = a new
// `group`. Drives the hub's Tools zone and every "which tool is this?" route.
export interface PlanTool {
  kind: PlanKind;
  label: string;
  description: string;
  group: string; // life-area, e.g. "Housing"
  tab: string; // ?tab= target that opens the tool
  amountLabel: string; // what a saved plan's target amount represents
  icon: 'home';
}

export const PLAN_TOOLS: PlanTool[] = [
  {
    kind: 'mortgage',
    label: 'Mortgage',
    description: 'Affordability from your real finances, with a cost-of-living-aware 28/36 verdict.',
    group: 'Housing',
    tab: 'mortgage',
    amountLabel: 'Down payment',
    icon: 'home',
  },
];

const byKind = (kind: string) => PLAN_TOOLS.find((t) => t.kind === kind);

// Resolve where a plan of the given kind opens. Falls back to the kind itself
// (tab === kind today) so an unknown kind still routes somewhere sane.
export const tabForKind = (kind: string): string => byKind(kind)?.tab ?? kind;
export const labelForKind = (kind: string): string => byKind(kind)?.label ?? kind;
export const amountLabelForKind = (kind: string): string => byKind(kind)?.amountLabel ?? 'Target';

export function toolsByGroup(): { group: string; tools: PlanTool[] }[] {
  const order: string[] = [];
  const map = new Map<string, PlanTool[]>();
  for (const t of PLAN_TOOLS) {
    if (!map.has(t.group)) {
      map.set(t.group, []);
      order.push(t.group);
    }
    map.get(t.group)!.push(t);
  }
  return order.map((group) => ({ group, tools: map.get(group)! }));
}
