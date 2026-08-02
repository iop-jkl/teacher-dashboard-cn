export const COMPULSORY = ['语文', '数学', '英语'] as const;
export const ALL_SUBJECTS = [
  '语文',
  '数学',
  '英语',
  '政治',
  '历史',
  '地理',
  '物理',
  '化学',
  '生物',
] as const;

export const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_FULL_SCORES: Record<string, number> = {
  语文: 150,
  数学: 150,
  英语: 150,
  政治: 100,
  历史: 100,
  地理: 100,
  物理: 100,
  化学: 100,
  生物: 100,
};

export const getFullScore = (subject: string): number =>
  SUBJECT_FULL_SCORES[subject] ?? 100;
