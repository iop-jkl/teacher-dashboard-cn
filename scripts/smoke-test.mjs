import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(
  'C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);

// 用法：node scripts/smoke-test.mjs <部署URL>
const BASE = process.argv[2] || 'http://localhost:5173';
const EXCEL = 'C:/Users/lenovo/Desktop/期末考试.xls';

// 当前真实账号（勿提交到仓库）
const ADMIN = { name: 'admin', password: process.env.ADMIN_PASSWORD || 'QW!4Uh%gTT8FVx' };
const TEACHER = { name: '5', password: process.env.TEACHER_PASSWORD || 'ky987ReJ%#pjDZ' };

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
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#username', { timeout: 30000 });
  const placeholder = await page.locator('#username').getAttribute('placeholder');
  if (!placeholder || !placeholder.includes('账号')) {
    throw new Error('登录提示应包含账号');
  }
  const adminCards = await page.locator('text=管理员').count();
  if (adminCards !== 0) throw new Error('登录界面不应显示角色选项卡片');
}

async function login(page, name, password) {
  await page.fill('#username', name);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => url.pathname.endsWith('/') || url.pathname.endsWith('/teacher-dashboard-cn'),
    { timeout: 15000 },
  );
}

// ===== 管理员 =====
{
  const { context, page } = await newPage();
  await gotoLogin(page);
  await login(page, ADMIN.name, ADMIN.password);
  await page.waitForSelector('text=工作台', { timeout: 20000 });
  console.log('admin login ok');
  const dashHeader = (await page.locator('header').innerText()).replace(/\s+/g, ' ');
  if (!dashHeader.includes('全部班级')) throw new Error('管理员工作台默认应为全部班级');
  console.log('dashboard header:', dashHeader.slice(0, 80));

  // 全量成绩渐进加载完成后，排名表应有真实总分（>0）而非 0.00
  // 网络波动可能让首次加载失败，此时重载让应用重新加载；劣网下全量加载可达数分钟
  for (let attempt = 0; attempt < 2; attempt++) {
    const done = await page
      .waitForFunction(
        () => {
          const trs = document.querySelectorAll('tbody tr');
          if (trs.length === 0) return false;
          for (let i = 0; i < Math.min(trs.length, 20); i++) {
            const m = trs[i].innerText.match(/\d+\.\d{2}/);
            if (m !== null && Number(m[0]) > 0) return true;
          }
          return false;
        },
        { timeout: 180000 },
      )
      .then(() => true)
      .catch(() => false);
    if (done) break;
    if (attempt === 0) {
      console.log('ranking total not loaded in 180s, reloading once');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('text=工作台', { timeout: 20000 });
    } else {
      throw new Error('排名表应显示真实总分（>0）');
    }
  }
  console.log('dashboard ranking total ok');

  // 设置页：修改密码卡片 + 班主任账号 + 家长导入（admin）
  await page.locator('aside').getByText('设置', { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/settings'), { timeout: 15000 });
  await page.waitForSelector('text=修改密码', { timeout: 15000 });
  await page.waitForSelector('text=班主任账号', { timeout: 15000 });
  await page.waitForSelector('text=家长信息导入', { timeout: 15000 });
  console.log('admin settings panes ok');

  // 学生管理
  await page.locator('aside').getByText('学生管理', { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/students'), { timeout: 15000 });
  await page.waitForSelector('text=共 4039 名学生', { timeout: 60000 });
  console.log('all classes count ok');
  await page.locator('header select').selectOption('1');
  await page.waitForSelector('text=共 47 名学生', { timeout: 60000 });
  await page.waitForSelector('table tbody tr', { timeout: 60000 });
  const firstRowText = await page.locator('table tbody tr').first().innerText();
  console.log('first row:', firstRowText.replace(/\s+/g, ' ').slice(0, 120));
  if (!firstRowText.includes('1班')) throw new Error('学生列表应显示班级');
  if (!firstRowText.includes('高一')) throw new Error('学生列表应显示年级');
  if (firstRowText.includes('684.15')) throw new Error('学生管理列表不应显示成绩');

  // 详情弹窗：家长信息 + 班主任“重置密码”按钮（管理员不可见）
  await page.locator('table tbody tr').first().locator('button').first().click();
  await page.waitForSelector('text=家长信息', { timeout: 10000 });
  const adminResetBtn = await page.locator('button:has-text("重置密码")').count();
  if (adminResetBtn !== 0) throw new Error('管理员重置学生密码按钮不应出现');
  console.log('admin student modal ok, reset btn (admin):', adminResetBtn);
  await page.locator('button:has-text("关闭")').first().click();

  // 成绩分析
  await page.locator('aside').getByText('成绩分析', { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/analytics'), { timeout: 15000 });
  await page.locator('button:has-text("学生排名")').click();
  await page.waitForSelector('text=全部成绩与排名', { timeout: 20000 });
  // 全部班级排名表首行应有真实总分
  await page.waitForFunction(
    () => {
      const trs = document.querySelectorAll('tbody tr');
      if (trs.length === 0) return false;
      const m = trs[0].innerText.match(/\d+\.\d{2}/);
      return m !== null && Number(m[0]) > 0;
    },
    { timeout: 90000 },
  );
  const rankTableText = (await page.locator('table').first().innerText()).replace(/\s+/g, ' ');
  if (!rankTableText.includes('语文') || !rankTableText.includes('班')) {
    throw new Error('成绩分析应显示全部成绩及排名');
  }
  console.log('rank table sample:', rankTableText.slice(0, 160));

  // 工作台：快捷操作 + 匿名信箱入口
  await page.locator('aside').getByText('工作台', { exact: true }).click();
  await page.waitForSelector('text=快捷操作', { timeout: 15000 });
  const dashAnonMail = await page.locator('text=匿名信箱').count();
  console.log('dashboard anon mail cards:', dashAnonMail);
  // Excel 成绩导入预览（仅解析，不提交）
  await page.locator('button:has-text("录入成绩")').first().click();
  await page.waitForSelector('input[type="date"]', { timeout: 10000 });
  await page.locator('input[type="file"]').setInputFiles(EXCEL);
  await page.waitForSelector('text=/考试名称：.*/', { timeout: 60000 });
  const previewBox = page.locator('.bg-teal-50').filter({ hasText: '考试名称' }).first();
  await previewBox.waitFor({ state: 'visible', timeout: 30000 });
  const previewText = (await previewBox.innerText()).replace(/\s+/g, ' ');
  console.log('excel preview:', previewText.slice(0, 120));
  if (!/学生 \d+ 人/.test(previewText)) throw new Error('Excel 预览应显示学生人数');
  await page.locator('button:has-text("取消")').first().click();

  await context.close();
}

// ===== 班主任（5班）=====
{
  const { context, page } = await newPage();
  await gotoLogin(page);
  await login(page, TEACHER.name, TEACHER.password);
  await page.waitForSelector('text=工作台', { timeout: 20000 });
  console.log('teacher login ok');
  const headerText = await page.locator('header').innerText();
  console.log('teacher header:', headerText.replace(/\s+/g, ' ').slice(0, 80));
  const teacherSelects = await page.locator('header select').count();
  if (teacherSelects !== 0) throw new Error('班主任工作台不应有班级切换');

  // 导航：设置应在匿名信箱下方
  const teacherNav = (await page.locator('aside nav').innerText())
    .split('\n')
    .filter(Boolean);
  console.log('teacher nav:', teacherNav.join(' / '));
  const mailIdx = teacherNav.findIndex((x) => x === '匿名信箱');
  const settingsIdx = teacherNav.findIndex((x) => x === '设置');
  if (settingsIdx < 0 || mailIdx < 0 || settingsIdx < mailIdx) {
    throw new Error('班主任导航“设置”应在“匿名信箱”下方');
  }

  // 学生管理 + 重置密码按钮
  await page.locator('aside').getByText('学生管理', { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/students'), { timeout: 15000 });
  await page.waitForSelector('table tbody tr', { timeout: 20000 });
  await page.locator('table tbody tr').first().locator('button').first().click();
  await page.waitForSelector('text=家长信息', { timeout: 10000 });
  const teacherEditBtn = await page.locator('text=编辑成绩').count();
  if (teacherEditBtn !== 0) throw new Error('班主任不应看到编辑成绩按钮');
  const teacherResetBtn = await page.locator('button:has-text("重置密码")').count();
  if (teacherResetBtn !== 1) throw new Error('班主任应看到学生重置密码按钮');
  console.log('teacher student modal ok, reset btn:', teacherResetBtn);
  await page.locator('button:has-text("关闭")').first().click();

  // 设置：修改密码卡片 + 无分班管理
  await page.locator('aside').getByText('设置', { exact: true }).click();
  await page.waitForSelector('text=修改密码', { timeout: 15000 });
  const teacherClassChange = await page.locator('text=分班管理').count();
  if (teacherClassChange !== 0) throw new Error('班主任不应看到分班管理');
  console.log('teacher settings ok');

  // 匿名信箱列表页
  await page.locator('aside').getByText('匿名信箱', { exact: true }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/messages'), { timeout: 15000 });
  await page.waitForSelector('text=收到的匿名信', { timeout: 15000 });
  console.log('teacher messages page ok');

  await context.close();
}

// ===== 学生（5班随机一名）=====
{
  const { context, page } = await newPage();
  await gotoLogin(page);
  // 5班学生：密码=身份证后8位，由外部脚本取值传入
  const student = process.env.STUDENT_NAME && process.env.STUDENT_PASSWORD
    ? { name: process.env.STUDENT_NAME, password: process.env.STUDENT_PASSWORD }
    : null;
  if (student) {
    await page.fill('#username', student.name);
    await page.fill('#password', student.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
    await page.waitForSelector('text=修改密码', { timeout: 20000 });
    console.log('student portal ok (我的成绩 + 修改密码)');
  } else {
    console.log('skip student pass (no STUDENT_NAME/STUDENT_PASSWORD)');
  }
  await context.close();
}

await browser.close();

if (errors.length > 0) {
  console.log('ERRORS:');
  for (const e of errors) console.log(e);
  process.exit(1);
}
console.log('smoke test passed');