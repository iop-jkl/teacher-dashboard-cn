import { readFileSync } from 'node:fs';

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
const auth = `${baseUrl}/auth/v1/admin/users`;
const rest = `${baseUrl}/rest/v1`;

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

// 学生 class_no 索引：从 students 表按 auth_id 查
async function buildStudentClassMap() {
  const map = new Map();
  let from = 0;
  const step = 1000;
  for (;;) {
    const res = await fetch(
      `${rest}/students?select=id_card,class_no,auth_id&auth_id=not.is.null&offset=${from}&limit=${step}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    const rows = await res.json();
    for (const r of rows) map.set(r.auth_id, { idCard: r.id_card, classNo: r.class_no });
    if (rows.length < step) break;
    from += step;
  }
  return map;
}

const users = await getAllUsers();
const studentMap = await buildStudentClassMap();
console.log(`users: ${users.length}, students with auth: ${studentMap.size}`);

// 预期角色推导
function expectedFor(u) {
  const email = u.email ?? '';
  if (email === 'admin@school.local') return { role: 'admin' };
  const m = email.match(/^class(\d+)@school\.local$/);
  if (m) return { role: 'teacher', class_no: Number(m[1]) };
  const sm = email.match(/^s(\d{17}[\dXx])@school\.local$/i);
  if (sm) {
    const card = sm[1].toUpperCase();
    const st = studentMap.get(u.id);
    return st && st.idCard === card
      ? { role: 'student', class_no: st.classNo, id_card: card }
      : null;
  }
  return null;
}

let fixed = 0;
let ok = 0;
let skipped = 0;

for (const u of users) {
  const exp = expectedFor(u);
  if (!exp) { skipped++; continue; }
  const am = u.app_metadata ?? {};
  const um = u.user_metadata ?? {};

  // 检查 app_metadata 与预期是否一致
  const amRole = am.role;
  const amClass = am.class_no ?? 0;
  const mismatch =
    amRole !== exp.role || (exp.class_no !== undefined && amClass !== exp.class_no);

  // 检查 user_metadata 是否有权限字段残留
  const umDirty = ['role', 'class_no', 'id_card'].some((f) => um[f] !== undefined);

  if (!mismatch && !umDirty) { ok++; continue; }

  // 修正
  const newAm = { ...am };
  delete newAm.role; delete newAm.class_no; delete newAm.id_card;
  for (const [k, v] of Object.entries(exp)) newAm[k] = v;

  const newUm = { ...um };
  delete newUm.role; delete newUm.class_no; delete newUm.id_card;

  const res = await fetch(`${auth}/${u.id}`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_metadata: newAm, user_metadata: newUm }),
  });
  if (!res.ok) {
    console.error(`fix failed ${u.email}: ${res.status} ${await res.text()}`);
    continue;
  }
  console.log(`已修正 ${u.email}: app_metadata.role=${exp.role} class_no=${exp.class_no ?? '-'}`);
  fixed++;
}

console.log(`\ndone: fixed ${fixed}, correct ${ok}, skipped(non-school) ${skipped}`);
