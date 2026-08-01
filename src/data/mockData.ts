import type { Reminder, Exam, Student, Score, ExamTrendPoint, Announcement } from '@/types';

export const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_FULL_SCORES: Record<string, number> = {
  语文: 150,
  数学: 150,
  英语: 150,
  物理: 100,
  化学: 100,
  生物: 100,
};

export const getFullScore = (subject: string): number =>
  SUBJECT_FULL_SCORES[subject] ?? 100;

export const mockReminders: Reminder[] = [
  {
    id: '1',
    title: '期中考试',
    content: '下周一开始期中考试，为期三天',
    type: 'exam',
    dueDate: '2026-08-05',
    completed: false,
  },
  {
    id: '2',
    title: '家长会',
    content: '本周五下午 14:00 于学校礼堂召开家长会',
    type: 'activity',
    dueDate: '2026-07-31',
    completed: false,
  },
  {
    id: '3',
    title: '收齐实践报告',
    content: '请于本周五前收齐学生暑期社会实践报告',
    type: 'todo',
    dueDate: '2026-08-01',
    completed: false,
  },
  {
    id: '4',
    title: '备课组会议',
    content: '周三上午第三节课参加备课组会议',
    type: 'activity',
    dueDate: '2026-07-30',
    completed: true,
  },
];

export const mockExams: Exam[] = [
  { id: '1', name: '月考一', date: '2026-06-15', subject: '语文', classAverage: 82.5, gradeAverage: 80.2 },
  { id: '2', name: '月考一', date: '2026-06-15', subject: '数学', classAverage: 88.3, gradeAverage: 85.6 },
  { id: '3', name: '月考一', date: '2026-06-15', subject: '英语', classAverage: 79.6, gradeAverage: 78.1 },
  { id: '4', name: '月考一', date: '2026-06-15', subject: '物理', classAverage: 76.8, gradeAverage: 74.3 },
  { id: '5', name: '月考一', date: '2026-06-15', subject: '化学', classAverage: 81.2, gradeAverage: 79.5 },
  { id: '6', name: '月考一', date: '2026-06-15', subject: '生物', classAverage: 84.5, gradeAverage: 82.7 },
  { id: '7', name: '月考二', date: '2026-07-10', subject: '语文', classAverage: 84.1, gradeAverage: 81.5 },
  { id: '8', name: '月考二', date: '2026-07-10', subject: '数学', classAverage: 90.2, gradeAverage: 86.8 },
  { id: '9', name: '月考二', date: '2026-07-10', subject: '英语', classAverage: 82.3, gradeAverage: 79.4 },
  { id: '10', name: '月考二', date: '2026-07-10', subject: '物理', classAverage: 78.5, gradeAverage: 75.1 },
  { id: '11', name: '月考二', date: '2026-07-10', subject: '化学', classAverage: 83.6, gradeAverage: 80.9 },
  { id: '12', name: '月考二', date: '2026-07-10', subject: '生物', classAverage: 86.1, gradeAverage: 83.8 },
  { id: '13', name: '月考三', date: '2026-07-25', subject: '语文', classAverage: 85.8, gradeAverage: 82.3 },
  { id: '14', name: '月考三', date: '2026-07-25', subject: '数学', classAverage: 91.5, gradeAverage: 87.5 },
  { id: '15', name: '月考三', date: '2026-07-25', subject: '英语', classAverage: 83.7, gradeAverage: 80.6 },
  { id: '16', name: '月考三', date: '2026-07-25', subject: '物理', classAverage: 80.2, gradeAverage: 76.4 },
  { id: '17', name: '月考三', date: '2026-07-25', subject: '化学', classAverage: 85.1, gradeAverage: 82.0 },
  { id: '18', name: '月考三', date: '2026-07-25', subject: '生物', classAverage: 87.3, gradeAverage: 84.5 },
];

export const mockStudents: Student[] = [
  { id: '1', name: '陈思远', studentNo: '2026001', className: '高一(3)班', avatar: '', totalScore: 574, rank: 1, trend: 'up', trendValue: 12 },
  { id: '2', name: '林晓晴', studentNo: '2026002', className: '高一(3)班', avatar: '', totalScore: 562, rank: 2, trend: 'up', trendValue: 8 },
  { id: '3', name: '王浩然', studentNo: '2026003', className: '高一(3)班', avatar: '', totalScore: 550, rank: 3, trend: 'stable', trendValue: 0 },
  { id: '4', name: '赵雨桐', studentNo: '2026004', className: '高一(3)班', avatar: '', totalScore: 545, rank: 4, trend: 'up', trendValue: 6 },
  { id: '5', name: '刘思琪', studentNo: '2026005', className: '高一(3)班', avatar: '', totalScore: 538, rank: 5, trend: 'down', trendValue: -4 },
  { id: '6', name: '张家豪', studentNo: '2026006', className: '高一(3)班', avatar: '', totalScore: 532, rank: 6, trend: 'up', trendValue: 4 },
  { id: '7', name: '周梦瑶', studentNo: '2026007', className: '高一(3)班', avatar: '', totalScore: 528, rank: 7, trend: 'up', trendValue: 2 },
  { id: '8', name: '吴俊熙', studentNo: '2026008', className: '高一(3)班', avatar: '', totalScore: 520, rank: 8, trend: 'down', trendValue: -7 },
  { id: '9', name: '郑佳怡', studentNo: '2026009', className: '高一(3)班', avatar: '', totalScore: 515, rank: 9, trend: 'up', trendValue: 5 },
  { id: '10', name: '孙逸飞', studentNo: '2026010', className: '高一(3)班', avatar: '', totalScore: 508, rank: 10, trend: 'down', trendValue: -3 },
];

