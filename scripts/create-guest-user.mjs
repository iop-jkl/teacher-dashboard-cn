import { readFileSync } from 'node:fs';

// ============================================================
// 创建/更新访客演示账号
// 登录：账号 guest / 密码默认 guest123（可用 --password=xxx 指定）
// metadata：{ role:'guest' }（app_metadata 仅服务端可写，RLS 以此判断）
// 用法：node scripts/create-guest-user.mjs [--password=xxx]
//   --password=xxx  设置（或重置）访客账号密码
// 前置：先运行 0015_guest_access.sql 迁移，访客才能只读访问数据
// ============================================================

const args = process.argv.slice(2);
const pwdArg = args.find((a) => a.startsWith('--password='));
const password = pwdArg ? pwdArg.split('=')[1] : 'guest123';

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
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY（请确认 .env.local 已配置）');
  process.exit(1);
}
const auth = `${baseUrl}/auth/v1/admin/users`;

const EMAIL = 'guest@school.local';
const METADATA = { role: 'guest', username: 'guest', name: '访客' };

// 查找现有访客账号
async function findGuest() {
  let page = 1;
  for (;;) {
    const res = await fetch(`${auth}?per_page=1000&page=${page}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`list users failed: ${res.status} ${await res.text()}`);
    const j = await res.json();
    const u = (j.users ?? []).find((x) => x.email === EMAIL);
    if (u) return u;
    if ((j.users ?? []).length < 1000 || page > 10) break;
    page++;
  }
  return null;
}

async function updateGuest(id) {
  const res = await fetch(`${auth}/${id}`, {
    method: 'PUT',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: METADATA,
      app_metadata: METADATA,
    }),
  });
  if (!res.ok) {
    throw new Error(`update guest failed: ${res.status} ${await res.text()}`);
  }
}

const existing = await findGuest();
if (existing) {
  await updateGuest(existing.id);
  console.log(`访客账号已更新：${EMAIL}（密码已${pwdArg ? '重置' : '保持不变'}）`);
} else {
  const res = await fetch(auth, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: METADATA,
      app_metadata: METADATA,
    }),
  });
  if (!res.ok) {
    throw new Error(`create guest failed: ${res.status} ${await res.text()}`);
  }
  console.log(`访客账号已创建：${EMAIL}`);
}

console.log(`登录方式：账号 guest / 密码 ${password}（仅只读演示，隐私数据已脱敏）`);
