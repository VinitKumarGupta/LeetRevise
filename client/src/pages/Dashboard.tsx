import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Bell, BellOff, ChevronRight, Flame, History, Layers3, Pause, Play, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import api from '../services/api.js';
import { Leaderboard } from '../components/Leaderboard.js';
import { DifficultyBadge, Feedback, PageHeader } from '../components/ui.js';
import { useAuth } from '../context/AuthContext.js';
import { useAnalytics } from '../services/useAnalytics.js';

const difficulties = ['easy', 'medium', 'hard'] as const;
const reviewDate = (date: string) => new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' });

function RevisionEmailControl() {
  const { user, updateProfile } = useAuth();
  const paused = user?.revisionEmailsPaused ?? false;
  const preferences = useMutation({
    mutationFn: (revisionEmailsPaused: boolean) => updateProfile({ revisionEmailsPaused }),
  });
  const ReminderIcon = paused ? BellOff : Bell;
  const ActionIcon = paused ? Play : Pause;

  return (
    <section className="panel grid gap-3 p-3" aria-labelledby="revision-email-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="section-icon"><ReminderIcon aria-hidden="true" /></span>
          <div>
            <h2 id="revision-email-heading" className="panel-heading">Revision emails</h2>
            <p className="text-sm text-muted" role="status">
              {paused ? 'Emails are paused until you resume. Your review queue is still available.' : 'Pause your email reminders whenever you need a break.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => preferences.mutate(!paused)}
          disabled={preferences.isPending}
        >
          <ActionIcon aria-hidden="true" />
          {preferences.isPending ? 'Saving…' : paused ? 'Resume Revision' : 'Pause Revision'}
        </button>
      </div>
      {preferences.isError && <Feedback tone="error">{preferences.error.message}</Feedback>}
    </section>
  );
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const [syncFeedback, setSyncFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const { data: analytics, isLoading, error } = useAnalytics();

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncFeedback(null);
      const res = await api.post('/sync');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setSyncFeedback({
        tone: 'success',
        message: `Sync successful. Imported ${data.newProblemsCount} new ${data.newProblemsCount === 1 ? 'problem' : 'problems'}.`,
      });
    },
    onError: (err: any) => {
      setSyncFeedback({ tone: 'error', message: err.response?.data?.message || 'Sync failed. Check username configuration.' });
    },
  });

  const title = 'Dashboard';
  const description = 'See what’s due and keep your practice going.';

  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true">
        <PageHeader title={title} description={description} />
        <RevisionEmailControl />
        <div className="skeleton h-13" />
        <div className="dashboard-grid">
          <div className="skeleton h-88" />
          <div className="skeleton h-88" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="page-stack">
        <PageHeader title={title} description={description} />
        <RevisionEmailControl />
        <Feedback tone="error">Could not load the dashboard. Refresh the page or sign in again.</Feedback>
      </div>
    );
  }

  const { summary, difficulty, lastSync, solvedPerWeek, latestProblems } = analytics;
  const total = difficulty.easy + difficulty.medium + difficulty.hard;

  return (
    <div className="page-stack">
      <div className="dashboard-hero">
        <PageHeader
          title={title}
          description={description}
          actions={
            <div className="dashboard-actions">
              <div className="streak">
                <Flame aria-hidden="true" />
                <div>
                  <span className="streak-value tabular-nums">{summary.streak} {summary.streak === 1 ? 'day' : 'days'} streak</span>
                  {summary.maxStreak > 0 && <span className="streak-best">Best {summary.maxStreak}d</span>}
                </div>
              </div>
              {lastSync && (
                <div className="sync-status">
                  <span className="sync-label">Last synced</span>
                  <span className="sync-value" data-failed={!lastSync.success}>
                    {lastSync.success
                      ? `${new Date(lastSync.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${lastSync.newProblemsCount} new`
                      : 'Sync failed'}
                  </span>
                </div>
              )}
              <button type="button" className="button button-primary" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                <RefreshCw aria-hidden="true" className={syncMutation.isPending ? 'animate-spin' : ''} />
                {syncMutation.isPending ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          }
        />
        <img className="dashboard-art" src="/study-buddy.jpg" width="960" height="720" alt="" />
      </div>

      <RevisionEmailControl />

      <div className="dashboard-grid">
        <Leaderboard />

        <section className="panel recent-card" aria-labelledby="recent-heading">
          <header className="panel-header">
            <span className="section-icon"><History aria-hidden="true" /></span>
            <h2 id="recent-heading" className="panel-heading">Recently Solved &amp; Synced</h2>
          </header>
          {latestProblems.length === 0 ? (
            <div className="empty-state">
              <History aria-hidden="true" />
              <p>No problems tracked yet.</p>
              <p><Link to="/settings" className="text-accent-bright underline underline-offset-3">Link your LeetCode account</Link> and run a sync to get started.</p>
            </div>
          ) : (
            <ul className="activity-list">
              {latestProblems.map((problem) => (
                <li key={problem.id}>
                  <Link to={`/problem/${problem.id}`} className="activity-row">
                    <div className="grid min-w-0 gap-0.5">
                      <span className="truncate text-sm font-semibold" title={problem.title}>{problem.title}</span>
                      <time className="text-xs text-muted" dateTime={problem.solvedAt}>{reviewDate(problem.solvedAt)}</time>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DifficultyBadge difficulty={problem.difficulty} />
                      <ChevronRight className="activity-arrow size-4" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="dashboard-grid dashboard-charts">
        <section className="panel" aria-labelledby="consistency-heading">
          <header className="panel-header">
            <span className="section-icon"><Activity aria-hidden="true" /></span>
            <h2 id="consistency-heading" className="panel-heading">Solve Consistency</h2>
            <span className="panel-action text-xs text-muted">Last 6 weeks</span>
          </header>
          <div className="chart-body h-64">
            {total === 0 ? (
              <div className="empty-state"><Activity aria-hidden="true" /><p>No submissions tracked yet.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={solvedPerWeek} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 4" />
                  <XAxis dataKey="weekStart" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis width={28} stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => active && payload?.length ? (
                      <div className="chart-tooltip">
                        <p className="text-muted">{payload[0].payload.weekRange}</p>
                        <p className="font-semibold">{payload[0].value} solved</p>
                      </div>
                    ) : null}
                    cursor={{ fill: 'var(--accent-soft)' }}
                  />
                  <Bar name="Problems solved" dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52} isAnimationActive={false}>
                    {solvedPerWeek.map(({ weekStart }, index) => (
                      <Cell key={weekStart} fill="var(--color-chart-accent)" fillOpacity={index === solvedPerWeek.length - 1 ? 1 : .53} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="panel flex flex-col" aria-labelledby="difficulty-heading">
          <header className="panel-header">
            <span className="section-icon"><Layers3 aria-hidden="true" /></span>
            <h2 id="difficulty-heading" className="panel-heading">Difficulty Allocation</h2>
          </header>
          <div className="chart-body grow">
            {total === 0 ? (
              <div className="empty-state"><Layers3 aria-hidden="true" /><p>Sync your account to see your difficulty breakdown.</p></div>
            ) : (
              <ul className="grid gap-4">
                {difficulties.map((level) => {
                  const count = difficulty[level];
                  const percent = Math.round((count / total) * 100);
                  return (
                    <li key={level} className="grid gap-2">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="font-semibold capitalize" style={{ color: `var(--color-${level})` }}>{level}</span>
                        <span className="tabular-nums text-muted"><strong className="font-semibold text-ink">{count}</strong> · {percent}%</span>
                      </div>
                      <div className="progress-track" aria-hidden="true">
                        <div className="progress-fill" style={{ width: `${percent}%`, backgroundColor: `var(--color-chart-${level})` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <footer className="flex justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted">
            <span>Total synced</span>
            <span className="font-semibold tabular-nums text-ink">{total} solved problems</span>
          </footer>
        </section>
      </div>

      {syncFeedback && <Feedback tone={syncFeedback.tone} onDismiss={() => setSyncFeedback(null)}>{syncFeedback.message}</Feedback>}
    </div>
  );
}
