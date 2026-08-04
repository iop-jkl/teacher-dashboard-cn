import { readFileSync } from 'node:fs';
import pg from 'pg';

// ============================================================
// 执行 SQL 迁移文件
// 连接串从 .env.local 的 SUPABASE_DB_URL 读取，否则用可选 CLI 参数：
//   node scripts/run-migration.mjs supabase/migrations/0004_grade.sql
//   node scripts/run-migration.mjs 0004 0005   （按编号匹配）
// ============================================================

const env = {};
try {
  const content = readFileSync('.env.local', 'utf8');
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* ignore */ }

const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('缺少 SUPABASE_DB_URL（请配置 .env.local）');
  console.error('  在 Supabase Dashboard → Project Settings → Database → Connection string → URI');
  console.error('  例如：SUPABASE_DB_URL=postgresql://postgres.xxx:密码@aws-0-<region>.pooler.supabase.com:6543/postgres');
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法：node scripts/run-migration.mjs <迁移文件或编号>');
  process.exit(1);
}

const exists = (p) => {
  try { readFileSync(p, 'utf8'); return true; } catch { return false; }
};

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const arg of files) {
  // 支持直接给文件名或编号
  const candidates = /^\d+$/.test(arg)
    ? [
        `supabase/migrations/${arg}.sql`,
        ...(() => {
          // 号码直接当文件名而非编号
          return [];
        })(),
      ]
    : [arg, arg.replace(/\.sql$/, '') + '.sql'];
  const file = candidates.find(exists);
  if (!file) {
    console.error(`找不到迁移文件: ${arg}`);
    process.exit(1);
  }
  const sql = readFileSync(file, 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('commit');
    console.log(`✓ 已执行: ${file}`);
  } catch (e) {
    await client.query('rollback');
    console.error(`✗ 失败: ${file}`);
    console.error(e.message);
    process.exit(1);
  }
}
await client.end();
console.log('全部迁移完成');