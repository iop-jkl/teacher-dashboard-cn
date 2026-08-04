import { readFileSync } from 'node:fs';

// 上传 .import-data 中的数据到 Supabase（upsert 模式，可重复执行）
// 优先使用 SUPABASE_SERVICE_KEY 环境变量，其次读取 .env.local 中的 anon key
// 用法：node scripts/upload-new-exams.mjs

const env = {};
try {
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* ignore */ }

const baseUrl = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!baseUrl || !key) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY（或 .env.local 中的 VITE_SUPABASE_*）');
  process.exit(1);
}

const rest = `${baseUrl.replace(/\/$/, '')}/rest/v1`;
const base = '.import-data';
const students = JSON.parse(readFileSync(`${base}/students.json`, 'utf8'));
const exams = JSON.parse(readFileSync(`${base}/exams.json`, 'utf8'));
const scores = JSON.parse(readFileSync(`${base}/scores.json`, 'utf8'));

async function upsert(path, rows, chunkSize) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const res = await fetch(`${rest}/${path}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `UPSERT ${path} chunk ${i / chunkSize} failed: ${res.status} ${text}`,
      );
    }
  }
  console.log(`upserted ${path}: ${rows.length} rows`);
}

async function count(path) {
  const res = await fetch(`${rest}/${path}?select=*&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  const range = res.headers.get('content-range') || '';
  const m = range.match(/\/(\d+)$/);
  return m ? Number(m[1]) : -1;
}

await upsert('exams', exams, 20);
await upsert('students', students, 500);
await upsert('exam_scores', scores, 1000);

console.log('exams count:', await count('exams'));
console.log('students count:', await count('students'));
console.log('exam_scores count:', await count('exam_scores'));
