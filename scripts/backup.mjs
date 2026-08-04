import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================
// 一键备份：用 service key 导出全部表为 JSON
// 用法：node scripts/backup.mjs
// 输出：scripts/backups/backup-<时间戳>.json
// ============================================================

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {};
try {
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* ignore */ }

const baseUrl = (process.env.SUPABASE_URL || env.VITE_SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;
if (!baseUrl || !key) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const TABLES = ['students', 'exams', 'exam_scores', 'class_teachers', 'reminders', 'schedule_events'];

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    const res = await fetch(
      `${baseUrl}/rest/v1/${table}?select=*&offset=${from}&limit=${step}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) throw new Error(`fetch ${table} failed: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < step) break;
    from += step;
  }
  return rows;
}

const outDir = join(__dirname, 'backups');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = join(outDir, `backup-${stamp}.json`);

const result = {};
for (const table of TABLES) {
  const rows = await fetchAll(table);
  result[table] = rows;
  console.log(`${table}: ${rows.length} 行`);
}
writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(`\n备份完成：${outFile}`);
