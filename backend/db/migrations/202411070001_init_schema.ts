import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('Users', (table) => {
    table.increments('UserID').primary();
    table.enum('Role', ['student', 'teacher', 'admin']).notNullable().defaultTo('student');
    table.string('Name', 100).notNullable();
    table.string('Email', 100).notNullable().unique();
    table.string('PasswordHash', 255).notNullable();
    table.timestamp('LastLogin').nullable();
    table.timestamp('CreatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('Quizzes', (table) => {
    table.increments('QuizID').primary();
    table
      .integer('CreatorID')
      .unsigned()
      .notNullable()
      .references('UserID')
      .inTable('Users')
      .onDelete('CASCADE');
    table.string('Title', 255).notNullable();
    table.text('Description').nullable();
    table.string('Category', 100).nullable();
    table.integer('TimeLimit').notNullable();
    table.dateTime('StartTime').nullable();
    table.dateTime('EndTime').nullable();
    table.boolean('Published').notNullable().defaultTo(false);
    table.timestamp('CreatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('Questions', (table) => {
    table.increments('QuestionID').primary();
    table
      .integer('QuizID')
      .unsigned()
      .notNullable()
      .references('QuizID')
      .inTable('Quizzes')
      .onDelete('CASCADE');
    table.enum('QuestionType', ['mcq', 'short_answer', 'true_false']).notNullable();
    table.text('QuestionText').notNullable();
    table.integer('Points').notNullable().defaultTo(1);
    table.string('Difficulty', 50).nullable();
    table.string('TagList', 255).nullable();
  });

  await knex.schema.createTable('Options', (table) => {
    table.increments('OptionID').primary();
    table
      .integer('QuestionID')
      .unsigned()
      .notNullable()
      .references('QuestionID')
      .inTable('Questions')
      .onDelete('CASCADE');
    table.string('OptionText', 255).notNullable();
    table.boolean('IsCorrect').notNullable().defaultTo(false);
    table.string('Feedback', 255).nullable();
  });

  await knex.schema.createTable('QuizAssignments', (table) => {
    table.increments('AssignmentID').primary();
    table
      .integer('QuizID')
      .unsigned()
      .notNullable()
      .references('QuizID')
      .inTable('Quizzes')
      .onDelete('CASCADE');
    table
      .integer('StudentID')
      .unsigned()
      .notNullable()
      .references('UserID')
      .inTable('Users')
      .onDelete('CASCADE');
    table.dateTime('DueDate').nullable();
    table.enum('Status', ['assigned', 'completed', 'overdue']).defaultTo('assigned');
    table.timestamp('CreatedAt').defaultTo(knex.fn.now());
    table.unique(['QuizID', 'StudentID']);
  });

  await knex.schema.createTable('Attempts', (table) => {
    table.increments('AttemptID').primary();
    table
      .integer('StudentID')
      .unsigned()
      .notNullable()
      .references('UserID')
      .inTable('Users')
      .onDelete('CASCADE');
    table
      .integer('QuizID')
      .unsigned()
      .notNullable()
      .references('QuizID')
      .inTable('Quizzes')
      .onDelete('CASCADE');
    table.dateTime('StartTime').notNullable().defaultTo(knex.fn.now());
    table.dateTime('EndTime').nullable();
    table.decimal('Score', 5, 2).nullable();
    table.enum('Status', ['in_progress', 'submitted', 'graded']).notNullable().defaultTo('in_progress');
  });

  await knex.schema.createTable('Responses', (table) => {
    table.increments('ResponseID').primary();
    table
      .integer('AttemptID')
      .unsigned()
      .notNullable()
      .references('AttemptID')
      .inTable('Attempts')
      .onDelete('CASCADE');
    table
      .integer('QuestionID')
      .unsigned()
      .notNullable()
      .references('QuestionID')
      .inTable('Questions')
      .onDelete('CASCADE');
    table
      .integer('SelectedOptionID')
      .unsigned()
      .nullable()
      .references('OptionID')
      .inTable('Options')
      .onDelete('CASCADE');
    table.text('ResponseText').nullable();
    table.boolean('IsCorrect').nullable();
    table.decimal('AwardedPoints', 5, 2).nullable();
  });

  await knex.schema.createTable('AuditLogs', (table) => {
    table.increments('AuditID').primary();
    table
      .integer('ActorID')
      .unsigned()
      .references('UserID')
      .inTable('Users')
      .onDelete('SET NULL');
    table.string('Action', 100).notNullable();
    table.string('EntityType', 100).notNullable();
    table.integer('EntityID').unsigned().nullable();
    table.json('Payload').nullable();
    table.timestamp('CreatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('QuizAssignments', (table) => {
    table.index(['StudentID'], 'idx_assignment_student');
  });
  await knex.schema.alterTable('Quizzes', (table) => {
    table.index(['CreatorID'], 'idx_quiz_creator');
    table.index(['Category'], 'idx_quiz_category');
  });
  await knex.schema.alterTable('Questions', (table) => {
    table.index(['QuizID'], 'idx_question_quiz');
  });
  await knex.schema.alterTable('Attempts', (table) => {
    table.index(['StudentID'], 'idx_attempt_student');
    table.index(['QuizID'], 'idx_attempt_quiz');
  });
  await knex.schema.alterTable('Responses', (table) => {
    table.index(['AttemptID'], 'idx_response_attempt');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('AuditLogs');
  await knex.schema.dropTableIfExists('Responses');
  await knex.schema.dropTableIfExists('Attempts');
  await knex.schema.dropTableIfExists('QuizAssignments');
  await knex.schema.dropTableIfExists('Options');
  await knex.schema.dropTableIfExists('Questions');
  await knex.schema.dropTableIfExists('Quizzes');
  await knex.schema.dropTableIfExists('Users');
}
