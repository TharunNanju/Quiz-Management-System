import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { startAttempt } from '../../api/attempts';
import {
  assignQuiz,
  getQuiz,
  getQuizAnalytics,
  togglePublish,
  addQuestion,
  type AssignQuizPayload,
  type AddQuestionPayload
} from '../../api/quizzes';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/DataState';
import { Input } from '../../components/ui/Input';
import { useAuthStore, type AuthState } from '../../store/auth';

import { getErrorMessage } from '../../utils/http';
import type { Assignment, Attempt, QuizAnalytics, QuizDetail, Question, QuestionType } from '../../types/quiz';
import { formatDateTime, formatDurationSeconds, formatPercentage } from '../../utils/format';

type Banner = { type: 'success' | 'error'; message: string } | null;

const useQuizId = () => {
  const params = useParams();
  const quizId = Number(params.quizId);
  return Number.isFinite(quizId) ? quizId : null;
};

interface AssignFormState {
  studentId: string;
  studentEmail: string;
  dueDate: string;
}

const initialAssignState: AssignFormState = {
  studentId: '',
  studentEmail: '',
  dueDate: ''
};

interface QuestionOptionInput {
  optionText: string;
  isCorrect: boolean;
  feedback?: string | null;
}

interface AddQuestionState {

    questionText: string;
    points: string;
    options: QuestionOptionInput[];
}
const initialAddQuestionState={
  questionText:'',
  points:'1',
  options:[
    {optionText:'',isCorrect:false},
    {optionText:'',isCorrect:false}
  ],
};

