import { readFileSync } from 'node:fs';

const baseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!baseUrl || !serviceKey) {
  console.error('需要环境变量 SUPABASE_URL 和 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const rest = `${baseUrl.replace(/\/$/, '')}/rest/v1`;
const base = '.import-data';
const students = JSON.parse(readFileSync(`${base}/students.json`, 'utf8'));
const exams = JSON.parse(readFileSync(`${base}/exams.json`, 'utf8'));
const scores = JSON.parse(readFileSync(`${base}/scores.json`, 'utf8'));

async function post(path, rows, chunkSize) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${rest}/${path}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `POST ${path} chunk ${i / chunkSize} failed: ${res.status} ${text}`,
      );
    }
  }
  console.log(`uploaded ${path}: ${rows.length} rows`);
}

async function count(path) {
  const res = await fetch(`${rest}/${path}?select=*&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  const range = res.headers.get('content-range') || '';
  const m = range.match(/\/(\d+)$/);
  return m ? Number(m[1]) : -1;
}

await post('exams', exams, 10);
await post('students', students, 500);
await post('exam_scores', scores, 1000);

console.log('exams count:', await count('exams'));
console.log('students count:', await count('students'));
console.log('exam_scores count:', await count('exam_scores'));
