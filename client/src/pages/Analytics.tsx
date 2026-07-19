import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Trophy, 
  Flame, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Brain,
  Gauge
} from 'lucide-react';
import api from '../services/api.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';

export const Analytics: React.FC = () => {
  // Fetch Analytics data
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-gray-800/60 rounded-xl w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-800/60 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-800/60 rounded-2xl"></div>
          <div className="h-80 bg-gray-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center">
        <p className="font-semibold">Error loading analytics. Please try again.</p>
      </div>
    );
  }

  const { summary, difficulty, solvedPerWeek, mostForgottenTopics } = analytics;

  const diffData = [
    { name: 'Easy', value: difficulty.easy, color: '#10b981' },
    { name: 'Medium', value: difficulty.medium, color: '#f59e0b' },
    { name: 'Hard', value: difficulty.hard, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const totalSolved = summary.totalSolved;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-100 mb-1">
          Analytics & Progress
        </h1>
        <p className="text-sm text-gray-400">
          Visualize your revision retention rates, strengths, and pain points over time
        </p>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revision Streak</span>
            <span className="text-2xl font-display font-extrabold text-gray-100 flex items-center gap-2">
              {summary.streak} <span className="text-xs font-sans font-normal text-gray-500">days active</span>
            </span>
            <span className="text-[11px] text-gray-500">Max revision streak: {summary.maxStreak} days</span>
          </div>
          <div className="bg-amber-500/10 text-amber-500 p-3.5 rounded-xl border border-amber-500/20">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overall Retention</span>
            <span className="text-2xl font-display font-extrabold text-gray-100">
              {summary.completionRate}%
            </span>
            <span className="text-[11px] text-gray-500">Reviews completed without forgetting</span>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 p-3.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-border-dark/60 shadow-lg">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">Mastered Count</span>
            <span className="text-2xl font-display font-extrabold text-gray-100">
              {summary.completedCount} <span className="text-xs font-sans font-normal text-gray-500">problems</span>
            </span>
            <span className="text-[11px] text-gray-500">Finished all spaced repetition stages</span>
          </div>
          <div className="bg-purple-500/10 text-purple-400 p-3.5 rounded-xl border border-purple-500/20">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>Weekly Solved Progression</span>
            </h2>
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Activity</span>
          </div>

          <div className="h-64 w-full">
            {totalSolved === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 border border-dashed border-border-dark/60 rounded-xl">
                <HelpCircle className="w-8 h-8 opacity-40" />
                <span>No metrics available</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={solvedPerWeek} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="weekStart" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ backgroundColor: '#12131a', borderColor: '#1f2230', borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-400" />
              <span>Difficulty Distribution</span>
            </h2>
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Breakdown</span>
          </div>

          <div className="h-64 flex items-center justify-center relative">
            {diffData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2 border border-dashed border-border-dark/60 rounded-xl">
                <HelpCircle className="w-8 h-8 opacity-40" />
                <span>No problems solved yet</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diffData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {diffData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#12131a', borderColor: '#1f2230', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center text */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-extrabold text-gray-100">{totalSolved}</span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Tracked</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Topic Mastery Map */}
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl">
        <h2 className="font-display font-bold text-lg text-gray-200 mb-5 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <span>Retention pain points by Topic / Tag</span>
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          We track what category of problems you forget. Focus your active recall revision efforts on topics below.
        </p>

        {mostForgottenTopics.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm border border-dashed border-border-dark/60 rounded-xl">
            You currently have a 100% recall retention rate across all tags! Excellent revision consistency.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mostForgottenTopics.map((topic: any) => (
              <div 
                key={topic.topic} 
                className="p-5 rounded-2xl bg-gray-900/40 border border-border-dark/50 flex flex-col gap-3 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-lg pointer-events-none group-hover:bg-rose-500/10 transition-colors"></div>
                <div className="flex justify-between items-start gap-3">
                  <span className="font-display font-bold text-sm text-gray-200 truncate">{topic.topic}</span>
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {topic.forgotRate}% Forget Rate
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  You reset stage back to 1 on {topic.forgotCount} occasions out of {topic.totalCount} total reviews.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
