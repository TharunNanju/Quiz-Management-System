import type { Knex } from 'knex';

const selectIsCorrectSubquery = `(
  SELECT o.IsCorrect
  FROM Options o
  WHERE o.OptionID = NEW.SelectedOptionID
    AND o.QuestionID = NEW.QuestionID
  LIMIT 1
)`;

const selectPointsSubquery = `(
  SELECT q.Points
  FROM Questions q
  WHERE q.QuestionID = NEW.QuestionID
  LIMIT 1
)`;

export async function up(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS before_response_insert');
  await knex.raw(`
    CREATE TRIGGER before_response_insert
    BEFORE INSERT ON Responses
    FOR EACH ROW
    SET NEW.IsCorrect = CASE
      WHEN NEW.SelectedOptionID IS NULL THEN NULL
      ELSE ${selectIsCorrectSubquery}
    END,
    NEW.AwardedPoints = CASE
      WHEN NEW.SelectedOptionID IS NULL THEN NULL
      WHEN ${selectIsCorrectSubquery} = 1 THEN ${selectPointsSubquery}
      ELSE 0
    END
  `);

  await knex.raw('DROP TRIGGER IF EXISTS before_response_update');
  await knex.raw(`
    CREATE TRIGGER before_response_update
    BEFORE UPDATE ON Responses
    FOR EACH ROW
    SET NEW.IsCorrect = CASE
      WHEN NEW.SelectedOptionID IS NULL THEN NULL
      ELSE ${selectIsCorrectSubquery.replace(/NEW\./g, 'NEW.')}
    END,
    NEW.AwardedPoints = CASE
      WHEN NEW.SelectedOptionID IS NULL THEN NULL
      WHEN ${selectIsCorrectSubquery.replace(/NEW\./g, 'NEW.')} = 1 THEN ${selectPointsSubquery.replace(/NEW\./g, 'NEW.')}
      ELSE 0
    END
  `);

  await knex.raw('DROP TRIGGER IF EXISTS after_quiz_assignment_insert');
  await knex.raw(`
    CREATE TRIGGER after_quiz_assignment_insert
    AFTER INSERT ON QuizAssignments
    FOR EACH ROW
    INSERT INTO AuditLogs (ActorID, Action, EntityType, EntityID, Payload)
    VALUES (
      NEW.StudentID,
      'quiz_assigned',
      'QuizAssignments',
      NEW.AssignmentID,
      JSON_OBJECT('quizId', NEW.QuizID, 'dueDate', NEW.DueDate)
    )
  `);

  await knex.raw('DROP PROCEDURE IF EXISTS CalculateAttemptScore');
  await knex.raw(`
    CREATE PROCEDURE CalculateAttemptScore(IN attID INT)
    UPDATE Attempts a
    SET
      a.Score = (
        SELECT IFNULL(SUM(
          COALESCE(r.AwardedPoints,
            CASE
              WHEN r.SelectedOptionID IS NOT NULL AND r.IsCorrect = 1 THEN q.Points
              WHEN r.SelectedOptionID IS NOT NULL THEN 0
              ELSE 0
            END
          )
        ), 0)
        FROM Responses r
        JOIN Questions q ON q.QuestionID = r.QuestionID
        WHERE r.AttemptID = attID
      ),
      a.EndTime = CASE
        WHEN a.EndTime IS NULL THEN NOW()
        ELSE a.EndTime
      END
    WHERE a.AttemptID = attID
  `);

  await knex.raw('DROP FUNCTION IF EXISTS GetQuizAverage');
  await knex.raw(`
    CREATE FUNCTION GetQuizAverage(qID INT)
    RETURNS DECIMAL(5, 2)
    DETERMINISTIC
    READS SQL DATA
    RETURN (
      SELECT IFNULL(AVG(Score), 0)
      FROM Attempts
      WHERE QuizID = qID AND Score IS NOT NULL
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS before_response_insert');
  await knex.raw('DROP TRIGGER IF EXISTS before_response_update');
  await knex.raw('DROP TRIGGER IF EXISTS after_quiz_assignment_insert');
  await knex.raw('DROP PROCEDURE IF EXISTS CalculateAttemptScore');
  await knex.raw('DROP FUNCTION IF EXISTS GetQuizAverage');
}
