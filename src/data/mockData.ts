import type { Reminder, Exam, Student, Score, Announcement } from '@/types';

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

export const mockReminders: Reminder[] = [
  {
    id: '1',
    title: '期末考试',
    content: '期末考试已结束，请及时完成成绩核对与家长沟通。',
    type: 'exam',
    dueDate: '2026-08-05',
    completed: false,
  },
  {
    id: '2',
    title: '家长会',
    content: '本周五下午 14:00 于学校礼堂召开家长会。',
    type: 'activity',
    dueDate: '2026-07-31',
    completed: false,
  },
  {
    id: '3',
    title: '收取实践报告',
    content: '请于本周五前收齐学生暑期社会实践报告。',
    type: 'todo',
    dueDate: '2026-08-01',
    completed: false,
  },
  {
    id: '4',
    title: '备课组会议',
    content: '周三上午第三节课参加备课组会议。',
    type: 'activity',
    dueDate: '2026-07-30',
    completed: true,
  },
];

export const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: '期末考试安排通知',
    content: '期末考试已结束，请各科老师做好成绩分析与家校沟通工作。',
    level: 'info',
    date: '2026-07-29',
  },
  {
    id: '2',
    title: '注意事项',
    content: '近期部分同学学习状态有所下滑，建议加强家校沟通。',
    level: 'warning',
    date: '2026-07-28',
  },
  {
    id: '3',
    title: '期末成绩出炉',
    content: '本次期末成绩已导入，可查看各科原始分、赋分与排名。',
    level: 'success',
    date: '2026-07-27',
  },
];

export const mockStudents: Student[] = [];
export const mockScores: Score[] = [];
export const mockExams: Exam[] = [];
