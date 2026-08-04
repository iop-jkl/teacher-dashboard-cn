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
if (!baseUrl || !key) {
  console.error('missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
const auth = `${baseUrl}/auth/v1/admin/users`;

const PERMISSION_FIELDS = ['role', 'class_no', 'id_card'];

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
console.log(`total users: ${users.length}`);

let migrated = 0;
let skipped = 0;
let failed = 0;
let idx = 0;

async function updateOne(u) {
  const um = u.user_metadata ?? {};
  const am = u.app_metadata ?? {};

  const permFields = {};
  for (const f of PERMISSION_FIELDS) {
    if (um[f] !== undefined && am[f] === undefined) permFields[f] = um[f];
  }
  for (const f of PERMISSION_FIELDS) {
    if (am[f] !== undefined) permFields[f] = am[f];
  }

  if (Object.keys(permFields).length === 0) {
    skipped++;
    return;
  }

  const newUm = { ...um };
  for (const f of PERMISSION_FIELDS) delete newUm[f];

  const res = await fetch(`${auth}/${u.id}`, {
    method: 'PUT',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_metadata: { ...am, ...permFields },
      user_metadata: newUm,
    }),
  });
  if (!res.ok) {
    failed++;
    console.error(`update failed ${u.email}: ${res.status} ${await res.text()}`);
    return;
  }
  migrated++;
}

const workers = Array.from({ length: 10 }, async () => {
  while (idx < users.length) {
    const u = users[idx++];
    await updateOne(u);
    if (idx % 200 === 0) console.log(`progress: ${idx}/${users.length}`);
  }
});
await Promise.all(workers);

console.log(`done: migrated ${migrated}, skipped ${skipped}, failed ${failed}`);
