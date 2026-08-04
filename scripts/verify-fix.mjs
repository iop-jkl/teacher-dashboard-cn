// 验证 app_metadata 权限隔离修复是否生效：
// 1) 找目标学生，用其账号登录（密码=身份证后8位）
// 2) 通过 auth/v1/user PUT 篡改自己的 user_metadata.role=admin
// 3) 用篡改后的 token 读 students 表，确认仍只有自己 1 行（而非全表）
// 4) 恢复 user_metadata（清空 role），最后用 service key 修回 app_metadata 里被污染的角色（本脚本不改 app_metadata，只做只读检查）
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
const anon = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;
const authBase = `${baseUrl}/auth/v1`;
const rest = `${baseUrl}/rest/v1`;

const TEST_STUDENT_EMAIL = process.env.TEST_EMAIL || 's370481200812135678@school.local';
const TEST_STUDENT_PASSWORD = process.env.TEST_PASSWORD || '2135678X';

async function main() {
  // 0) 从 students 表挑一个真实学生（有 auth_id 的）
  const cand = await fetch(`${rest}/students?select=id_card,class_no,auth_id&auth_id=not.is.null&limit=1`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  }).then((r) => r.json());
  const pick = Array.isArray(cand) ? cand[0] : null;
  if (!pick) { console.log('FAIL: students 表没有已绑定账号的学生'); process.exit(1); }
  const TEST_STUDENT_EMAIL = process.env.TEST_EMAIL || `s${pick.id_card}@school.local`;
  const TEST_STUDENT_PASSWORD = process.env.TEST_PASSWORD || pick.id_card.slice(-8);
  console.log(`测试学生: ${TEST_STUDENT_EMAIL} class=${pick.class_no}`);

  // 服务端确认目标学生 app_metadata 正确（role=student, class_no, id_card）
  // 注意：admin/users 的 filter 参数不可靠，直接遍历所有页查找目标
  async function findUserByEmail(email) {
    let page = 1;
    for (;;) {
      const res = await fetch(`${authBase}/admin/users?per_page=1000&page=${page}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const j = await res.json();
      const list = j.users ?? [];
      const hit = list.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (hit) return hit;
      if (list.length < 1000) return null;
      page++;
    }
  }
  const target = await findUserByEmail(TEST_STUDENT_EMAIL);
  if (!target) { console.log('FAIL: 找不到测试学生'); process.exit(1); }
  const am = target.app_metadata ?? {};
  console.log(`app_metadata: role=${am.role} class_no=${am.class_no} id_card=${am.id_card}`);
  if (am.role !== 'student') { console.log('FAIL: app_metadata.role 不是 student'); process.exit(1); }

  // 1) 学生账号登录（模拟真实学生）
  const loginRes = await fetch(`${authBase}/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_STUDENT_EMAIL, password: TEST_STUDENT_PASSWORD }),
  });
  if (!loginRes.ok) { console.log('FAIL: 学生登录失败', loginRes.status, await loginRes.text()); process.exit(1); }
  const { access_token: token } = await loginRes.json();
  console.log('学生登录成功');

  // 1.5) 篡改前：读 students 应只有 1 行
  const before = await fetch(`${rest}/students?select=id_card`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  console.log(`篡改前读 students: ${Array.isArray(before) ? before.length : 'ERR ' + JSON.stringify(before)} 行`);
  if (!Array.isArray(before) || before.length !== 1) { console.log('FAIL: 篡改前就异常'); process.exit(1); }

  // 2) 学生篡改自己的 user_metadata（漏洞测试：应被忽略/无法提权）
  const tamperRes = await fetch(`${authBase}/user`, {
    method: 'PUT',
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_metadata: { role: 'admin' } }),
  });
  const tamper = await tamperRes.json();
  console.log('篡改 user_metadata.role=admin:', tamperRes.status, 'app_metadata.role =', tamper.user?.app_metadata?.role ?? '?');

  // 3) 篡改后：读 students 应仍只有 1 行
  const after = await fetch(`${rest}/students?select=id_card`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const afterN = Array.isArray(after) ? after.length : 'ERR ' + JSON.stringify(after);
  console.log(`篡改后读 students: ${afterN} 行`);
  if (Array.isArray(after) && after.length === 1) {
    console.log('PASS: 篡改 user_metadata 无法提权，RLS 读 app_metadata 生效');
  } else {
    console.log('FAIL: 篡改后仍能读到多行（隔离失效！）');
    process.exit(1);
  }

  // 4) 学生尝试修改 app_metadata（应 403）
  const tamperAm = await fetch(`${authBase}/user`, {
    method: 'PUT',
    headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_metadata: { role: 'admin' } }),
  });
  const tamperAmRes = await tamperAm.json();
  console.log('篡改 app_metadata.role=admin:', tamperAmRes.error?.code ?? tamperAmRes.error ?? tamperAmRes, '| app_metadata.role =', tamperAmRes.user?.app_metadata?.role ?? '?');
  if (tamperAmRes.user?.app_metadata?.role === 'admin') {
    console.log('FAIL: app_metadata 也能被篡改！');
    process.exit(1);
  }

  // 5) 用 service key 修回 user_metadata（清理测试残留）
  const clean = { ...(target.user_metadata ?? {}), role: undefined, class_no: undefined, id_card: undefined };
  delete clean.role; delete clean.class_no; delete clean.id_card;
  const cleanRes = await fetch(`${authBase}/admin/users/${target.id}`, {
    method: 'PUT',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_metadata: clean }),
  });
  console.log('清理 user_metadata:', cleanRes.status);
  console.log('ALL PASS');
}

main().catch((e) => { console.error(e); process.exit(1); });
