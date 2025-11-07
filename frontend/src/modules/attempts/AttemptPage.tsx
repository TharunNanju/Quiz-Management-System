import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getAttempt, submitAttempt, type SubmitAttemptPayload } from '../../api/attempts';
import { Button } from '../../components/ui/Button';
import { DataState } from '../../components/DataState';
import { getErrorMessage } from '../../utils/http';
import type { Attempt, AttemptDetail, QuestionWithOptions, ResponseRecord } from '../../types/quiz';
import { formatDateTime } from '../../utils/format';

type Banner = { type: 'success' | 'error'; message: string } | null;

type ResponseDraft = {
  selectedOptionId: number | null;
  responseText: string | null;
};

const useAttemptId = () => {
  const params = useParams();
  const attemptId = Number(params.attemptId);
  return Number.isFinite(attemptId) ? attemptId : null;
};

const countAnswered = (questions: QuestionWithOptions[], drafts: Record<number, ResponseDraft>) => {
  return questions.reduce((count, question) => {
    const draft = drafts[question.questionId];
    if (!draft) return count;
    if (question.options.length) {
      return draft.selectedOptionId ? count + 1 : count;
    }
    return draft.responseText && draft.responseText.trim().length > 0 ? count + 1 : count;
  }, 0);
};

export const AttemptPage = () => {
  const attemptId = useAttemptId();
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<Banner>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<number, ResponseDraft>>({});

  const attemptQuery = useQuery<AttemptDetail>({
    queryKey: ['attempt', attemptId],
    enabled: attemptId !== null,
    queryFn: async () => getAttempt(attemptId as number)
  });

  const submitMutation = useMutation<Attempt, unknown, SubmitAttemptPayload>({
    mutationFn: async (payload: SubmitAttemptPayload) => submitAttempt(payload),
    onSuccess: (attempt: Attempt) => {
      setBanner({ type: 'success', message: 'Attempt submitted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] });
    },
    onError: (err: unknown) => {
      setBanner({ type: 'error', message: getErrorMessage(err, 'Failed to submit attempt') });
    }
  });

  useEffect(() => {
    if (attemptQuery.data) {
      const nextDrafts: Record<number, ResponseDraft> = {};
      for (const question of attemptQuery.data.quiz.questions) {
        const response = attemptQuery.data.responses.find(
          (entry: ResponseRecord) => entry.questionId === question.questionId
        );
        nextDrafts[question.questionId] = {
          selectedOptionId: response?.selectedOptionId ?? null,
          responseText: response?.responseText ?? null
        };
      }
      setResponseDrafts(nextDrafts);
    }
  }, [attemptQuery.data]);

  const handleOptionChange = (
    questionId: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.target.value);
    setResponseDrafts((prev: Record<number, ResponseDraft>) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: Number.isFinite(value) ? value : null,
        responseText: null
      }
    }));
  };

  const handleTextChange = (
    questionId: number,
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { value } = event.target;
    setResponseDrafts((prev: Record<number, ResponseDraft>) => ({
      ...prev,
      [questionId]: {
        selectedOptionId: null,
        responseText: value
      }
    }));
  };

  const attempt = attemptQuery.data?.attempt;
  const quiz = attemptQuery.data?.quiz;
  const questions = quiz?.questions ?? [];
  const answeredCount = useMemo(
    () => (quiz ? countAnswered(quiz.questions, responseDrafts) : 0),
    [quiz, responseDrafts]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!attempt || !quiz) return;

    const payload: SubmitAttemptPayload = {
      attemptId: attempt.attemptId,
      responses: quiz.questions.map((question: QuestionWithOptions) => ({
        questionId: question.questionId,
        selectedOptionId: responseDrafts[question.questionId]?.selectedOptionId ?? null,
        responseText: responseDrafts[question.questionId]?.responseText?.trim() ?? null
      }))
    };

    submitMutation.mutate(payload);
  };

  if (attemptId === null) {
    return <DataState title="Invalid attempt" description="The requested attempt could not be found." />;
  }

  if (attemptQuery.isLoading) {
    return <DataState title="Loading attempt" description="Fetching quiz attempt details." />;
  }

  if (attemptQuery.isError) {
    return (
      <DataState
        title="Unable to load attempt"
        description={getErrorMessage(attemptQuery.error, 'Please try again later.')}
      />
    );
  }

  if (!attempt || !quiz) {
    return <DataState title="Attempt not found" description="This attempt might have been removed." />;
  }

  const isReadOnly = attempt.status !== 'in_progress';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Attempt summary</p>
          <h1 className="text-2xl font-semibold text-white">{quiz.title}</h1>
          <p className="mt-2 text-sm text-slate-400">Status: {attempt.status.replace('_', ' ')}</p>
        </div>
        <div className="grid gap-2 text-sm text-slate-300">
          <p>
            Started: <span className="text-white">{formatDateTime(attempt.startTime)}</span>
          </p>
          <p>
            Ended: <span className="text-white">{formatDateTime(attempt.endTime)}</span>
          </p>
          <p>
            Score: <span className="text-white">{attempt.score ?? 'Pending'}</span>
          </p>
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{questions.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Answered</p>
          <p className="mt-2 text-2xl font-semibold text-white">{answeredCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Points</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {questions.reduce((sum, q) => sum + q.points, 0)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-2 text-2xl font-semibold text-white">{attempt.score ?? '—'}</p>
        </article>
      </section>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {questions.map((question, index) => {
          const draft = responseDrafts[question.questionId];
          const isMultipleChoice = question.options.length > 0;

          return (
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

              {isMultipleChoice ? (
                <div className="mt-4 space-y-3">
                  {question.options.map((option) => (
                    <label
                      key={option.optionId}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
                        draft?.selectedOptionId === option.optionId
                          ? 'border-brand/60 bg-brand/10 text-white'
                          : 'border-slate-800/70 bg-slate-900/70 text-slate-300'
                      } ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.questionId}`}
                        value={option.optionId}
                        checked={draft?.selectedOptionId === option.optionId}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          handleOptionChange(question.questionId, event)
                        }
                        disabled={isReadOnly}
                        className="mt-1 h-4 w-4 rounded-full border border-slate-600 text-brand focus:ring-brand"
                      />
                      <div>
                        <p className="font-medium">{option.optionText}</p>
                        {isReadOnly && option.isCorrect ? (
                          <p className="text-xs text-emerald-300">Correct answer</p>
                        ) : null}
                        {option.feedback ? (
                          <p className="text-xs text-slate-400">{option.feedback}</p>
                        ) : null}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <label className="mt-4 flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Response
                  <textarea
                    name={`question-${question.questionId}`}
                    value={draft?.responseText ?? ''}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      handleTextChange(question.questionId, event)
                    }
                    rows={4}
                    disabled={isReadOnly}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none"
                    placeholder="Type your answer here"
                  />
                </label>
              )}

              {isReadOnly && attemptQuery.data?.responses ? (
                <div className="mt-4 text-xs text-slate-400">
                  {(() => {
                    const response = attemptQuery.data?.responses.find(
                      (entry) => entry.questionId === question.questionId
                    );
                    if (!response) return null;
                    if (response.awardedPoints !== null) {
                      return (
                        <p>
                          Awarded points:{' '}
                          <span className="text-white">{response.awardedPoints}</span>
                          {response.isCorrect !== null ? (
                            <span className="ml-2">
                              ({response.isCorrect ? 'correct' : 'incorrect'})
                            </span>
                          ) : null}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : null}
            </div>
          );
        })}

        {!isReadOnly ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit attempt'}
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
};