export const mockScores: Score[] = [];

export const examTrendData: ExamTrendPoint[] = [
  { examName: '月考一', date: '06/15', 语文: 82.5, 数学: 88.3, 英语: 79.6, 物理: 76.8, 化学: 81.2, 生物: 84.5 },
  { examName: '月考二', date: '07/10', 语文: 84.1, 数学: 90.2, 英语: 82.3, 物理: 78.5, 化学: 83.6, 生物: 86.1 },
  { examName: '月考三', date: '07/25', 语文: 85.8, 数学: 91.5, 英语: 83.7, 物理: 80.2, 化学: 85.1, 生物: 87.3 },
];

export const studentScoreTrend: Record<string, ExamTrendPoint[]> = {
  '1': [
    { examName: '月考一', date: '06/15', 语文: 92, 数学: 98, 英语: 88, 物理: 90, 化学: 91, 生物: 95 },
    { examName: '月考二', date: '07/10', 语文: 94, 数学: 100, 英语: 90, 物理: 92, 化学: 93, 生物: 96 },
    { examName: '月考三', date: '07/25', 语文: 95, 数学: 100, 英语: 92, 物理: 94, 化学: 95, 生物: 98 },
  ],
  '2': [
    { examName: '月考一', date: '06/15', 语文: 88, 数学: 92, 英语: 85, 物理: 82, 化学: 86, 生物: 90 },
    { examName: '月考二', date: '07/10', 语文: 90, 数学: 94, 英语: 87, 物理: 85, 化学: 88, 生物: 92 },
    { examName: '月考三', date: '07/25', 语文: 91, 数学: 95, 英语: 89, 物理: 87, 化学: 90, 生物: 93 },
  ],
  '3': [
    { examName: '月考一', date: '06/15', 语文: 85, 数学: 90, 英语: 82, 物理: 88, 化学: 84, 生物: 86 },
    { examName: '月考二', date: '07/10', 语文: 86, 数学: 91, 英语: 83, 物理: 89, 化学: 85, 生物: 87 },
    { examName: '月考三', date: '07/25', 语文: 86, 数学: 91, 英语: 83, 物理: 89, 化学: 85, 生物: 87 },
  ],
  '4': [
    { examName: '月考一', date: '06/15', 语文: 80, 数学: 85, 英语: 86, 物理: 78, 化学: 82, 生物: 88 },
    { examName: '月考二', date: '07/10', 语文: 83, 数学: 88, 英语: 88, 物理: 82, 化学: 85, 生物: 90 },
    { examName: '月考三', date: '07/25', 语文: 85, 数学: 90, 英语: 89, 物理: 84, 化学: 87, 生物: 90 },
  ],
  '5': [
    { examName: '月考一', date: '06/15', 语文: 86, 数学: 94, 英语: 90, 物理: 85, 化学: 88, 生物: 92 },
    { examName: '月考二', date: '07/10', 语文: 84, 数学: 92, 英语: 88, 物理: 83, 化学: 86, 生物: 90 },
    { examName: '月考三', date: '07/25', 语文: 83, 数学: 91, 英语: 86, 物理: 82, 化学: 85, 生物: 91 },
  ],
  '6': [
    { examName: '月考一', date: '06/15', 语文: 78, 数学: 82, 英语: 84, 物理: 80, 化学: 79, 生物: 85 },
    { examName: '月考二', date: '07/10', 语文: 81, 数学: 86, 英语: 86, 物理: 83, 化学: 82, 生物: 87 },
    { examName: '月考三', date: '07/25', 语文: 83, 数学: 88, 英语: 87, 物理: 84, 化学: 83, 生物: 87 },
  ],
  '7': [
    { examName: '月考一', date: '06/15', 语文: 84, 数学: 88, 英语: 80, 物理: 86, 化学: 83, 生物: 85 },
    { examName: '月考二', date: '07/10', 语文: 85, 数学: 89, 英语: 81, 物理: 87, 化学: 84, 生物: 86 },
    { examName: '月考三', date: '07/25', 语文: 85, 数学: 90, 英语: 82, 物理: 87, 化学: 84, 生物: 86 },
  ],
  '8': [
    { examName: '月考一', date: '06/15', 语文: 90, 数学: 95, 英语: 92, 物理: 88, 化学: 90, 生物: 94 },
    { examName: '月考二', date: '07/10', 语文: 87, 数学: 92, 英语: 89, 物理: 85, 化学: 87, 生物: 91 },
    { examName: '月考三', date: '07/25', 语文: 85, 数学: 90, 英语: 87, 物理: 83, 化学: 85, 生物: 90 },
  ],
  '9': [
    { examName: '月考一', date: '06/15', 语文: 82, 数学: 86, 英语: 78, 物理: 84, 化学: 81, 生物: 83 },
    { examName: '月考二', date: '07/10', 语文: 85, 数学: 89, 英语: 81, 物理: 86, 化学: 84, 生物: 86 },
    { examName: '月考三', date: '07/25', 语文: 86, 数学: 90, 英语: 83, 物理: 87, 化学: 85, 生物: 86 },
  ],
  '10': [
    { examName: '月考一', date: '06/15', 语文: 83, 数学: 87, 英语: 81, 物理: 79, 化学: 80, 生物: 84 },
    { examName: '月考二', date: '07/10', 语文: 82, 数学: 85, 英语: 80, 物理: 78, 化学: 79, 生物: 83 },
    { examName: '月考三', date: '07/25', 语文: 81, 数学: 84, 英语: 79, 物理: 77, 化学: 78, 生物: 82 },
  ],
};

