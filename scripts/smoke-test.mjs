import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(
  'C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);

const BASE = process.env.BASE_URL || 'http://localhost:5173';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];

async function newPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return { context, page };
}

// 管理员登录
{
  const { context, page } = await newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', '111');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.waitForSelector('text=工作台', { timeout: 15000 });
  console.log('admin login ok');

  await page.goto(`${BASE}/students`, { waitUntil: 'networkidle' });
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  const rowCount = await page.locator('table tbody tr').count();
  const firstRowText = await page.locator('table tbody tr').first().innerText();
  console.log('students rows:', rowCount);
  console.log('first row:', firstRowText.replace(/\s+/g, ' ').slice(0, 120));

  // 打开第一个学生详情弹窗
  await page.locator('table tbody tr').first().locator('button').first().click();
  await page.waitForSelector('text=家长信息', { timeout: 10000 });
  const modalHasScore = await page.locator('text=赋分').count();
  console.log('modal 赋分 labels:', modalHasScore);
  await page.screenshot({ path: '.import-data/smoke-admin-students.png', fullPage: false });

  await context.close();
}

// 班主任登录（班级号 1）
{
  const { context, page } = await newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#username', '1');
  await page.fill('#password', '111');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.waitForSelector('text=工作台', { timeout: 15000 });
  const headerText = await page.locator('header').innerText();
  console.log('teacher header:', headerText.replace(/\s+/g, ' ').slice(0, 80));
  await context.close();
}

await browser.close();

if (errors.length > 0) {
  console.log('ERRORS:');
  for (const e of errors) console.log(e);
  process.exit(1);
}
console.log('smoke test passed');