export const QuizDetailPage = () => {
  const quizId = useQuizId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore((state: AuthState) => ({ user: state.user }));
  const [banner, setBanner] = useState<Banner>(null);
  const [assignState, setAssignState] = useState<AssignFormState>(initialAssignState);
  const [addQuestionState, setaddQuestionState] = useState<AddQuestionState>(initialAddQuestionState);
  const [assignFormError, setAssignFormError] = useState<string | null>(null);
  const [addQuestionError, setAddQuestionError] = useState<string | null>(null);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const quizQuery = useQuery<QuizDetail>({
    queryKey: ['quiz', quizId],
    enabled: quizId !== null,
    queryFn: async () => getQuiz(quizId as number),
    retry: 1
  });

  const analyticsQuery = useQuery<QuizAnalytics>({
    queryKey: ['quiz', quizId, 'analytics'],
    enabled: Boolean(quizId && isTeacher),
    queryFn: async () => getQuizAnalytics(quizId as number),
    staleTime: 1000 * 60 * 5
  });

  const togglePublishMutation = useMutation<
    void,
    unknown,
    { quizId: number; published: boolean }
  >({
    mutationFn: async (input: { quizId: number; published: boolean }) =>
      togglePublish(input.quizId, input.published),
    onSuccess: (_: void, variables: { quizId: number; published: boolean }) => {
      setBanner({
        type: 'success',
        message: variables.published ? 'Quiz published successfully.' : 'Quiz moved back to drafts.'
      });
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err: unknown) => {
      setBanner({ type: 'error', message: getErrorMessage(err, 'Unable to update publish status') });
    }
  });

  const startAttemptMutation = useMutation<Attempt>({
    mutationFn: async () => startAttempt(quizId as number),
    onSuccess: (attempt: Attempt) => {
      navigate(`/attempts/${attempt.attemptId}`);
    },
    onError: (err: unknown) => {
      setBanner({ type: 'error', message: getErrorMessage(err, 'Unable to start attempt') });
    }
  });
  const AddQuestionMutation=useMutation<Question,unknown, AddQuestionPayload>({
    mutationFn: async(payload: AddQuestionPayload)=>addQuestion(quizId as number,payload),
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Question added successfully.' });
      setaddQuestionState(initialAddQuestionState);
      setAddQuestionError(null);
    },
    onError: (err: unknown) => {
      setAddQuestionError(getErrorMessage(err, 'Failed to add question'));
    }
  });
  const assignQuizMutation = useMutation<Assignment, unknown, AssignQuizPayload>({
    mutationFn: async (payload: AssignQuizPayload) => assignQuiz(quizId as number, payload),
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Quiz assigned successfully.' });
      setAssignState(initialAssignState);
      setAssignFormError(null);
    },
    onError: (err: unknown) => {
      setAssignFormError(getErrorMessage(err, 'Failed to assign quiz'));
    }
  });

  const handleAssignChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAssignState((prev: AssignFormState) => ({ ...prev, [name]: value }));
  };

  // const handleaddQuestionSubmit=(event:FormEvent<HTMLFormElement>)=>{
  //   event.preventDefault();    
  //   };
  // };

  const handleAssignSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = assignState.studentId.trim();
    const trimmedEmail = assignState.studentEmail.trim();

    if (!trimmedId && !trimmedEmail) {
      setAssignFormError('Provide a student ID or email');
      return;
    }

    const payload: AssignQuizPayload = {
      dueDate: assignState.dueDate ? new Date(assignState.dueDate).toISOString() : null
    };

    if (trimmedId) {
      const numericId = Number(trimmedId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setAssignFormError('Enter a valid student ID');
        return;
      }
      payload.studentId = numericId;
    } else if (trimmedEmail) {
      payload.studentEmail = trimmedEmail;
    }

    assignQuizMutation.mutate(payload);
  };

  // ... inside the QuizDetailPage component

  // General handler for text/points inputs
  const handleAddQuestionChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setaddQuestionState((prev) => ({ ...prev, [name]: value }));
  };

  // Updates the text for a specific option
  const handleOptionTextChange = (index: number, value: string) => {
    setaddQuestionState((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], optionText: value };
      return { ...prev, options: newOptions };
    });
  };

  // Sets a specific option as the correct one (radio-button style)
  const handleSetCorrectOption = (index: number) => {
    setaddQuestionState((prev) => ({
      ...prev,
      options: prev.options.map((option, i) => ({
        ...option,
        isCorrect: i === index,
      })),
    }));
  };

  // Adds a new, empty option field
  const handleAddOption = () => {
    setaddQuestionState((prev) => ({
      ...prev,
      options: [...prev.options, { optionText: '', isCorrect: false }],
    }));
  };

  // Removes an option by its index
  const handleRemoveOption = (index: number) => {
    setaddQuestionState((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  // RE-ENABLE and IMPLEMENT the submit handler
  const handleAddQuestionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const points = Number(addQuestionState.points);

    // --- Basic Validation ---
    if (!addQuestionState.questionText.trim()) {
      setAssignFormError('Question text cannot be empty.');
      return;
    }
    if (Number.isNaN(points) || points <= 0) {
      setAssignFormError('Points must be a positive number.');
      return;
    }
    const validOptions = addQuestionState.options
      .filter((opt) => opt.optionText.trim() !== '')
      .map((opt) => ({
        ...opt,
        optionText: opt.optionText.trim(),
        feedback: null, // Feedback not included in this form
      }));

    if (validOptions.length < 2) {
      setAssignFormError('An MCQ must have at least two valid options.');
      return;
    }
    if (!validOptions.some((opt) => opt.isCorrect)) {
      setAssignFormError('You must select one correct answer.');
      return;
    }
    // --- End Validation ---

    // Construct the payload for the API
    const payload: AddQuestionPayload = {
      questionType: 'mcq', // Hard-coded as requested
      questionText: addQuestionState.questionText.trim(),
      points: points,
      options: validOptions,
      // difficulty and tags are omitted, assuming they are optional
    };

    AddQuestionMutation.mutate(payload);
  };

  const questionCount = useMemo(() => quizQuery.data?.questions.length ?? 0, [quizQuery.data]);

  if (quizId === null) {
    return <DataState title="Invalid quiz" description="The requested quiz could not be found." />;
  }

  if (quizQuery.isLoading) {
    return <DataState title="Loading quiz" description="Fetching quiz data." />;
  }

  if (quizQuery.isError) {
    return (
      <DataState
        title="Unable to load quiz"
        description={getErrorMessage(quizQuery.error, 'Please try again later.')}
      />
    );
  }

  const quiz = quizQuery.data;

  if (!quiz) {
    return <DataState title="Quiz not found" description="This quiz may have been removed." />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Quiz overview</p>
          <h1 className="text-2xl font-semibold text-white">{quiz.title}</h1>
          {quiz.description ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{quiz.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              quiz.published ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'
            }`}
          >
            {quiz.published ? 'Published' : 'Draft'}
          </span>
          {isTeacher ? (
            <Button
              variant={quiz.published ? 'secondary' : 'primary'}
              onClick={() =>
                togglePublishMutation.mutate({ quizId: quiz.quizId, published: !quiz.published })
              }
              disabled={togglePublishMutation.isPending}
            >
              {togglePublishMutation.isPending ? 'Updating…' : quiz.published ? 'Unpublish' : 'Publish now'}
            </Button>
          ) : null}
          {isStudent ? (
            <Button
              variant="primary"
              onClick={() => startAttemptMutation.mutate()}
              disabled={startAttemptMutation.isPending}
            >
              {startAttemptMutation.isPending ? 'Preparing attempt…' : 'Start attempt'}
            </Button>
          ) : null}
        </div>
      </header>

      {banner ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{questionCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Time limit</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatDurationSeconds(quiz.timeLimit)}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Starts</p>
          <p className="mt-2 text-base text-slate-200">{formatDateTime(quiz.startTime, 'Not scheduled')}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ends</p>
          <p className="mt-2 text-base text-slate-200">{formatDateTime(quiz.endTime, 'Not scheduled')}</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Questions</h2>
              <p className="text-xs text-slate-400">Review the prompt, points, and answer options.</p>
            </div>
          </header>

          <div className="space-y-4">
            {quiz.questions.length === 0 ? (
              <DataState title="No questions yet" description="Add questions to bring this quiz to life." />
            ) : (
              quiz.questions.map((question, index) => (
                <div
                  key={question.questionId}
                  className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-brand/80">Question {index + 1}</p>
                      <h3 className="mt-1 text-base font-semibold text-white">{question.questionText}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="rounded-full bg-slate-800/80 px-3 py-1 uppercase tracking-wide">
                        {question.questionType}
                      </span>
                      <span className="rounded-full bg-slate-800/80 px-3 py-1">{question.points} pts</span>
                    </div>
                  </div>

                  {question.options.length ? (
                    <ul className="mt-4 space-y-2">
                      {question.options.map((option) => (
                        <li
                          key={option.optionId}
                          className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
                            option.isCorrect
                              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                              : 'border-slate-800/70 bg-slate-900/70 text-slate-300'
                          }`}
                        >
                          <span className="mt-1 h-2 w-2 rounded-full bg-brand/70" />
                          <div>
                            <p className="font-medium">{option.optionText}</p>
                            {option.feedback ? (
                              <p className="text-xs text-slate-400">{option.feedback}</p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">
                      This question accepts written responses.
                    </p>
                  )}
                </div>
              ))
            )}
          {isTeacher ? (
            <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
              <h3 className="text-lg font-semibold text-white">Add New MCQ Question</h3>
              <form className="mt-4 flex flex-col gap-4" onSubmit={handleAddQuestionSubmit}>
                <Input
                
                  label="Question Text"
                  name="questionText"
                  value={addQuestionState.questionText}
                  onChange={handleAddQuestionChange}
                  placeholder="What is the capital of React?"
                  required
                />
                <Input
                  label="Points"
                  name="points"
                  type="number"
                  min="1"
                  value={addQuestionState.points}
                  onChange={handleAddQuestionChange}
                  placeholder="1"
                  required
                />

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300">Options</label>
                  {addQuestionState.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="correctOption"
                        className="h-4 w-4 shrink-0 cursor-pointer"
                        checked={option.isCorrect}
                        onChange={() => handleSetCorrectOption(index)}
                      />
                      <Input
                        name={`option-${index}`}
                        value={option.optionText}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                       
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        
                        onClick={() => handleRemoveOption(index)}
                        disabled={addQuestionState.options.length <= 2}
                        aria-label="Remove option"
                      >
                        {/* You can use an X icon here */}X
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={handleAddOption}>
                    Add Another Option
                  </Button>
                </div>

                {assignFormError ? (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {assignFormError}
                  </p>
                ) : null}

                <Button type="submit" disabled={AddQuestionMutation.isPending}>
                  {AddQuestionMutation.isPending ? 'Adding…' : 'Add Question'}
                </Button>
              </form>
            </article>
          ) : null}
        </div>
      </article> 

        <aside className="space-y-6">
          {isTeacher ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
              <h2 className="text-base font-semibold text-white">Assign to learner</h2>
              <p className="mt-1 text-xs text-slate-400">
                Share this quiz with a student by providing their numeric identifier or email address.
              </p>
              <form className="mt-4 flex flex-col gap-4" onSubmit={handleAssignSubmit}>
                <Input
                  label="Student ID"
                  name="studentId"
                  value={assignState.studentId}
                  onChange={handleAssignChange}
                  placeholder="123"
                />
                <Input
                  label="Student email"
                  name="studentEmail"
                  type="email"
                  value={assignState.studentEmail}
                  onChange={handleAssignChange}
                  placeholder="student@example.com"
                />
                <Input
                  label="Due date"
                  name="dueDate"
                  type="datetime-local"
                  value={assignState.dueDate}
                  onChange={handleAssignChange}
                />
                {assignFormError ? (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{assignFormError}</p>
                ) : null}
                <Button type="submit" disabled={assignQuizMutation.isPending}>
                  {assignQuizMutation.isPending ? 'Assigning…' : 'Assign quiz'}
                </Button>
              </form>
            </div>
          ) : null}

          {isTeacher ? (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
              <h2 className="text-base font-semibold text-white">Performance insights</h2>
              {analyticsQuery.isLoading ? (
                <p className="mt-3 text-sm text-slate-400">Loading analytics…</p>
              ) : analyticsQuery.isError ? (
                <p className="mt-3 text-sm text-rose-300">
                  {getErrorMessage(analyticsQuery.error, 'Unable to load analytics')}
                </p>
              ) : analyticsQuery.data ? (
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center justify-between">
                    <span>Average score</span>
                    <span className="font-semibold text-white">
                      {analyticsQuery.data.averageScore.toFixed(1)}%
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Total attempts</span>
                    <span className="font-semibold text-white">{analyticsQuery.data.attemptCount}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Completion rate</span>
                    <span className="font-semibold text-white">
                      {formatPercentage(analyticsQuery.data.completionRate)}
                    </span>
                  </li>
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No analytics yet.</p>
              )}
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
};
