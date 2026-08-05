import type { Student } from '@/types';

// ============================================================
// 访客（guest）模式隐私脱敏工具：
//   - 姓名：由身份证号派生稳定代号（同页面间一致），不暴露真实姓名
//   - 身份证号：整体打码
//   - 家长姓名/电话/微信：统一打码
// ============================================================

export function isGuestRole(role?: string): boolean {
  return role === 'guest';
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 姓名 → 稳定的演示代号，如「学生312」 */
export function maskName(_name: string, idCard: string): string {
  if (!idCard) return '学生';
  const n = (hashString(idCard) % 899) + 100;
  return `学生${n}`;
}

/** 身份证号整体打码 */
export function maskIdCard(idCard: string): string {
  return idCard ? '*'.repeat(idCard.length) : '';
}

/** 家长姓名/电话/微信等敏感字段打码 */
export function maskField(v: string): string {
  return v ? '***' : '';
}

/** 脱敏后的学生展示对象（idCard 保留真实值用于链接与成绩关联，展示时请用 maskIdCard） */
export function maskedStudent(s: Student): Student {
  return {
    ...s,
    name: maskName(s.name, s.idCard),
    fatherName: maskField(s.fatherName),
    fatherPhone: maskField(s.fatherPhone),
    fatherWechat: maskField(s.fatherWechat),
    motherName: maskField(s.motherName),
    motherPhone: maskField(s.motherPhone),
    motherWechat: maskField(s.motherWechat),
  };
}
