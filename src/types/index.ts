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
}

export interface Student {
  idCard: string;
  name: string;
  classNo: number;
  selectedSubjects: string[];
  fatherName: string;
  fatherPhone: string;
  fatherWechat: string;
  motherName: string;
  motherPhone: string;
  motherWechat: string;
  remark: string;
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
  password: string;
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
