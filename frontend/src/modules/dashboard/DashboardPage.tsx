import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { startAttempt } from '../../api/attempts';
import {
  createQuiz,
  deleteQuiz,
  listQuizzes,
  togglePublish,
  type CreateQuizPayload
} from '../../api/quizzes';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DataState } from '../../components/DataState';
import { useAuthStore, type AuthState } from '../../store/auth';
import { getErrorMessage } from '../../utils/http';
import type { Attempt, Quiz } from '../../types/quiz';
import { formatDateTime, formatDurationSeconds } from '../../utils/format';

type Banner = { type: 'success' | 'error'; message: string } | null;

type CreateQuizFormState = {
  title: string;
  description: string;
  category: string;
  timeLimitMinutes: string;
  published: boolean;
};

const initialFormState: CreateQuizFormState = {
  title: '',
  description: '',
  category: '',
  timeLimitMinutes: '30',
  published: false
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore((state: AuthState) => ({ user: state.user }));
  const [banner, setBanner] = useState<Banner>(null);
  const [startingQuizId, setStartingQuizId] = useState<number | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);
  const [formState, setFormState] = useState<CreateQuizFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const {
    data: quizzes = [],
    isLoading,
    isError,
    error
  } = useQuery<Quiz[]>({
    queryKey: ['quizzes', categoryFilter],
    queryFn: async () => {
      const params = categoryFilter === 'all' ? undefined : { category: categoryFilter };
      return listQuizzes(params);
    },
    staleTime: 1000 * 60 * 5
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((quiz: Quiz) => {
      if (quiz.category) {
        set.add(quiz.category);
      }
    });
    return ['all', ...Array.from(set.values())];
  }, [quizzes]);

  const stats = useMemo(() => {
    const total = quizzes.length;
    const published = quizzes.filter((quiz: Quiz) => quiz.published).length;
    const drafts = total - published;
    const upcoming = quizzes.filter(
      (quiz: Quiz) => quiz.startTime && new Date(quiz.startTime) > new Date()
    ).length;
    return { total, published, drafts, upcoming };
  }, [quizzes]);

  const createQuizMutation = useMutation<Quiz, unknown, CreateQuizPayload>({
    mutationFn: async (payload: CreateQuizPayload) => createQuiz(payload),
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Quiz created successfully.' });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      setFormState(initialFormState);
      setFormError(null);
    },
    onError: (err: unknown) => {
      setFormError(getErrorMessage(err, 'Unable to create quiz'));
    }
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
        message: variables.published ? 'Quiz published for learners.' : 'Quiz set to draft.'
      });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err: unknown) => {
      setBanner({ type: 'error', message: getErrorMessage(err, 'Unable to update publish status') });
    }
  });

  const startAttemptMutation = useMutation<Attempt, unknown, number>({
    mutationFn: async (quizId: number) => startAttempt(quizId),
    onSuccess: (attempt: Attempt) => {
      navigate(`/attempts/${attempt.attemptId}`);
    },
    onError: (err: unknown) => {
      setBanner({ type: 'error', message: getErrorMessage(err, 'Unable to start attempt') });
    },
    onSettled: () => {
      setStartingQuizId(null);
    }
  });

  const deleteQuizMutation = useMutation<void, unknown, number>({
    mutationFn: async (quizId: number) => deleteQuiz(quizId),
    onSuccess: () => {
      setBanner({ type: 'success', message: 'Quiz deleted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (err: unknown) => {
      setBanner({ type: 'error', message: getErrorMessage(err, 'Unable to delete quiz') });
    },
    onSettled: () => {
      setDeletingQuizId(null);
    }
  });

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>
  ) => {
    const target = event.target;
    const { name, value } = target;
    const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
    setFormState((prev: CreateQuizFormState) => ({
      ...prev,
      [name]: isCheckbox ? target.checked : value
    }));
  };

  const handleCreateQuiz = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      setFormError('Title is required');
      return;
    }

    const minutes = Number(formState.timeLimitMinutes);
    if (Number.isNaN(minutes) || minutes <= 0) {
      setFormError('Enter a valid time limit in minutes');
      return;
    }

    const payload: CreateQuizPayload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      category: formState.category.trim() || null,
      timeLimit: minutes * 60,
      published: formState.published
    };

    createQuizMutation.mutate(payload);
  };

  const handleStartAttempt = (quizId: number) => {
    setStartingQuizId(quizId);
    startAttemptMutation.mutate(quizId);
  };

  const handleDeleteQuiz = (quizId: number) => {
    if (!window.confirm('Delete this quiz? Assigned attempts and questions will be removed.')) {
      return;
    }
    setDeletingQuizId(quizId);
    deleteQuizMutation.mutate(quizId);
  };

  const renderQuizCard = (quiz: Quiz) => {
    const actions: ReactNode[] = [];

    if (user?.role === 'teacher' || user?.role === 'admin') {
      actions.push(
        <Button
          key="publish"
          variant={quiz.published ? 'secondary' : 'primary'}
          onClick={() =>
            togglePublishMutation.mutate({ quizId: quiz.quizId, published: !quiz.published })
          }
          disabled={togglePublishMutation.isPending}
        >
          {togglePublishMutation.isPending ? 'Updating…' : quiz.published ? 'Unpublish' : 'Publish'}
        </Button>
      );
      actions.push(
        <Button key="view" variant="ghost" onClick={() => navigate(`/quizzes/${quiz.quizId}`)}>
          View details
        </Button>
      );
      actions.push(
        <Button
          key="delete"
          variant="danger"
          onClick={() => handleDeleteQuiz(quiz.quizId)}
          disabled={deleteQuizMutation.isPending && deletingQuizId === quiz.quizId}
        >
          {deleteQuizMutation.isPending && deletingQuizId === quiz.quizId ? 'Deleting…' : 'Delete'}
        </Button>
      );
    }

    if (user?.role === 'student') {
      actions.push(
        <Button
          key="attempt"
          variant="primary"
          onClick={() => handleStartAttempt(quiz.quizId)}
          disabled={startAttemptMutation.isPending && startingQuizId === quiz.quizId}
        >
          {startAttemptMutation.isPending && startingQuizId === quiz.quizId ? 'Preparing…' : 'Start attempt'}
        </Button>
      );
    }

    return (
      <li
        key={quiz.quizId}
        className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  quiz.published ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'
                }`}
              >
                {quiz.published ? 'Published' : 'Draft'}
              </span>
            </div>
            {quiz.description ? (
              <p className="max-w-2xl text-sm text-slate-300">{quiz.description}</p>
            ) : null}
            <dl className="flex flex-wrap gap-4 text-xs text-slate-400">
              {quiz.category ? (
                <div>
                  <dt className="uppercase tracking-wide text-slate-500">Category</dt>
                  <dd className="text-slate-300">{quiz.category}</dd>
                </div>
              ) : null}
              <div>
                <dt className="uppercase tracking-wide text-slate-500">Time limit</dt>
                <dd className="text-slate-300">{formatDurationSeconds(quiz.timeLimit)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide text-slate-500">Created</dt>
                <dd className="text-slate-300">{formatDateTime(quiz.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-stretch gap-3 text-sm">{actions}</div>
        </div>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Welcome back, {user?.name?.split(' ')[0] ?? 'educator'}</h1>
        <p className="text-sm text-slate-400">
          Monitor quiz performance, iterate on content, and keep learners engaged from a single, data-rich hub.
        </p>
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total quizzes</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Published</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{stats.published}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Drafts</p>
          <p className="mt-2 text-2xl font-semibold text-amber-200">{stats.drafts}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming sessions</p>
          <p className="mt-2 text-2xl font-semibold text-slate-200">{stats.upcoming}</p>
        </article>
      </section>

      <section className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Your quizzes</h2>
              <p className="text-xs text-slate-400">Filter and manage your authored or assigned assessments.</p>
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-200 focus:border-brand focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </option>
              ))}
            </select>
          </header>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50">
            {isLoading ? (
              <DataState title="Loading quizzes" description="Fetching your available assessments." />
            ) : isError ? (
              <DataState
                title="Failed to load"
                description={getErrorMessage(error, 'Unable to load quizzes right now.')}
              />
            ) : quizzes.length === 0 ? (
              <DataState
                title="No quizzes to show"
                description={
                  user?.role === 'teacher'
                    ? 'Create a quiz to start assigning assessments.'
                    : 'Your instructor has not assigned any quizzes yet.'
                }
              />
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {quizzes.map((quiz: Quiz) => (
                  <div key={quiz.quizId} className="p-5">
                    {renderQuizCard(quiz)}
                  </div>
                ))}
              </ul>
            )}
          </div>
        </div>

        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <aside className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
            <h2 className="text-lg font-semibold text-white">Create a new quiz</h2>
            <p className="mt-1 text-xs text-slate-400">
              Define the essentials now, then enrich questions and assignments later.
            </p>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreateQuiz}>
              <Input
                label="Title"
                name="title"
                placeholder="Data Modeling Fundamentals"
                value={formState.title}
                onChange={handleFormChange}
                required
              />
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Description
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
                  placeholder="Summarize learning outcomes and expectations"
                />
              </label>
              <Input
                label="Category"
                name="category"
                placeholder="Databases"
                value={formState.category}
                onChange={handleFormChange}
              />
              <Input
                label="Time limit (minutes)"
                name="timeLimitMinutes"
                type="number"
                min={1}
                value={formState.timeLimitMinutes}
                onChange={handleFormChange}
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="published"
                  checked={formState.published}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded border border-slate-700 bg-slate-900/80 text-brand focus:ring-brand"
                />
                Publish immediately
              </label>
              {formError ? (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</p>
              ) : null}
              <Button type="submit" disabled={createQuizMutation.isPending}>
                {createQuizMutation.isPending ? 'Creating…' : 'Create quiz'}
              </Button>
            </form>
          </aside>
        )}
      </section>
    </div>
  );
};
