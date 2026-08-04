import { readFileSync, writeFileSync } from 'node:fs';

// ============================================================
// 批量创建学生 Auth 账号
// 账号：email = s<身份证号>@school.local，登录名即身份证号
// 密码：身份证号后 8 位
// metadata：{ role:'student', id_card, class_no }
// 并回填 students.auth_id
// 用法：node scripts/create-student-users.mjs [--limit=100] [--dry]
//   --limit N：只处理前 N 个学生（测试用）
//   --dry：仅预览，不实际创建
// ============================================================

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const dry = args.includes('--dry');

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
const rest = `${baseUrl}/rest/v1`;
const auth = `${baseUrl}/auth/v1/admin/users`;

// ---------- 读取学生 ----------
const allStudents = [];
{
  let from = 0;
  const step = 1000;
  for (;;) {
    const res = await fetch(
      `${rest}/students?select=id_card,name,class_no,auth_id&offset=${from}&limit=${step}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) throw new Error(`students failed: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    allStudents.push(...batch);
    if (batch.length < step) break;
    from += step;
  }
}
console.log(`学生总数: ${allStudents.length}`);

const students = allStudents.slice(0, limit);
const alreadyLinked = students.filter((s) => s.auth_id);
console.log(`本次处理: ${students.length} 人（其中 ${alreadyLinked.length} 人已绑定账号）`);

if (dry) {
  for (const s of students.slice(0, 10)) {
    const pwd = s.id_card.slice(-8);
    console.log(`  [预览] ${s.name} ${s.id_card} class=${s.class_no} 密码=${pwd}`);
  }
  console.log(dry ? '（dry 模式，未实际创建）' : '');
  process.exit(0);
}

// ---------- 已有 Auth 用户（按 metadata.id_card 索引） ----------
const existingByCard = new Map();
{
  let page = 1;
  for (;;) {
    const res = await fetch(`${auth}?per_page=1000&page=${page}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const j = await res.json();
    for (const u of j.users ?? []) {
      const card = u.user_metadata?.id_card;
      if (card) existingByCard.set(String(card), u.id);
    }
    if ((j.users ?? []).length < 1000 || page > 10) break;
    page++;
  }
}
console.log(`Auth 中已有学生账号: ${existingByCard.size}`);

// ---------- 创建/补绑定 ----------
const queue = students.filter((s) => !s.auth_id);
let created = 0, bound = 0, failed = 0;

async function createOne(s) {
  const card = String(s.id_card);
  const email = `s${card}@school.local`;
  const password = card.slice(-8);
  try {
    let uid = existingByCard.get(card);
    if (!uid) {
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
          user_metadata: {
            role: 'student',
            id_card: card,
            class_no: Number(s.class_no ?? 0),
            name: s.name,
          },
          app_metadata: {
            role: 'student',
            id_card: card,
            class_no: Number(s.class_no ?? 0),
            name: s.name,
            must_change_password: true,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 422 && text.includes('already registered')) {
          // 已存在但未绑定：尝试找出
          const list = await fetch(
            `${auth}?per_page=1000&page=1`,
            { headers: { apikey: key, Authorization: `Bearer ${key}` } },
          );
          const jl = await list.json();
          const u = (jl.users ?? []).find((x) => x.email === email);
          if (!u) throw new Error(`email 已存在但找不到用户: ${email}`);
          uid = u.id;
        } else {
          throw new Error(`create ${email} failed: ${res.status} ${text.slice(0, 120)}`);
        }
      } else {
        uid = (await res.json()).id;
        created++;
      }
    }
    // 回填 students.auth_id
    const r = await fetch(`${rest}/students?id_card=eq.${encodeURIComponent(card)}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auth_id: uid }),
    });
    if (!r.ok && r.status !== 204) {
      throw new Error(`bind auth_id ${card} failed: ${r.status}`);
    }
    bound++;
  } catch (e) {
    failed++;
    console.error(`  ✗ ${s.name} ${card}: ${e.message}`);
  }
}

// 并发 8
let idx = 0;
const workers = Array.from({ length: 8 }, async () => {
  while (idx < queue.length) {
    const s = queue[idx++];
    await createOne(s);
  }
});
await Promise.all(workers);

console.log(`\n完成：新建 ${created} 个账号，绑定 ${bound} 人，失败 ${failed} 人，已跳过 ${alreadyLinked.length} 人`);

// 导出失败名单
if (failed > 0) {
  const fname = `scripts/student-create-failures-${Date.now()}.txt`;
  writeFileSync(fname, JSON.stringify(queue.filter(() => true).filter((s) => failed) || []));
  console.log(`失败详情：${fname}`);
}
