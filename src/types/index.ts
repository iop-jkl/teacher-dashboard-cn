export interface Reminder {
  id: string;
  title: string;
  content: string;
  type: 'exam' | 'activity' | 'todo';
  dueDate: string;
  completed: boolean;
  owner?: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  scopeClassNo: number;
}

export interface Student {
  idCard: string;
  name: string;
  classNo: number;
  grade: string;
  selectedSubjects: string[];
  fatherName: string;
  fatherPhone: string;
  fatherWechat: string;
  motherName: string;
  motherPhone: string;
  motherWechat: string;
  remark: string;
  teacherComment?: string;
}

export interface StudentGoal {
  studentId: string;
  totalGoal: number | null;
}

export interface Score {
  studentId: string;
  examId: string;
  subject: string;
  rawScore: number | null;
  assignedScore: number | null;
  schoolRank: number;
  classRank: number;
}

export interface ClassTeacher {
  classNo: number;
  teacherName: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  level: 'info' | 'warning' | 'success';
  date: string;
}

export interface ExamTrendPoint {
  examName: string;
  date: string;
  [subject: string]: string | number;
}

export interface SubjectScore {
  subject: string;
  rawScore: number | null;
  assignedScore: number | null;
  classRank: number;
  schoolRank: number;
}

export interface GradeSummaryRow {
  examId: string;
  classNo: number;
  totalAvg: number | null;
  subjectAvg: Record<string, number | null>;
  studentCount: number;
}
