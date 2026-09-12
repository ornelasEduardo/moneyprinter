// Verifies local-LLM categorization against the RUNNING Ollama. Mirrors the
// request shape of src/lib/llm/{client,categorize}.ts so a green run here means
// the app's structured-output path works end-to-end on this machine.
//   node scripts/verify-llm.mjs   (OLLAMA_ENDPOINT / OLLAMA_MODEL override)
const ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
const VOCAB = ['Groceries', 'Dining', 'Transportation', 'Entertainment', 'Utilities', 'Subscriptions', 'Housing', 'Health', 'Income', 'Other'];

const SAMPLES = [
  { name: 'WHOLE FOODS MKT #10234', amount: -85.5, expect: 'Groceries' },
  { name: 'SHELL OIL 12345', amount: -45, expect: 'Transportation' },
  { name: 'NETFLIX.COM', amount: -15.99, expect: 'Subscriptions' },
  { name: 'BLUE BOTTLE COFFEE', amount: -6.5, expect: 'Dining' },
  { name: 'ACME CORP PAYROLL', amount: 3200, expect: 'Income' },
  { name: 'PACIFIC GAS & ELECTRIC', amount: -142.3, expect: 'Utilities' },
];

const schema = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: VOCAB },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['category', 'confidence'],
  additionalProperties: false,
};

async function categorize(txn) {
  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      format: schema,
      messages: [
        { role: 'system', content: `You categorize personal-finance transactions. Choose exactly ONE category from this list: ${VOCAB.join(', ')}. Base it on the merchant/description and amount sign. Give a confidence from 0 to 1.` },
        { role: 'user', content: `Transaction: "${txn.name}", amount ${txn.amount}.` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.message.content);
}

try {
  const v = await (await fetch(`${ENDPOINT}/api/version`)).json();
  console.log(`Ollama ${v.version} @ ${ENDPOINT} · model ${MODEL}\n`);
} catch {
  console.error(`✗ Ollama not reachable at ${ENDPOINT} — start it with: ollama serve`);
  process.exit(1);
}

let match = 0;
let valid = 0;
for (const s of SAMPLES) {
  const t0 = Date.now();
  const out = await categorize(s);
  const ms = Date.now() - t0;
  const schemaOk = VOCAB.includes(out.category) && typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1;
  const exact = out.category === s.expect;
  if (schemaOk) valid++;
  if (exact) match++;
  console.log(`${exact ? '✓' : '≈'} ${s.name.padEnd(26)} → ${String(out.category).padEnd(15)} conf=${out.confidence}  (${ms}ms)  expected ${s.expect}`);
}

console.log(`\nschema-valid: ${valid}/${SAMPLES.length} · exact-match: ${match}/${SAMPLES.length}`);
if (valid !== SAMPLES.length) {
  console.error('✗ some outputs failed schema validation');
  process.exit(1);
}
console.log('✓ structured categorization verified against the live model');
