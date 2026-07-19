import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Trophy, 
  Flame, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  TrendingUp, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import api from '../services/api.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // 1. Fetch Analytics data
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    },
    refetchInterval: 30 * 1000, // refresh every 30 seconds
  });

  // 2. Mutation to trigger manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync');
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate queries to reload data
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      alert(`Sync successful! Imported ${data.newProblemsCount} new problem(s).`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Sync failed. Check username configuration.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-gray-800/60 rounded-xl w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-800/60 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-gray-800/60 rounded-2xl"></div>
          <div className="h-80 bg-gray-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center">
        <p className="font-semibold mb-2">Error loading dashboard</p>
        <p className="text-sm">Please refresh the page or sign in again.</p>
      </div>
    );
  }

  const { summary, difficulty, lastSync, solvedPerWeek, latestProblems } = analytics;

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card-dark border border-border-dark p-3 rounded-xl shadow-xl text-xs">
          <p className="text-gray-400 font-medium">Week: {payload[0].payload.weekStart}</p>
          <p className="text-indigo-400 font-bold mt-1">Solved: {payload[0].value} problems</p>
        </div>
      );
    }
    return null;
  };

  const totalDiff = difficulty.easy + difficulty.medium + difficulty.hard;
  const getPercentage = (val: number) => {
    if (totalDiff === 0) return 0;
    return Math.round((val / totalDiff) * 100);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-100 mb-1">
            Dashboard
          </h1>
          <p className="text-sm text-gray-400">
            Monitor revision streaks, completion rates, and queue stats
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">Last Synced Profile</p>
              <p className={`text-xs font-medium ${lastSync.success ? 'text-gray-300' : 'text-rose-400'}`}>
                {lastSync.success 
                  ? `${new Date(lastSync.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${lastSync.newProblemsCount} new)` 
                  : 'Sync failed'}
              </p>
            </div>
          )}
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Streak */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-colors duration-300"></div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revision Streak</span>
            <span className="text-2xl font-display font-extrabold text-gray-100 flex items-center gap-2">
              {summary.streak} <span className="text-sm font-sans font-normal text-gray-500">days</span>
            </span>
            <span className="text-xs text-gray-500 truncate">Max streak: {summary.maxStreak} days</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3.5 rounded-xl shadow-inner shadow-amber-500/5">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Due Today */}
        <Link to="/queue?status=due" className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Today</span>
            <span className="text-2xl font-display font-extrabold text-gray-100">
              {summary.dueCount} <span className="text-sm font-sans font-normal text-gray-500">problems</span>
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              {summary.overdueCount > 0 ? (
                <span className="text-rose-400 font-semibold">{summary.overdueCount} overdue</span>
              ) : (
                'Clean backlog!'
              )}
            </span>
          </div>
          <div className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 p-3.5 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </Link>

        {/* Completion Rate */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-300"></div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Retention Rate</span>
            <span className="text-2xl font-display font-extrabold text-gray-100">
              {summary.completionRate}%
            </span>
            <span className="text-xs text-gray-500">Successful recall rate</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3.5 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Solved */}
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-colors duration-300"></div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tracked</span>
            <span className="text-2xl font-display font-extrabold text-gray-100">
              {summary.totalSolved} <span className="text-sm font-sans font-normal text-gray-500">solved</span>
            </span>
            <span className="text-xs text-gray-500">Active spaced repetition</span>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3.5 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Weekly Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-border-dark/60 flex flex-col justify-between shadow-xl min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="font-display font-bold text-lg text-gray-200">Solve Consistency</h2>
            </div>
            <span className="text-xs text-gray-500">Last 6 weeks</span>
          </div>
          
          <div className="h-64 w-full">
            {totalDiff === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 border border-dashed border-border-dark/60 rounded-xl">
                <HelpCircle className="w-8 h-8 opacity-40" />
                <span className="text-sm">No submissions tracked yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={solvedPerWeek} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="weekStart" 
                    stroke="#4b5563" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#4b5563" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {solvedPerWeek.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === solvedPerWeek.length - 1 ? '#6366f1' : '#4f46e5'} 
                        fillOpacity={index === solvedPerWeek.length - 1 ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Difficulty Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border-border-dark/60 flex flex-col justify-between shadow-xl min-w-0">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-200 mb-6 flex items-center gap-2">
              <span>Difficulty Allocation</span>
            </h2>

            {totalDiff === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center text-gray-500 gap-2 border border-dashed border-border-dark/60 rounded-xl">
                <HelpCircle className="w-8 h-8 opacity-40" />
                <span className="text-sm">Sync your account to see profile allocation</span>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Easy */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Easy
                    </span>
                    <span className="text-gray-400 font-semibold">{difficulty.easy} ({getPercentage(difficulty.easy)}%)</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercentage(difficulty.easy)}%` }}></div>
                  </div>
                </div>

                {/* Medium */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Medium
                    </span>
                    <span className="text-gray-400 font-semibold">{difficulty.medium} ({getPercentage(difficulty.medium)}%)</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercentage(difficulty.medium)}%` }}></div>
                  </div>
                </div>

                {/* Hard */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Hard
                    </span>
                    <span className="text-gray-400 font-semibold">{difficulty.hard} ({getPercentage(difficulty.hard)}%)</span>
                  </div>
                  <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercentage(difficulty.hard)}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border-dark/60 pt-4 mt-6 flex justify-between text-xs text-gray-500">
            <span>Total Sync Count</span>
            <span className="font-bold text-gray-300">{totalDiff} solved problems</span>
          </div>
        </div>
      </div>

      {/* Grid: Most Forgotten & Recent Submissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Forgotten Topics */}
        <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-200 mb-5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Retention Pain Points</span>
            </h2>
            
            {analytics.mostForgottenTopics.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                No topic warnings! You have great retention.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {analytics.mostForgottenTopics.map((topicStat: any) => (
                  <div key={topicStat.topic} className="flex justify-between items-center gap-3 p-3 rounded-xl bg-gray-900/30 border border-border-dark/30 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-200 truncate">{topicStat.topic}</span>
                      <span className="text-xs text-gray-500">{topicStat.forgotCount} resets / {topicStat.totalCount} reviews</span>
                    </div>
                    <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 shrink-0">
                      {topicStat.forgotRate}% Forget Rate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Latest Tracked Problems */}
        <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-gray-200 mb-5">
              Recently Solved & Synced
            </h2>
            
            {latestProblems.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                No problems tracked yet. Link your LeetCode username and click "Sync Now".
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {latestProblems.map((prob: any) => (
                  <Link 
                    key={prob.id}
                    to={`/problem/${prob.id}`} 
                    className="flex justify-between items-center p-3 rounded-xl bg-gray-900/30 border border-border-dark/30 hover:border-indigo-500/30 hover:bg-gray-800/20 transition-all group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-gray-200 truncate group-hover:text-indigo-400 transition-colors">
                        {prob.title}
                      </span>
                      <span className="text-xs text-gray-500">
                        Solved: {new Date(prob.solvedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`
                        text-xs font-semibold px-2 py-0.5 rounded
                        ${prob.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                        ${prob.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
                        ${prob.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''}
                      `}>
                        {prob.difficulty}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
