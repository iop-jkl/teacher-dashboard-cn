import { readFileSync } from 'node:fs';

const base = '.import-data';
const students = JSON.parse(readFileSync(`${base}/students.json`, 'utf8'));
const scores = JSON.parse(readFileSync(`${base}/scores.json`, 'utf8'));
const byId = new Map(students.map((s) => [s.id_card, s]));

let bad = 0;
let absent = 0;
let nullAssigned = 0;
let totalDiff = 0;
let other = 0;
for (const s of students) {
  const rows = scores.filter((x) => x.student_id === s.id_card);
  if (rows.length !== 7) {
    bad++;
    other++;
    continue;
  }
  const totalRow = rows.find((x) => x.subject === '总分');
  if (!totalRow) {
    bad++;
    other++;
    continue;
  }
  const subjects = rows
    .filter((x) => x.subject !== '总分')
    .map((x) => x.subject);
  if (subjects.length !== 6 || new Set(subjects).size !== 6) {
    bad++;
    other++;
  }
  const selectedRows = rows.filter((x) =>
    s.selected_subjects.includes(x.subject),
  );
  if (selectedRows.length !== 3) {
    bad++;
    other++;
  } else if (selectedRows.some((x) => x.assigned_score == null)) {
    nullAssigned++;
  }
  const compTotal = rows
    .filter((x) => x.subject !== '总分')
    .reduce((sum, x) => {
      const v = s.selected_subjects.includes(x.subject)
        ? x.assigned_score
        : x.raw_score;
      return sum + (v == null ? 0 : v);
    }, 0);
  if (Math.abs(compTotal - (totalRow.assigned_score || 0)) > 0.05) {
    totalDiff++;
    if (totalDiff <= 5) {
      console.log('total mismatch', s.id_card, compTotal, totalRow.assigned_score);
    }
  }
  if ((totalRow.assigned_score || 0) === 0) absent++;
}
console.log('invalid students:', bad, { absent, nullAssigned, totalDiff, other });

const c1 = scores
  .filter(
    (x) => x.subject === '总分' && byId.get(x.student_id)?.class_no === 1,
  )
  .sort((a, b) => a.class_rank - b.class_rank);
console.log(
  'class1 top5:',
  c1.slice(0, 5).map((x) => `${x.class_rank}:${x.assigned_score}:${byId.get(x.student_id)?.name}`),
);
console.log('class1 max rank:', c1[c1.length - 1]?.class_rank, 'count:', c1.length);

const s = students[0];
console.log('sample student:', JSON.stringify(s));
console.log(
  'sample scores:',
  JSON.stringify(scores.filter((x) => x.student_id === s.id_card)),
);
