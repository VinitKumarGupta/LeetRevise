import { Brain, CheckCircle2, Flame, Gauge, TrendingUp, Trophy } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Feedback, PageHeader } from '../components/ui.js';
import { useAnalytics } from '../services/useAnalytics.js';

const tooltipStyle = {
  backgroundColor: 'var(--color-inset)',
  border: '1px solid var(--color-line)',
  borderRadius: 'var(--radius-control)',
  fontSize: 12,
};

export function Analytics() {
  const { data: analytics, isLoading, error } = useAnalytics();

  const pageHeader = <PageHeader title="Analytics & Progress" description="Track revision retention, problem-solving activity, and topics to revisit." />;
  if (isLoading) {
    return (
      <div className="page-stack" aria-busy="true">
        {pageHeader}
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((slot) => <div key={slot} className="skeleton h-24" />)}
        </div>
        <div className="dashboard-grid">
          <div className="skeleton h-80" />
          <div className="skeleton h-80" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return <div className="page-stack">{pageHeader}<Feedback tone="error">Could not load analytics.</Feedback></div>;
  }

  const { summary, difficulty, solvedPerWeek, mostForgottenTopics } = analytics;
  const diffData = [
    { name: 'Easy', value: difficulty.easy, color: 'var(--color-chart-easy)' },
    { name: 'Medium', value: difficulty.medium, color: 'var(--color-chart-medium)' },
    { name: 'Hard', value: difficulty.hard, color: 'var(--color-chart-hard)' },
  ].filter(({ value }) => value > 0);

  const metrics = [
    { label: 'Revision streak', value: summary.streak, unit: 'days', context: `Best ${summary.maxStreak} days`, Icon: Flame, color: 'var(--color-medium)' },
    { label: 'Overall retention', value: `${summary.completionRate}%`, unit: '', context: 'Recall success', Icon: CheckCircle2, color: 'var(--color-easy)' },
    { label: 'Mastered count', value: summary.completedCount, unit: 'solved', context: 'All 6 stages done', Icon: Trophy, color: 'var(--color-accent-bright)' },
  ];

  return (
    <div className="page-stack">
      {pageHeader}
      <dl className="grid gap-3 min-[960px]:grid-cols-3">
        {metrics.map(({ label, value, unit, context, Icon, color }) => (
          <div key={label} className="panel flex items-center justify-between gap-3 p-4">
            <div>
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="mt-1 text-[1.625rem] leading-tight font-semibold tabular-nums tracking-tight">
                {value} <span className="text-xs font-normal tracking-normal text-muted">{unit}</span>
              </dd>
              <dd className="mt-1 text-xs text-muted">{context}</dd>
            </div>
            <span className="section-icon" style={{ color }}><Icon aria-hidden="true" /></span>
          </div>
        ))}
      </dl>

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="weekly-heading">
          <header className="panel-header">
            <span className="section-icon"><TrendingUp aria-hidden="true" /></span>
            <h2 id="weekly-heading" className="panel-heading">Weekly Solved Progression</h2>
          </header>
          <div className="chart-body h-64">
            {summary.totalSolved === 0 ? (
              <div className="empty-state"><TrendingUp aria-hidden="true" /><p>No metrics available.</p></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={solvedPerWeek} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 4" />
                  <XAxis dataKey="weekStart" stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis width={28} stroke="var(--color-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--color-muted)' }}
                    itemStyle={{ color: 'var(--color-ink)' }}
                    cursor={{ fill: 'var(--accent-soft)' }}
                  />
                  <Bar dataKey="count" name="Problems solved" fill="var(--color-chart-accent)" radius={[4, 4, 0, 0]} maxBarSize={50} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="distribution-heading">
          <header className="panel-header">
            <span className="section-icon"><Gauge aria-hidden="true" /></span>
            <h2 id="distribution-heading" className="panel-heading">Difficulty Distribution</h2>
          </header>
          {diffData.length === 0 ? (
            <div className="empty-state"><Gauge aria-hidden="true" /><p>No problems solved yet.</p></div>
          ) : (
            <>
              <div className="relative h-53">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={diffData} cx="50%" cy="50%" innerRadius={60} outerRadius={81} paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
                      {diffData.map(({ name, color }) => <Cell key={name} fill={color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--color-ink)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight">{summary.totalSolved}</span>
                  <span className="text-xs text-muted">Tracked</span>
                </div>
              </div>
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-4 text-xs text-muted" aria-label="Difficulty totals">
                {diffData.map(({ name, value, color }) => (
                  <li key={name} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                    {name} <strong className="font-semibold tabular-nums text-ink">{value}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="topic-heading">
        <header className="panel-header">
          <span className="section-icon"><Brain aria-hidden="true" /></span>
          <h2 id="topic-heading" className="panel-heading">Retention by Topic</h2>
        </header>
        <div className="chart-body">
          {mostForgottenTopics.length === 0 ? (
            <div className="empty-state"><Brain aria-hidden="true" /><p>No missed recalls recorded by topic.</p></div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mostForgottenTopics.map((topic) => (
                <li key={topic.topic} className="rounded-control border border-line bg-inset p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 text-sm font-semibold break-words">{topic.topic}</h3>
                    <span className="badge" data-tone="medium">{topic.forgotRate}% missed</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">Reset to stage 1 on {topic.forgotCount} of {topic.totalCount} reviews.</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
