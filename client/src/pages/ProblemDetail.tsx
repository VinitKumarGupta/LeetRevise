import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  ExternalLink, 
  Check, 
  Save, 
  History, 
  Clock, 
  FileText
} from 'lucide-react';
import api from '../services/api.js';
import { DifficultyBadge, Feedback } from '../components/ui.js';

const stages = ['1 day', '3 days', '1 week', '2 weeks', '1 month', '3 months'];

const outcomes = {
  easy: { label: 'Solved Easily', summary: 'Next milestone', tone: 'easy' },
  effort: { label: 'Solved with Effort', summary: 'Repeat interval', tone: 'accent' },
  forgot: { label: 'Forgot Solution', summary: 'Reset to stage 1', tone: 'hard' },
  skipped: { label: 'Skip For Now', summary: 'Postpone 1 day', tone: undefined },
} as const;

type Outcome = keyof typeof outcomes;

export const ProblemDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  // Fetch problem details
  const { data: problemData, isLoading, error } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => {
      const res = await api.get(`/problems/${id}`);
      return res.data;
    },
  });

  // Sync state notes when data loads
  const dbNotes = problemData?.problem?.history?.[0]?.notes || '';
  useEffect(() => {
    if (problemData) {
      setNotes(dbNotes);
    }
  }, [problemData, dbNotes]);

  // Log review mutation
  const reviewMutation = useMutation({
    mutationFn: async (result: Outcome) => {
      setFeedback(null);
      const res = await api.post(`/problems/${id}/review`, { result, notes });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setFeedback({ tone: 'success', message: `Review logged. Next revision is ${new Date(data.solvedProblem.nextReviewAt).toLocaleDateString()}.` });
    },
    onError: (err: any) => {
      setFeedback({ tone: 'error', message: err.response?.data?.message || 'Failed to log review.' });
    },
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      setFeedback(null);
      setIsSavingNotes(true);
      setSaveSuccess(false);
      const res = await api.patch(`/problems/${id}/notes`, { notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
    onError: (err: any) => {
      setFeedback({ tone: 'error', message: err.response?.data?.message || 'Failed to save notes.' });
    },
    onSettled: () => {
      setIsSavingNotes(false);
    },
  });

  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true" aria-label="Loading problem">
        <div className="skeleton h-6 w-24" />
        <div className="skeleton h-31" />
        <div className="skeleton h-48" />
      </div>
    );
  }

  if (error || !problemData?.problem) {
    return (
      <div className="panel empty-state">
        <p role="alert">Problem tracking record not found.</p>
        <Link to="/queue" className="button button-secondary button-small">Back to Queue</Link>
      </div>
    );
  }

  const { problem } = problemData;
  const pData = problem.problem;
  const history: { id: string; result: Outcome; reviewedAt: string }[] = problem.history || [];
  const currentStage = problem.currentReviewStage;
  const progress = Math.min(100, (currentStage / (stages.length - 1)) * 100);

  return (
    <div className="page-stack">
      <div>
        <button type="button" onClick={() => navigate(-1)} className="button button-ghost button-small">
          <ArrowLeft aria-hidden="true" /> Back
        </button>
      </div>

      <header className="panel flex flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-5">
        <div className="grid min-w-0 gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">#{pData.leetcodeProblemId}</span>
            <DifficultyBadge difficulty={pData.difficulty} />
            {problem.status === 'paused' && <span className="badge">Tracking paused</span>}
          </div>
          <h1 className="page-heading break-words">{pData.title}</h1>
          <div className="flex flex-wrap gap-1">
            {pData.topics.split(',').map((topic: string) => topic.trim()).filter(Boolean).map((topic: string) => (
              <span key={topic} className="badge">{topic}</span>
            ))}
          </div>
        </div>
        <a href={pData.url} target="_blank" rel="noopener noreferrer" className="button button-secondary">
          Open LeetCode <ExternalLink aria-hidden="true" />
        </a>
      </header>

      <section className="panel" aria-labelledby="milestone-heading">
        <header className="panel-header">
          <h2 id="milestone-heading" className="panel-heading">Spaced Repetition Milestone</h2>
        </header>
        <div className="p-4">
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {stages.map((interval, index) => {
              const step = index + 1;
              const isComplete = index < currentStage;
              const isCurrent = index === currentStage;
              return (
                <li key={interval} className="flex flex-col items-center gap-1 text-center" aria-current={isCurrent ? 'step' : undefined}>
                  <span className={`avatar ${isCurrent ? 'ring-2 ring-accent' : ''}`} aria-hidden="true">
                    {isComplete ? <Check className="size-4" /> : step}
                  </span>
                  <strong className="text-xs font-semibold">Stage {step}</strong>
                  <span className="text-[11px] text-muted">{interval}{isComplete ? ' · Done' : ''}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="grid gap-4 min-[1120px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="panel self-start" aria-labelledby="notes-heading">
          <header className="panel-header flex-wrap">
            <span className="section-icon"><FileText aria-hidden="true" /></span>
            <h2 id="notes-heading" className="panel-heading">Personal Solution Notes</h2>
            <button type="button" onClick={() => saveNotesMutation.mutate()} disabled={isSavingNotes} className="panel-action button button-secondary button-small">
              <Save aria-hidden="true" /> {isSavingNotes ? 'Saving…' : saveSuccess ? 'Saved' : 'Save Notes'}
            </button>
          </header>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-labelledby="notes-heading"
              placeholder="Document the core pattern, complexity, tricky edge cases, and common bugs."
              className="field min-h-72 resize-y leading-relaxed"
            />
            <span role="status" className="sr-only">{saveSuccess ? 'Notes saved.' : ''}</span>
          </div>
        </section>

        <div className="grid gap-4">
          <section className="panel" aria-labelledby="log-heading">
            <header className="panel-header">
              <h2 id="log-heading" className="panel-heading">Log Revision Result</h2>
            </header>
            <div className="grid gap-2 p-4">
              <p className="mb-1 text-xs text-muted">Choose an outcome to update your revision schedule.</p>
              {(Object.keys(outcomes) as Outcome[]).map((outcome) => (
                <button
                  key={outcome}
                  type="button"
                  onClick={() => reviewMutation.mutate(outcome)}
                  disabled={reviewMutation.isPending}
                  className="button button-secondary button-small flex-wrap justify-between gap-1 p-1.5 text-left"
                >
                  <span>{outcomes[outcome].label}</span>
                  <span className="badge" data-tone={outcomes[outcome].tone}>{outcomes[outcome].summary}</span>
                </button>
              ))}
            </div>
            <dl className="grid gap-1 border-t border-line p-4 text-xs text-muted">
              <div className="flex justify-between gap-2">
                <dt>Last reviewed</dt>
                <dd className="font-semibold text-ink">{problem.lastReviewedAt ? new Date(problem.lastReviewedAt).toLocaleDateString() : 'Never'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Next scheduled</dt>
                <dd className="flex items-center gap-1 font-semibold text-accent-bright"><Clock className="size-3" aria-hidden="true" />{new Date(problem.nextReviewAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </section>

          <section className="panel" aria-labelledby="history-heading">
            <header className="panel-header">
              <span className="section-icon"><History aria-hidden="true" /></span>
              <h2 id="history-heading" className="panel-heading">Revision History</h2>
            </header>
            {history.length === 0 ? (
              <div className="empty-state"><p>No reviews logged yet.</p></div>
            ) : (
              <ul className="max-h-72 divide-y divide-line overflow-auto px-4">
                {history.map(({ id, result, reviewedAt }) => (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="badge" data-tone={outcomes[result]?.tone}>
                      {result === 'skipped' ? 'Review postponed' : outcomes[result]?.label}
                    </span>
                    <time className="text-xs text-muted" dateTime={reviewedAt}>{new Date(reviewedAt).toLocaleDateString()}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {feedback && <Feedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.message}</Feedback>}
    </div>
  );
};
