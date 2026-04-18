const { Client } = require('pg');

async function debugGPA() {
  const client = new Client({ connectionString: 'postgresql://localhost:5432/sll_database' });
  await client.connect();

  const studentId = 'd81e5cea-9607-4a50-b3d1-64cee7a1cb46';
  const academicYearId = 'e1165b9f-2e0c-4591-bc68-17cbfa2d9865';
  const semester = 'SEMESTER_1';

  console.log(`Debugging GPA for Student: ${studentId}, Year: ${academicYearId}, Semester: ${semester}`);

  const res = await client.query(
    'SELECT "subjectId", score, coefficient, "gradeType", "isPublished" FROM grade_records WHERE "studentId" = $1 AND "academicYearId" = $2 AND semester = $3 AND "isPublished" = true',
    [studentId, academicYearId, semester]
  );

  const grades = res.rows;
  console.log(`Found ${grades.length} published grades.`);

  const subjectMap = new Map();
  grades.forEach((grade) => {
    const sid = grade.subjectId;
    if (!subjectMap.has(sid)) {
      subjectMap.set(sid, { grades: [] });
    }
    subjectMap.get(sid).grades.push(grade);
  });

  for (const [sid, subject] of subjectMap.entries()) {
    let totalWeightedScore = 0;
    let totalCoefficient = 0;

    console.log(`\nSubject: ${sid}`);
    subject.grades.forEach((grade) => {
      const score = Number(grade.score);
      const coefficient = Number(grade.coefficient);
      console.log(`  Grade: type=${grade.gradeType}, score=${score} (raw=${grade.score}), coeff=${coefficient} (raw=${grade.coefficient})`);
      totalWeightedScore += score * coefficient;
      totalCoefficient += coefficient;
    });

    const average = totalCoefficient > 0 ? totalWeightedScore / totalCoefficient : 0;
    console.log(`  Summary: totalWeightedScore=${totalWeightedScore}, totalCoefficient=${totalCoefficient}, average=${average}`);
  }

  await client.end();
}

debugGPA().catch(console.error);
