-- 班级私有考试（班主任可录入本班成绩）
-- scope_class_no = 0 全校考试(默认)；>0 仅该班班主任录入，班主任页面与该班学生页面可见

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS scope_class_no INTEGER NOT NULL DEFAULT 0;

-- 原 staff read（admin+teacher 均可读全部）拆分为：admin 仍全量、teacher 仅 本校+本班
DROP POLICY IF EXISTS "staff read exams" ON public.exams;
DROP POLICY IF EXISTS "student read exams" ON public.exams;

CREATE POLICY "teacher read exams" ON public.exams FOR SELECT TO authenticated
  USING (
    "current_role"() = 'teacher'
    AND (scope_class_no = 0 OR scope_class_no = "current_class_no"())
  );

CREATE POLICY "teacher insert class exams" ON public.exams FOR INSERT TO authenticated
  WITH CHECK (
    "current_role"() = 'teacher'
    AND scope_class_no = "current_class_no"()
  );

CREATE POLICY "teacher update class exams" ON public.exams FOR UPDATE TO authenticated
  USING (
    "current_role"() = 'teacher'
    AND scope_class_no = "current_class_no"()
  )
  WITH CHECK (
    "current_role"() = 'teacher'
    AND scope_class_no = "current_class_no"()
  );

CREATE POLICY "teacher delete class exams" ON public.exams FOR DELETE TO authenticated
  USING (
    "current_role"() = 'teacher'
    AND scope_class_no = "current_class_no"()
  );

CREATE POLICY "student read exams" ON public.exams FOR SELECT TO authenticated
  USING (
    "current_role"() = 'student'
    AND (
      scope_class_no = 0
      OR scope_class_no = (
        SELECT class_no FROM public.students WHERE auth_id = auth.uid() LIMIT 1
      )
    )
  );

-- 管理员策略 "admin all on exams" 保持不变（全量可见）