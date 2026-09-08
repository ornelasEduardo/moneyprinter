import type { PlanKind } from './registry';

// Client-safe catalog of Plan tools for the hub. Kept separate from the
// compute-heavy PlanDefinition so importing it into the client bundle never
// drags in server context. Add a tool = add an entry; add a life-area = a new
// `group`. Drives the hub's Tools zone.
export interface PlanTool {
  kind: PlanKind;
  label: string;
  description: string;
  group: string; // life-area, e.g. "Home"
  tab: string; // ?tab= target that opens the tool
  icon: 'home';
}

export const PLAN_TOOLS: PlanTool[] = [
  {
    kind: 'mortgage',
    label: 'Mortgage',
    description: 'Affordability from your real finances, with a cost-of-living-aware 28/36 verdict.',
    group: 'Home',
    tab: 'mortgage',
    icon: 'home',
  },
];

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
