import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  await knex('AuditLogs').del();
  await knex('Responses').del();
  await knex('Attempts').del();
  await knex('QuizAssignments').del();
  await knex('Options').del();
  await knex('Questions').del();
  await knex('Quizzes').del();
  await knex('Users').del();

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const passwordHashStudent = await bcrypt.hash('Student123!', 10);

  const [adminId] = await knex('Users').insert({
    Role: 'admin',
    Name: 'System Administrator',
    Email: 'admin@quizmaster.dev',
    PasswordHash: passwordHash
  });

  const [teacherId] = await knex('Users').insert({
    Role: 'teacher',
    Name: 'Tara Teacher',
    Email: 'teacher@quizmaster.dev',
    PasswordHash: passwordHash
  });

  const [studentId] = await knex('Users').insert({
    Role: 'student',
    Name: 'Sam Student',
    Email: 'student@quizmaster.dev',
    PasswordHash: passwordHashStudent
  });

  const [quizId] = await knex('Quizzes').insert({
    CreatorID: teacherId,
    Title: 'MySQL Fundamentals',
    Description: 'Assess your knowledge of SQL and relational design.',
    Category: 'Databases',
    TimeLimit: 1800,
    StartTime: knex.fn.now(),
    EndTime: null,
    Published: 1
  });

  const [question1Id] = await knex('Questions').insert({
    QuizID: quizId,
    QuestionType: 'mcq',
    QuestionText: 'What does SQL stand for?',
    Points: 5,
    Difficulty: 'easy',
    TagList: 'terminology'
  });

  const [question2Id] = await knex('Questions').insert({
    QuizID: quizId,
    QuestionType: 'mcq',
    QuestionText: 'Which statement is used to remove a table and its data?',
    Points: 5,
    Difficulty: 'medium',
    TagList: 'ddl'
  });

  const [question3Id] = await knex('Questions').insert({
    QuizID: quizId,
    QuestionType: 'true_false',
    QuestionText: 'A foreign key can reference a non-primary candidate key.',
    Points: 5,
    Difficulty: 'medium',
    TagList: 'constraints'
  });

  await knex('Options').insert([
    { QuestionID: question1Id, OptionText: 'Structured Query Language', IsCorrect: 1, Feedback: 'Correct definition.' },
    { QuestionID: question1Id, OptionText: 'Sequential Query Logic', IsCorrect: 0, Feedback: 'Close, but not quite.' },
    { QuestionID: question1Id, OptionText: 'Simple Question Language', IsCorrect: 0, Feedback: 'Not the standard acronym.' },

    { QuestionID: question2Id, OptionText: 'DELETE TABLE customers;', IsCorrect: 0, Feedback: 'DELETE removes rows, not tables.' },
    { QuestionID: question2Id, OptionText: 'DROP TABLE customers;', IsCorrect: 1, Feedback: 'DROP removes table definition and data.' },
    { QuestionID: question2Id, OptionText: 'REMOVE TABLE customers;', IsCorrect: 0, Feedback: 'Not valid SQL syntax.' },

    { QuestionID: question3Id, OptionText: 'True', IsCorrect: 1, Feedback: 'Foreign keys can reference unique candidate keys.' },
    { QuestionID: question3Id, OptionText: 'False', IsCorrect: 0, Feedback: 'They are not limited to primary keys only.' }
  ]);

  const [assignmentId] = await knex('QuizAssignments').insert({
    QuizID: quizId,
    StudentID: studentId,
    DueDate: knex.fn.now(),
    Status: 'assigned'
  });

  // create attempt with responses demonstrating triggers and procedure
  const [attemptId] = await knex('Attempts').insert({
    StudentID: studentId,
    QuizID: quizId,
    Status: 'in_progress'
  });

  const question1Correct = await knex('Options')
    .select('OptionID')
    .where({ QuestionID: question1Id, IsCorrect: 1 })
    .first<{ OptionID: number }>();
  const question2Correct = await knex('Options')
    .select('OptionID')
    .where({ QuestionID: question2Id, IsCorrect: 1 })
    .first<{ OptionID: number }>();
  const question3Incorrect = await knex('Options')
    .select('OptionID')
    .where({ QuestionID: question3Id, IsCorrect: 0 })
    .first<{ OptionID: number }>();

  await knex('Responses').insert([
    {
      AttemptID: attemptId,
      QuestionID: question1Id,
      SelectedOptionID: question1Correct?.OptionID ?? null
    },
    {
      AttemptID: attemptId,
      QuestionID: question2Id,
      SelectedOptionID: question2Correct?.OptionID ?? null
    },
    {
      AttemptID: attemptId,
      QuestionID: question3Id,
      SelectedOptionID: question3Incorrect?.OptionID ?? null
    }
  ]);

  await knex.raw('CALL CalculateAttemptScore(?)', [attemptId]);
  await knex('Attempts').where({ AttemptID: attemptId }).update({ Status: 'submitted' });

  // add audit log entry for admin seeding clarity
  await knex('AuditLogs').insert({
    ActorID: adminId,
    Action: 'seed_completed',
    EntityType: 'System',
    EntityID: 0,
    Payload: JSON.stringify({ quizId, assignmentId, attemptId })
  });
}
