// Verifies BATCHED local-LLM categorization against the RUNNING Ollama. Mirrors
// src/lib/llm/categorize.ts's batch path (one structured array response keyed by
// transaction id) so a green run means the streaming route's per-batch call works
// end-to-end on this machine.
//   node scripts/verify-llm-batch.mjs   (OLLAMA_ENDPOINT / OLLAMA_MODEL override)
const ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
const VOCAB = ['Groceries', 'Dining', 'Transportation', 'Entertainment', 'Utilities', 'Subscriptions', 'Housing', 'Health', 'Income', 'Other'];

// A 20-row batch — the same size the streaming route sends per call.
const SAMPLES = [
  { id: 101, name: 'WHOLE FOODS MKT #10234', amount: -85.5, expect: 'Groceries' },
  { id: 102, name: 'SHELL OIL 12345', amount: -45, expect: 'Transportation' },
  { id: 103, name: 'NETFLIX.COM', amount: -15.99, expect: 'Subscriptions' },
  { id: 104, name: 'BLUE BOTTLE COFFEE', amount: -6.5, expect: 'Dining' },
  { id: 105, name: 'ACME CORP PAYROLL', amount: 3200, expect: 'Income' },
  { id: 106, name: 'PACIFIC GAS & ELECTRIC', amount: -142.3, expect: 'Utilities' },
  { id: 107, name: 'TRADER JOES #455', amount: -62.1, expect: 'Groceries' },
  { id: 108, name: 'UBER TRIP 8H2K', amount: -18.75, expect: 'Transportation' },
  { id: 109, name: 'SPOTIFY USA', amount: -10.99, expect: 'Subscriptions' },
  { id: 110, name: 'AMC THEATRES 044', amount: -24, expect: 'Entertainment' },
  { id: 111, name: 'CVS PHARMACY #776', amount: -32.4, expect: 'Health' },
  { id: 112, name: 'CHIPOTLE 2201', amount: -13.25, expect: 'Dining' },
  { id: 113, name: 'COMCAST XFINITY', amount: -89, expect: 'Utilities' },
  { id: 114, name: 'DELTA AIR LINES', amount: -410, expect: 'Transportation' },
  { id: 115, name: 'APARTMENT RENT AUG', amount: -2100, expect: 'Housing' },
  { id: 116, name: 'SAFEWAY #1450', amount: -54.8, expect: 'Groceries' },
  { id: 117, name: 'STEAM GAMES', amount: -29.99, expect: 'Entertainment' },
  { id: 118, name: 'ONE MEDICAL', amount: -199, expect: 'Health' },
  { id: 119, name: 'PATREON MEMBERSHIP', amount: -5, expect: 'Subscriptions' },
  { id: 120, name: 'STARBUCKS 0771', amount: -5.65, expect: 'Dining' },
];

const schema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          category: { type: 'string', enum: VOCAB },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['id', 'category', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

const lines = SAMPLES.map((t) => `[id ${t.id}] "${t.name}", amount ${t.amount}`).join('\n');

try {
  const v = await (await fetch(`${ENDPOINT}/api/version`)).json();
  console.log(`Ollama ${v.version} @ ${ENDPOINT} · model ${MODEL} · batch of ${SAMPLES.length}\n`);
} catch {
  console.error(`✗ Ollama not reachable at ${ENDPOINT} — start it with: ollama serve`);
  process.exit(1);
}

const t0 = Date.now();
const res = await fetch(`${ENDPOINT}/api/chat`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    model: MODEL,
    stream: false,
    format: schema,
    messages: [
      { role: 'system', content: `You categorize personal-finance transactions. For EACH transaction choose exactly ONE category from this list: ${VOCAB.join(', ')}. Base it on the merchant/description and amount sign, and give a confidence from 0 to 1. Return one result per transaction, echoing its id exactly. Do not add, drop, or merge transactions.` },
      { role: 'user', content: `Transactions:\n${lines}\n\nReturn a result for every id above.` },
    ],
  }),
});
if (!res.ok) { console.error(`✗ Ollama ${res.status}`); process.exit(1); }
const data = await res.json();
const ms = Date.now() - t0;
const parsed = JSON.parse(data.message.content);
const results = parsed.results ?? [];
const byId = new Map(results.map((r) => [r.id, r]));

let match = 0, valid = 0, covered = 0;
for (const s of SAMPLES) {
  const out = byId.get(s.id);
  if (!out) { console.log(`✗ ${String(s.id)} ${s.name.padEnd(26)} → MISSING from response`); continue; }
  covered++;
  const schemaOk = VOCAB.includes(out.category) && typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1;
  const exact = out.category === s.expect;
  if (schemaOk) valid++;
  if (exact) match++;
  console.log(`${exact ? '✓' : '≈'} ${String(s.id)} ${s.name.padEnd(26)} → ${String(out.category).padEnd(15)} conf=${out.confidence}  expected ${s.expect}`);
}

const perRow = (ms / SAMPLES.length).toFixed(0);
console.log(`\nbatch latency: ${ms}ms (${perRow}ms/row amortized) · id-coverage: ${covered}/${SAMPLES.length} · schema-valid: ${valid}/${covered} · exact-match: ${match}/${SAMPLES.length}`);
if (covered !== SAMPLES.length) { console.error('✗ model dropped/added rows — batch alignment failed'); process.exit(1); }
if (valid !== covered) { console.error('✗ some outputs failed schema validation'); process.exit(1); }
console.log('✓ batched structured categorization verified against the live model');
