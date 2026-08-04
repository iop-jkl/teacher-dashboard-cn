// ============================================================
// 重置 admin + 全部班主任账号密码为随机强密码
// 用法：node scripts/reset-staff-passwords.mjs
// 输出：控制台打印 班级 -> 账号 -> 新密码；同时写入
//       staff-passwords-<时间戳>.txt（本地文件，勿提交 git/勿外发）
// 注意：学生账号（s***）不在此列（保持身份证后8位初始密码）。
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';

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

// 随机强密码：避免 0/O、1/l/I 等易混淆字符
function genPassword(len = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function getAllUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${auth}?per_page=1000&page=${page}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const j = await res.json();
    users.push(...(j.users ?? []));
    if ((j.users ?? []).length < 1000) break;
    page++;
  }
  return users;
}

const users = await getAllUsers();
const staff = users.filter((u) => {
  const role = u.app_metadata?.role;
  return role === 'admin' || role === 'teacher';
});
console.log(`staff 数量：${staff.length}（admin + 班主任）`);

const lines = [];
const now = new Date().toISOString().replace(/[:.]/g, '-');
let updated = 0;
let failed = 0;

for (const u of staff) {
  const am = u.app_metadata ?? {};
  const password = genPassword();
  const res = await fetch(`${auth}/${u.id}`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    failed++;
    console.error(`更新失败 ${u.email}: ${res.status} ${await res.text()}`);
    continue;
  }
  updated++;
  const label =
    u.email === 'admin@school.local'
      ? 'admin'
      : `class${am.class_no}`;
  lines.push(`${label}\t${u.email}\t${u.teacher_name ?? am.teacher_name ?? ''}\t${password}`);
  console.log(`已重置 ${label} (${u.email}) -> ${password}`);
}

const header =
  `班主任工作台 管理员/班主任新密码（生成于 ${new Date().toLocaleString('zh-CN')}）\n` +
  `账号=登录名，导师初始密码为 111，以下为随机新密码，请妥善保管、勿存入 git/外发。\n\n` +
  `登录名\tEmail\t姓名\t新密码\n`;
const outFile = `scripts/staff-password-${now}.txt`;
writeFileSync(outFile, header + lines.join('\n') + '\n', 'utf8');
console.log(`\n完成：更新 ${updated} 个账号，失败 ${failed}`);
console.log(`密码清单已写入本地文件：${outFile}`);
console.log('提醒：班主任登录账号仍是“班级号”（如 3 表示 3 班），admin 用 admin。');