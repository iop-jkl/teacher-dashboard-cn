import { readFileSync, writeFileSync } from 'node:fs';

// ============================================================
// 存量学生账号补设「首次登录强制改密」标记
//   标记写入 app_metadata.must_change_password = true
//   学生下次登录将被要求修改密码（默认密码=身份证后8位作废）
// 用法：node scripts/flag-student-password-reset.mjs [--dry]
//   --dry：仅预览将受影响的人数，不实际修改
// ============================================================

const dry = process.argv.includes('--dry');

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
const auth = `${baseUrl}/auth/v1/admin/users`;

let updated = 0;
let skipped = 0;
let failed = 0;

const allUsers = [];
for (let page = 1; ; page++) {
  const res = await fetch(`${auth}?per_page=1000&page=${page}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`list users failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const users = j.users ?? [];
  allUsers.push(...users);
  if (users.length === 0) break;
  if (page > 30) {
    console.error('分页超限，中止');
    break;
  }
  console.log(`  已读取 ${allUsers.length} 个用户…`);
}
console.log(`用户总数: ${allUsers.length}`);

const task = async (u) => {
  const am = u.app_metadata ?? {};
  const um = u.user_metadata ?? {};
  const isStudent = am.role === 'student' || um.role === 'student';
  if (!isStudent) return;
  if (am.must_change_password === true) {
    skipped++;
    return;
  }
  if (dry) {
    updated++;
    return;
  }
  const body = { app_metadata: { ...am, must_change_password: true } };
  const r = await fetch(`${auth}/${u.id}`, {
    method: 'PUT',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    failed++;
    console.error(`  ✗ ${u.email}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    return;
  }
  updated++;
};

let idx = 0;
const workers = Array.from({ length: 8 }, async () => {
  while (idx < allUsers.length) {
    const u = allUsers[idx++];
    await task(u);
    if ((idx % 200) === 0) console.log(`  进度 ${idx}/${allUsers.length}（已标记 ${updated}）`);
  }
});
await Promise.all(workers);

const mode = dry ? '（dry 预览）' : '';
console.log(`\n完成${mode}：待标记 ${updated} 人，已跳过 ${skipped} 人，失败 ${failed} 人`);

if (!dry && failed === 0) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(`scripts/flag-reset-${stamp}.txt`, `marked=${updated} skipped=${skipped} failed=${failed}\n`);
  console.log('标记完成，学生账号将于下次登录时被要求修改密码');
}