export const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: '期中考试安排通知',
    content: '期中考试将于8月5日开始，为期三天，请各学科老师做好考前准备工作。',
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
    title: '月考三成绩出炉',
    content: '本次月考班级整体进步明显，语文、数学、物理进步显著，特此表扬！',
    level: 'success',
    date: '2026-07-27',
  },
];

export function getStudentTotalScores(examIndex: number): { id: string; name: string; total: number; prevTotal: number }[] {
  return mockStudents.map((student) => {
    const trend = studentScoreTrend[student.id];
    if (!trend || trend.length <= examIndex) {
      return { id: student.id, name: student.name, total: student.totalScore, prevTotal: student.totalScore };
    }
    const current = trend[examIndex];
    const prev = examIndex > 0 ? trend[examIndex - 1] : current;
    const total = SUBJECTS.reduce((sum, s) => sum + (current[s] as number), 0);
    const prevTotal = SUBJECTS.reduce((sum, s) => sum + (prev[s] as number), 0);
    return { id: student.id, name: student.name, total, prevTotal };
  });
}

export const EXAM_NAMES = ['月考一', '月考二', '月考三'] as const;

export function getTopImprovements(examIndex = 2, limit = 5) {
  const scores = getStudentTotalScores(examIndex);
  return scores
    .map((s) => ({ ...s, diff: s.total - s.prevTotal }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, limit);
}

export function getTopDeclines(examIndex = 2, limit = 5) {
  const scores = getStudentTotalScores(examIndex);
  return scores
    .map((s) => ({ ...s, diff: s.total - s.prevTotal }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, limit);
}

export function getExamName(index: number): string {
  return EXAM_NAMES[index] || '';
}

export function getClassAverageByExam(examIndex: number): { subject: string; classAverage: number; gradeAverage: number }[] {
  const examsByIndex: Record<number, { subject: string; classAverage: number; gradeAverage: number }[]> = {
    0: [
      { subject: '语文', classAverage: 82.5, gradeAverage: 80.2 },
      { subject: '数学', classAverage: 88.3, gradeAverage: 85.6 },
      { subject: '英语', classAverage: 79.6, gradeAverage: 78.1 },
      { subject: '物理', classAverage: 76.8, gradeAverage: 74.3 },
      { subject: '化学', classAverage: 81.2, gradeAverage: 79.5 },
      { subject: '生物', classAverage: 84.5, gradeAverage: 82.7 },
    ],
    1: [
      { subject: '语文', classAverage: 84.1, gradeAverage: 81.5 },
      { subject: '数学', classAverage: 90.2, gradeAverage: 86.8 },
      { subject: '英语', classAverage: 82.3, gradeAverage: 79.4 },
      { subject: '物理', classAverage: 78.5, gradeAverage: 75.1 },
      { subject: '化学', classAverage: 83.6, gradeAverage: 80.9 },
      { subject: '生物', classAverage: 86.1, gradeAverage: 83.8 },
    ],
    2: [
      { subject: '语文', classAverage: 85.8, gradeAverage: 82.3 },
      { subject: '数学', classAverage: 91.5, gradeAverage: 87.5 },
      { subject: '英语', classAverage: 83.7, gradeAverage: 80.6 },
      { subject: '物理', classAverage: 80.2, gradeAverage: 76.4 },
      { subject: '化学', classAverage: 85.1, gradeAverage: 82.0 },
      { subject: '生物', classAverage: 87.3, gradeAverage: 84.5 },
    ],
  };
  return examsByIndex[examIndex] || examsByIndex[2];
}

export function getTotalClassAverageByExam(examIndex: number): number {
  const data = getClassAverageByExam(examIndex);
  const total = data.reduce((sum, d) => sum + d.classAverage, 0);
  return Math.round((total / data.length) * 10) / 10;
}

export function getStudentExamRank(examIndex: number): { id: string; name: string; total: number; rank: number; trend: number }[] {
  const scores = getStudentTotalScores(examIndex);
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  return sorted.map((s, idx) => ({
    id: s.id,
    name: s.name,
    total: s.total,
    rank: idx + 1,
    trend: s.total - s.prevTotal,
  }));
}
