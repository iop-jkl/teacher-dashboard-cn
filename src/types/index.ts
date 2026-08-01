export interface Reminder {
  id: string;
  title: string;
  content: string;
  type: 'exam' | 'activity' | 'todo';
  dueDate: string;
  completed: boolean;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  subject: string;
  classAverage: number;
  gradeAverage: number;
}

export interface Student {
  id: string;
  name: string;
  studentNo: string;
  className: string;
  avatar: string;
  totalScore: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  remark?: string;
}

export interface Score {
  id: string;
  studentId: string;
  examId: string;
  subject: string;
  score: number;
  classRank: number;
  totalStudents: number;
}

export interface ExamTrendPoint {
  examName: string;
  date: string;
  [subject: string]: string | number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  level: 'info' | 'warning' | 'success';
  date: string;
}

export interface SubjectScore {
  subject: string;
  score: number;
  classRank: number;
}
