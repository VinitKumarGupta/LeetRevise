import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Trophy, 
  Flame, 
  Zap, 
  Crown, 
  Medal, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  RefreshCw, 
  Users, 
  Sparkles,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import api from '../services/api.js';

export interface LeaderboardEntry {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  initials: string;
  score: number;
  solvedCount: number;
  streak: number;
  reviewCount: number;
  completedCount: number;
  retentionRate: number;
  rank: number;
  badge?: {
    type: 'gold' | 'silver' | 'bronze' | 'top10' | 'streak_master' | 'grinder' | 'rising';
    label: string;
    icon: string;
  };
  change?: number;
  isCurrentUser?: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  stats: {
    totalLearners: number;
    totalProblemsSolved: number;
    topStreak: number;
  };
  updatedAt: string;
}

// Generate consistent gradient avatar background based on username string
function getAvatarGradient(str: string): string {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-fuchsia-600',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export const Leaderboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [timeframe, setTimeframe] = useState<'all-time' | 'month' | 'week'>('all-time');
  const [sortBy, setSortBy] = useState<'score' | 'solved' | 'streak'>('score');

  // React Query with real-time polling every 15 seconds
  const { data, isLoading, isFetching, error, refetch } = useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', timeframe, sortBy],
    queryFn: async () => {
      const res = await api.get('/leaderboard', {
        params: {
          timeframe,
          sortBy,
          limit: 15,
        },
      });
      return res.data;
    },
    refetchInterval: 15 * 1000, // 15s real-time poll
    refetchOnWindowFocus: true,
  });

  // Real-time Server-Sent Events (SSE) listener for push updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api';
      const sseUrl = `${baseUrl}/leaderboard/live?timeframe=${timeframe}&sortBy=${sortBy}`;
      
      eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const freshData = JSON.parse(event.data);
          queryClient.setQueryData(['leaderboard', timeframe, sortBy], freshData);
        } catch (e) {
          // JSON parse ignore
        }
      };

      eventSource.onerror = () => {
        // Close on error; polling will handle it transparently
        eventSource?.close();
      };
    } catch (err) {
      // Fallback seamlessly to React Query polling
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [timeframe, sortBy, queryClient]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-5 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="h-5 w-36 bg-gray-800 rounded-md animate-pulse"></div>
              <div className="h-3 w-48 bg-gray-800/60 rounded-md mt-1.5 animate-pulse"></div>
            </div>
          </div>
          <div className="h-7 w-20 bg-gray-800/60 rounded-full animate-pulse"></div>
        </div>

        {/* Tab skeleton */}
        <div className="flex justify-between items-center gap-2">
          <div className="h-8 w-44 bg-gray-800/60 rounded-xl animate-pulse"></div>
          <div className="h-8 w-32 bg-gray-800/60 rounded-xl animate-pulse"></div>
        </div>

        {/* Rows skeleton */}
        <div className="flex flex-col gap-2.5 mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-gray-900/50 border border-border-dark/30 animate-pulse flex items-center px-4 justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-800/80"></div>
                <div className="w-10 h-10 rounded-full bg-gray-800/80"></div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-3.5 w-24 bg-gray-800/80 rounded"></div>
                  <div className="h-2.5 w-16 bg-gray-800/50 rounded"></div>
                </div>
              </div>
              <div className="h-6 w-16 bg-gray-800/80 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col items-center justify-center text-center gap-4 py-12">
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-display font-bold text-gray-200 text-base">Unable to load leaderboard</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            We encountered a temporary connection issue. Please retry.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { entries, currentUser, stats } = data;

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col justify-between min-w-0 relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div>
        {/* Header with Title & Real-time Indicator */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner shadow-amber-500/10 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-gray-100 tracking-tight truncate">
                  Revision Leaderboard
                </h2>
                {/* Live Real-time Status Badge */}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-live"></span>
                  Live
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">
                {stats.totalLearners} contenders • {stats.totalProblemsSolved} problems mastered
              </p>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh leaderboard rankings"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 border border-transparent hover:border-border-dark/60 transition-all active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Filter Controls: Timeframe & Metric Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5 pb-3 border-b border-border-dark/40">
          {/* Timeframe selector */}
          <div className="flex items-center bg-gray-900/60 p-1 rounded-xl border border-border-dark/40 text-xs">
            <button
              onClick={() => setTimeframe('all-time')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeframe === 'all-time'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeframe === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                timeframe === 'week'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              This Week
            </button>
          </div>

          {/* Sort Metric Selector */}
          <div className="flex items-center gap-1 self-end sm:self-auto text-xs">
            <span className="text-[11px] text-gray-500 mr-1 hidden sm:inline">Sort:</span>
            <button
              onClick={() => setSortBy('score')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'score'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              Score
            </button>
            <button
              onClick={() => setSortBy('solved')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'solved'
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              Solved
            </button>
            <button
              onClick={() => setSortBy('streak')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'streak'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              Streak
            </button>
          </div>
        </div>

        {/* Empty state */}
        {entries.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 gap-3 border border-dashed border-border-dark/60 rounded-xl">
            <Users className="w-8 h-8 opacity-40 text-indigo-400" />
            <p className="text-sm text-gray-300 font-medium">No contenders found for this timeframe</p>
            <p className="text-xs text-gray-500 max-w-xs">
              Solve or review problems to become the first on the leaderboard!
            </p>
          </div>
        ) : (
          /* Leaderboard Entries List with Smooth Transitions */
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
            {entries.map((entry, index) => {
              const isTop1 = entry.rank === 1;
              const isTop2 = entry.rank === 2;
              const isTop3 = entry.rank === 3;
              const isUser = entry.isCurrentUser;

              // Row styling classes
              let tierClass = 'bg-gray-900/40 border-border-dark/40 hover:border-gray-700/60';
              if (isTop1) tierClass = 'rank-gold shadow-lg shadow-amber-500/5';
              else if (isTop2) tierClass = 'rank-silver shadow-lg shadow-slate-500/5';
              else if (isTop3) tierClass = 'rank-bronze shadow-lg shadow-amber-700/5';
              
              if (isUser) {
                tierClass += ' ring-1 ring-indigo-500/70 bg-indigo-950/30';
              }

              return (
                <div
                  key={entry.id}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className={`animate-fade-in-up flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-300 hover:translate-x-1 group min-w-0 ${tierClass}`}
                >
                  {/* Left: Rank, Avatar, Name & Status Badge */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
                    {/* Rank Indicator */}
                    <div className="flex items-center justify-center w-7 sm:w-8 shrink-0">
                      {isTop1 ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-extrabold flex items-center justify-center text-xs shadow-md shadow-amber-500/30">
                          <Crown className="w-4 h-4 fill-black" />
                        </div>
                      ) : isTop2 ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-slate-300 to-gray-200 text-slate-900 font-extrabold flex items-center justify-center text-xs shadow-md shadow-slate-400/20">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : isTop3 ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-100 font-extrabold flex items-center justify-center text-xs shadow-md shadow-amber-800/30">
                          <Medal className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-gray-500 group-hover:text-gray-300 transition-colors">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* User Avatar with Deterministic Gradient */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                          entry.username
                        )} flex items-center justify-center text-white font-display font-bold text-xs sm:text-sm shadow-md border border-white/10`}
                      >
                        {entry.initials}
                      </div>
                      {/* Active Streak flame mini indicator */}
                      {entry.streak >= 3 && (
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center text-[10px] border border-amber-500/50 shadow"
                          title={`${entry.streak} day streak`}
                        >
                          🔥
                        </div>
                      )}
                    </div>

                    {/* Name, Handle & Status Badge */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs sm:text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                          {entry.name}
                        </span>
                        {isUser && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                            You
                          </span>
                        )}
                      </div>

                      {/* Subtitle: Username & Optional Status Badge */}
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate mt-0.5">
                        <span className="truncate">@{entry.username}</span>
                        {entry.badge && (
                          <>
                            <span className="text-gray-700">•</span>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium shrink-0 ${
                                isTop1
                                  ? 'text-amber-400 bg-amber-500/10'
                                  : isTop2
                                  ? 'text-slate-300 bg-slate-400/10'
                                  : isTop3
                                  ? 'text-amber-500 bg-amber-600/10'
                                  : 'text-indigo-400 bg-indigo-500/10'
                              }`}
                            >
                              <span>{entry.badge.icon}</span>
                              <span className="hidden sm:inline">{entry.badge.label}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Score & Sub-metrics */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right flex flex-col items-end">
                      {/* Main Dynamic Metric Value */}
                      <div className="font-display font-extrabold text-sm sm:text-base text-gray-100 flex items-center gap-1">
                        {sortBy === 'score' && (
                          <span>{entry.score.toLocaleString()} <span className="text-[10px] font-sans font-normal text-amber-400">pts</span></span>
                        )}
                        {sortBy === 'solved' && (
                          <span className="text-indigo-400">{entry.solvedCount} <span className="text-[10px] font-sans font-normal text-gray-400">solved</span></span>
                        )}
                        {sortBy === 'streak' && (
                          <span className="text-rose-400">{entry.streak} <span className="text-[10px] font-sans font-normal text-gray-400">days</span></span>
                        )}
                      </div>

                      {/* Secondary metrics (solved / streak) */}
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        {sortBy !== 'solved' && (
                          <span>{entry.solvedCount} solved</span>
                        )}
                        {sortBy !== 'streak' && (
                          <>
                            {sortBy !== 'solved' && <span>•</span>}
                            <span className="flex items-center text-amber-500/90">
                              <Flame className="w-2.5 h-2.5 mr-0.5" />
                              {entry.streak}d
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rank delta indicator */}
                    <div className="w-4 flex justify-center text-[10px] text-gray-500">
                      {entry.change && entry.change > 0 ? (
                        <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : entry.change && entry.change < 0 ? (
                        <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Minus className="w-2.5 h-2.5 text-gray-600" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current User Floating Footer (if user ranked outside top view or as an instant summary) */}
      {currentUser && (
        <div className="mt-4 pt-3 border-t border-border-dark/60 flex items-center justify-between text-xs bg-indigo-950/20 px-3 py-2.5 rounded-xl border border-indigo-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-indigo-400 font-display">Your Rank:</span>
            <span className="font-mono font-extrabold text-white bg-indigo-600/30 px-2 py-0.5 rounded border border-indigo-500/40">
              #{currentUser.rank}
            </span>
            <span className="text-gray-400 truncate hidden sm:inline">
              ({currentUser.score.toLocaleString()} pts • {currentUser.solvedCount} solved)
            </span>
          </div>
          <span className="text-[11px] text-indigo-300/80 font-medium shrink-0">
            {currentUser.rank <= 3 ? '🏆 Podium Place!' : currentUser.rank <= 10 ? '⭐ Top 10 Contender' : 'Keep revising to rank up!'}
          </span>
        </div>
      )}
    </div>
  );
};
