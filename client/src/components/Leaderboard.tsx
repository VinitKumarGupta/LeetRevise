import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, RefreshCw, Users, HelpCircle } from 'lucide-react';
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

export const Leaderboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'all-time' | 'month' | 'week'>('all-time');
  const [sortBy, setSortBy] = useState<'score' | 'solved' | 'streak'>('score');
  const [showFormula, setShowFormula] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', timeframe, sortBy],
    queryFn: async () => {
      const res = await api.get('/leaderboard', {
        params: { timeframe, sortBy },
      });
      return res.data;
    },
    refetchInterval: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="glass-panel p-5 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-gray-800/60 rounded animate-pulse"></div>
          <div className="h-6 w-20 bg-gray-800/60 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-900/40 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl text-center py-8">
        <p className="text-sm text-gray-400 mb-3">Failed to load leaderboard</p>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { entries } = data;

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col justify-between min-w-0">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-lg text-gray-100">Leaderboard</h2>
            <button
              onClick={() => setShowFormula(!showFormula)}
              title="How points are calculated"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
            className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Scoring formula explanation dropdown */}
        {showFormula && (
          <div className="mb-4 p-3 bg-gray-900/60 border border-border-dark/60 rounded-xl text-xs text-gray-300 flex flex-col gap-1.5">
            <p className="font-semibold text-gray-200">How points are awarded:</p>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-400">
              <span>• Solved problem: <b className="text-indigo-400">+10 pts</b></span>
              <span>• Mastered (all stages): <b className="text-emerald-400">+20 pts</b></span>
              <span>• Spaced review done: <b className="text-amber-400">+5 pts</b></span>
              <span>• Active streak day: <b className="text-rose-400">+10 pts</b></span>
            </div>
          </div>
        )}

        {/* Filter controls */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border-dark/40 text-xs">
          {/* Timeframe */}
          <div className="flex items-center bg-gray-900/50 p-0.5 rounded-lg border border-border-dark/40">
            <button
              onClick={() => setTimeframe('all-time')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                timeframe === 'all-time' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                timeframe === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                timeframe === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Week
            </button>
          </div>

          {/* Metric Sort */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortBy('score')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                sortBy === 'score' ? 'bg-amber-500/10 text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Score
            </button>
            <button
              onClick={() => setSortBy('solved')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                sortBy === 'solved' ? 'bg-indigo-500/10 text-indigo-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Solved
            </button>
            <button
              onClick={() => setSortBy('streak')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                sortBy === 'streak' ? 'bg-rose-500/10 text-rose-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Streak
            </button>
          </div>
        </div>

        {/* Empty state */}
        {entries.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center text-gray-500 gap-2">
            <Users className="w-6 h-6 opacity-40" />
            <p className="text-xs">No users ranked yet</p>
          </div>
        ) : (
          /* User Rows */
          <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-0.5">
            {entries.map((entry) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;
              const isUser = entry.isCurrentUser;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isUser
                      ? 'bg-indigo-950/20 border-indigo-500/40'
                      : 'bg-gray-900/30 border-border-dark/30'
                  }`}
                >
                  {/* Left: Rank, Avatar, Name */}
                  <div className="flex items-center gap-2.5 min-w-0 mr-2">
                    {/* Rank */}
                    <div className="w-6 text-center shrink-0">
                      {isFirst ? (
                        <span className="text-base" title="1st Place">🥇</span>
                      ) : isSecond ? (
                        <span className="text-base" title="2nd Place">🥈</span>
                      ) : isThird ? (
                        <span className="text-base" title="3rd Place">🥉</span>
                      ) : (
                        <span className="text-xs font-mono text-gray-500">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-lg bg-gray-800 border border-border-dark/60 flex items-center justify-center text-gray-200 font-semibold text-xs shrink-0">
                      {entry.initials}
                    </div>

                    {/* Username */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-200 truncate">
                          {entry.name}
                        </span>
                        {isUser && (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 truncate">
                        @{entry.username}
                      </span>
                    </div>
                  </div>

                  {/* Right: Score and stats */}
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-xs sm:text-sm text-gray-100">
                      {sortBy === 'score' && `${entry.score.toLocaleString()} pts`}
                      {sortBy === 'solved' && `${entry.solvedCount} solved`}
                      {sortBy === 'streak' && `${entry.streak}d streak`}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {entry.solvedCount} solved • {entry.streak}d streak
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
