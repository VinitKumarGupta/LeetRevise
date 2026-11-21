import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleHelp, RefreshCw, Trophy, Users } from 'lucide-react';
import api from '../services/api.js';

export interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  initials: string;
  score: number;
  solvedCount: number;
  streak: number;
  reviewCount: number;
  completedCount: number;
  rank: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardUser[];
  scoringModel: {
    solvedProblem: number;
    completedProblem: number;
    reviewLogged: number;
    streakDay: number;
    description: string;
  };
}

const timeframes = [
  { value: 'all-time', label: 'All Time' },
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
] as const;

const metrics = [
  { value: 'score', label: 'Score' },
  { value: 'solved', label: 'Solved' },
  { value: 'streak', label: 'Streak' },
] as const;

export function Leaderboard() {
  const [timeframe, setTimeframe] = useState<(typeof timeframes)[number]['value']>('all-time');
  const [sortBy, setSortBy] = useState<(typeof metrics)[number]['value']>('score');
  const [showFormula, setShowFormula] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', timeframe, sortBy],
    queryFn: async () => {
      const res = await api.get('/leaderboard', { params: { timeframe, sortBy } });
      return res.data;
    },
    refetchInterval: 30 * 1000,
  });
  const scoring = data?.scoringModel;

  return (
    <section className="panel leaderboard-card" aria-labelledby="leader-heading">
      <header className="panel-header">
        <span className="section-icon"><Trophy aria-hidden="true" /></span>
        <h2 id="leader-heading" className="panel-heading">Leaderboard</h2>
        {scoring && (
          <span className="tooltip-anchor">
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowFormula(!showFormula)}
              aria-label="How points are calculated"
              aria-expanded={showFormula}
              aria-controls="leader-formula"
            >
              <CircleHelp aria-hidden="true" />
            </button>
            <span className="tooltip" aria-hidden="true">How points are calculated</span>
          </span>
        )}
        <span className="tooltip-anchor panel-action">
          <button type="button" className="icon-button" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh leaderboard">
            <RefreshCw aria-hidden="true" className={isFetching ? 'animate-spin text-accent' : ''} />
          </button>
          <span className="tooltip" aria-hidden="true">Refresh leaderboard</span>
        </span>
      </header>

      {scoring && (
        <div id="leader-formula" className="leader-formula" hidden={!showFormula}>
          <h3 className="font-semibold text-ink">How points are awarded</h3>
          <ul>
            <li>Solved problem <strong className="text-accent-bright">+{scoring.solvedProblem}</strong></li>
            <li>Mastered problem <strong className="text-accent-bright">+{scoring.completedProblem}</strong></li>
            <li>Spaced review <strong className="text-accent-bright">+{scoring.reviewLogged}</strong></li>
            <li>Active streak day <strong className="text-accent-bright">+{scoring.streakDay}</strong></li>
          </ul>
        </div>
      )}

      <div className="leader-controls">
        <div className="segmented" role="group" aria-label="Leaderboard timeframe">
          {timeframes.map(({ value, label }) => (
            <button key={value} type="button" className="segment" aria-pressed={timeframe === value} onClick={() => setTimeframe(value)}>{label}</button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Leaderboard sort">
          {metrics.map(({ value, label }) => (
            <button key={value} type="button" className="segment" aria-pressed={sortBy === value} onClick={() => setSortBy(value)}>{label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-2 px-4 pb-4" aria-busy="true" aria-label="Loading leaderboard">
          {[1, 2, 3].map((row) => <div key={row} className="skeleton h-12" />)}
        </div>
      ) : error || !data ? (
        <div className="empty-state">
          <p role="alert">Could not load the leaderboard.</p>
          <button type="button" className="button button-secondary button-small" onClick={() => refetch()}>Retry</button>
        </div>
      ) : data.entries.length === 0 ? (
        <div className="empty-state">
          <Users aria-hidden="true" />
          <p>No users ranked yet.</p>
        </div>
      ) : (
        <>
          <div className="leader-list-head" aria-hidden="true">
            <span className="text-center">Rank</span>
            <span className="pl-1">Player</span>
            <span className="pr-1 text-right">{metrics.find((metric) => metric.value === sortBy)?.label}</span>
          </div>
          <ol className="leader-list" aria-label="Ranked players">
            {data.entries.map((entry) => (
              <li key={entry.id} className="leader-row" data-current={entry.isCurrentUser}>
                <span className="leader-rank tabular-nums" data-leading={entry.rank <= 3} aria-label={`Rank ${entry.rank}`}>{entry.rank}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="avatar" aria-hidden="true">{entry.initials}</span>
                  <div className="grid min-w-0 gap-0.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold" title={entry.name}>{entry.name}</span>
                      {entry.isCurrentUser && <span className="badge" data-tone="accent">You</span>}
                    </div>
                    <span className="truncate text-[11px] text-muted" title={`@${entry.username}`}>@{entry.username}</span>
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="text-[13px] font-semibold">
                    {sortBy === 'score' && `${entry.score.toLocaleString()} pts`}
                    {sortBy === 'solved' && `${entry.solvedCount} solved`}
                    {sortBy === 'streak' && `${entry.streak}d streak`}
                  </div>
                  <div className="text-[11px] text-muted">{entry.solvedCount} solved · {entry.streak}d streak</div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
