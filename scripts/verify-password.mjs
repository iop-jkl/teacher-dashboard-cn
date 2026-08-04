import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');

const env = {};
const content = readFileSync('.env.local', 'utf8');
for (const line of content.split('\n')) {
  const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const baseUrl = (process.env.SUPABASE_URL || env.VITE_SUPABASE_URL).replace(/\/$/, '');
const anonKey = process.env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
};

const ADMIN = { email: 'admin@school.local', password: 'QW!4Uh%gTT8FVx' };
const TEACHER5 = { email: 'class5@school.local', password: 'ky987ReJ%#pjDZ' };
const STUDENT_EMAIL = 's370481200909125615@school.local';

const client = (email, password) =>
  createClient(baseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    .then;
const mk = (email, password) =>
  createClient(baseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

async function login(email, password) {
  const c = mk();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) return { c, ok: false, error };
  return { c, ok: true };
}

const tempA = 'TempPass_' + Math.floor(Math.random() * 1e6);
const tempB = 'TempPass_' + Math.floor(Math.random() * 1e6);

// 1. admin 重置班主任密码
let r = await login(ADMIN.email, ADMIN.password);
check('admin 登录', r.ok);
if (r.ok) {
  const { data, error } = await r.c.rpc('reset_user_password', {
    target_email: TEACHER5.email,
    target_password: tempA,
  });
  check('admin 重置 class5 班主任密码', !error && data === tempA, error?.message ?? '');
  if (!error) {
    const t = await login(TEACHER5.email, tempA);
    check('班主任用新密码登录', t.ok);
  }
  // 还原
  await r.c.rpc('reset_user_password', {
    target_email: TEACHER5.email,
    target_password: TEACHER5.password,
  });
  const t2 = await login(TEACHER5.email, TEACHER5.password);
  check('班主任原密码已还原', t2.ok);
}

// 2. 班主任重置本班学生密码
r = await login(TEACHER5.email, TEACHER5.password);
check('teacher5 重新登录', r.ok);
if (r.ok) {
  // 查本班一名学生
  const { data: stu } = await r.c
    .from('students')
    .select('id_card, name')
    .eq('class_no', 5)
    .limit(1);
  const s = stu?.[0];
  check('teacher5 查到本班学生', Boolean(s));
  if (s) {
    const stuEmail = `s${s.id_card.toUpperCase()}@school.local`;
    const stuOrig = s.id_card.slice(-8);
    const { data, error } = await r.c.rpc('reset_user_password', {
      target_email: stuEmail,
      target_password: tempB,
    });
    check('teacher5 重置本班学生密码', !error && data === tempB, error?.message ?? '');
    if (!error) {
      const s2 = await login(stuEmail, tempB);
      check('学生用新密码登录', s2.ok);
      await r.c.rpc('reset_user_password', {
        target_email: stuEmail,
        target_password: stuOrig,
      });
      const s3 = await login(stuEmail, stuOrig);
      check('学生原密码（身份证后8位）已还原', s3.ok);
    }
  }
}

// 3. 越权拦截：teacher5 重置一班学生
if (r.ok) {
  const { error } = await r.c.rpc('reset_user_password', {
    target_email: STUDENT_EMAIL,
    target_password: tempB,
  });
  check('teacher5 重置一班学生被拦截', Boolean(error), error?.message ?? '');
  // 确认一班学生密码未被改动
  const s1 = await login(STUDENT_EMAIL, '09125615');
  check('一班学生原密码未受影响', s1.ok);
}

// 4. 越权拦截：admin 重置学生
r = await login(ADMIN.email, ADMIN.password);
if (r.ok) {
  const { error } = await r.c.rpc('reset_user_password', {
    target_email: STUDENT_EMAIL,
    target_password: tempB,
  });
  check('admin 重置学生被拦截（仅限班主任）', Boolean(error), error?.message ?? '');
}

// 5. 未登录（anon）调用被拒
const anon = mk('x', 'x');
const { error: anonErr } = await anon.rpc('reset_user_password', {
  target_email: TEACHER5.email,
  target_password: tempB,
});
check('未登录调用被拒', Boolean(anonErr), anonErr?.message ?? '');

console.log(failures === 0 ? '\n全部通过' : `\n${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
