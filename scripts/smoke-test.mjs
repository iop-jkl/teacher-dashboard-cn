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

async function gotoLogin(page) {
  await page.goto(`${BASE}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  await page.waitForSelector('#username', { timeout: 30000 });
}

// 管理员登录
{
  const { context, page } = await newPage();
  await gotoLogin(page);
  await page.fill('#username', 'admin');
  await page.fill('#password', '111');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.endsWith('/') || url.pathname === '/teacher-dashboard-cn', { timeout: 15000 });
  await page.waitForSelector('text=工作台', { timeout: 15000 });
  console.log('admin login ok');
  const dashHeader = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
  console.log('dashboard header:', dashHeader.slice(0, 80));
  if (!dashHeader.includes('全部班级')) throw new Error('管理员工作台默认应为全部班级');

  await page.locator('aside').getByText('学生管理', { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/students'), {
    timeout: 15000,
  });
  await page.waitForSelector('text=共 4027 名学生', { timeout: 60000 });
  console.log('all classes count ok');
  await page.locator('header select').selectOption('1');
  await page.waitForSelector('text=共 47 名学生', { timeout: 60000 });
  await page.waitForSelector('table tbody tr', { timeout: 60000 });
  const rowCount = await page.locator('table tbody tr').count();
  const firstRowText = await page.locator('table tbody tr').first().innerText();
  console.log('students rows:', rowCount);
  console.log('first row:', firstRowText.replace(/\s+/g, ' ').slice(0, 120));
  if (!firstRowText.includes('1班')) throw new Error('学生列表应显示班级');
  await page.locator('header select').selectOption('0');
  await page.waitForSelector('text=共 4027 名学生', { timeout: 60000 });
  const allFirstRow = await page.locator('table tbody tr').first().innerText();
  if (!allFirstRow.includes('班')) throw new Error('全部学生视图应显示班级');
  await page.locator('header select').selectOption('1');
  await page.waitForSelector('text=共 47 名学生', { timeout: 60000 });

  // 打开第一个学生详情弹窗
  await page.locator('table tbody tr').first().locator('button').first().click();
  await page.waitForSelector('text=家长信息', { timeout: 10000 });
  const modalHasScore = await page.locator('text=赋分').count();
  console.log('modal 赋分 labels:', modalHasScore);
  const adminCanEdit = await page.locator('text=编辑成绩').count();
  console.log('admin edit score button:', adminCanEdit);
  await page.screenshot({ path: '.import-data/smoke-admin-students.png', fullPage: false });

  await context.close();
}

// 班主任登录（班级号 1）
{
  const { context, page } = await newPage();
  await gotoLogin(page);
  await page.fill('#username', '1');
  await page.fill('#password', '111');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname.endsWith('/') || url.pathname === '/teacher-dashboard-cn', { timeout: 15000 });
  await page.waitForSelector('text=工作台', { timeout: 15000 });
  const headerText = await page.locator('header').innerText();
  console.log('teacher header:', headerText.replace(/\s+/g, ' ').slice(0, 80));
  const teacherSelects = await page.locator('header select').count();
  console.log('teacher class selects:', teacherSelects);
  if (teacherSelects !== 0) throw new Error('班主任工作台不应有班级切换');
  await page.locator('aside').getByText('学生管理', { exact: true }).click();
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  await page.locator('table tbody tr').first().locator('button').first().click();
  await page.waitForSelector('text=家长信息', { timeout: 10000 });
  const teacherCanEdit = await page.locator('text=编辑成绩').count();
  console.log('teacher edit score button:', teacherCanEdit);
  if (teacherCanEdit !== 0) throw new Error('班主任不应看到编辑成绩按钮');
  await context.close();
}

await browser.close();

if (errors.length > 0) {
  console.log('ERRORS:');
  for (const e of errors) console.log(e);
  process.exit(1);
}
console.log('smoke test passed');
