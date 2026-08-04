import { readFileSync } from 'node:fs';

// ============================================================
// 创建 Supabase Auth 账号：80 个班主任 + 1 个 admin
// 账号映射：登录名（班级号或 admin）→ email 账号
//   admin        -> admin@school.local
//   3            -> class3@school.local
// 密码：从 class_teachers 表读取（旧密码），迁移到 Auth 后
//       数据库中不再存密码
// 用法：node scripts/create-auth-users.mjs
// ============================================================

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

async function listUsers() {
  const res = await fetch(`${auth}?per_page=1000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`list users failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return (j.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    username: u.user_metadata?.username ?? '',
    classNo: u.user_metadata?.class_no ?? 0,
    role: u.user_metadata?.role ?? '',
    teacherName: u.user_metadata?.teacher_name ?? '',
  }));
}

async function createUser(email, password, metadata) {
  const res = await fetch(auth, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 422 && text.includes('already registered')) {
      return 'exists';
    }
    throw new Error(`create ${email} failed: ${res.status} ${text}`);
  }
  return 'created';
}

async function updateUserMeta(id, metadata) {
  const res = await fetch(`${auth}/${id}`, {
    method: 'PUT',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_metadata: metadata }),
  });
  if (!res.ok) throw new Error(`update ${id} failed: ${res.status} ${await res.text()}`);
}

// ---------- 1. 读取旧班级信息 ----------
const rest = `${baseUrl}/rest/v1`;
const teachersRes = await fetch(`${rest}/class_teachers?select=class_no,teacher_name`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!teachersRes.ok) throw new Error(`class_teachers failed: ${teachersRes.status}`);
const teachers = await teachersRes.json();

// ---------- 2. 读取现有 Auth 用户 ----------
const existing = await listUsers();
const existingByClass = new Map(existing.filter((u) => u.classNo > 0).map((u) => [u.classNo, u]));
const adminUser = existing.find((u) => u.role === 'admin');

// ---------- 3. admin 账号 ----------
if (!adminUser) {
  const r = await createUser('admin@school.local', '111', {
    role: 'admin',
    username: 'admin',
    teacher_name: '管理员',
  });
  console.log(`admin 账号: ${r}`);
} else {
  console.log('admin 账号已存在');
}

// ---------- 4. 80 个班主任账号（密码沿用旧值，默认 111） ----------
let created = 0;
let existsCount = 0;
for (const t of teachers) {
  const classNo = t.class_no;
  const teacherName = t.teacher_name || '';
  const email = `class${classNo}@school.local`;
  const password = '111';
  const existingUser = existingByClass.get(classNo);
  if (existingUser) {
    // 已存在：仅同步姓名
    if (existingUser.teacherName !== teacherName) {
      await updateUserMeta(existingUser.id, {
        role: 'teacher',
        username: String(classNo),
        class_no: classNo,
        teacher_name: teacherName,
      });
      console.log(`班级 ${classNo} 元信息已同步`);
    }
    existsCount++;
    continue;
  }
  const r = await createUser(email, password, {
    role: 'teacher',
    username: String(classNo),
    class_no: classNo,
    teacher_name: teacherName,
  });
  if (r === 'created') {
    created++;
    console.log(`班级 ${classNo} 账号已创建 (${email})`);
  } else {
    existsCount++;
  }
}

console.log(`\n完成：新建 ${created} 个班主任账号，已存在 ${existsCount} 个，admin ${adminUser ? '已存在' : '已创建'}`);
console.log('登录方式不变：admin/111 或 班级号/111');
