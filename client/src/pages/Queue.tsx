import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  ChevronRight, 
  AlertCircle,
  Play,
  Pause,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api.js';

export const Queue: React.FC = () => {
  const queryClient = useQueryClient();

  // Filter & Sorting state
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('due'); // default filter to 'due' revisions
  const [sortBy, setSortBy] = useState('due_asc');

  // Fetch problems list
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['problems', search, difficulty, status, sortBy],
    queryFn: async () => {
      const res = await api.get('/problems', {
        params: {
          search,
          difficulty,
          status,
          sortBy,
        },
      });
      return res.data;
    },
  });

  // Toggle status mutation (pause / resume)
  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: 'active' | 'paused' | 'completed' }) => {
      const res = await api.patch(`/problems/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
  });

  // Delete problem tracking mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/problems/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
    },
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to stop tracking "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const problems = queueData?.problems || [];

  // Formatter for due countdown
  const getRemainingTime = (dateStr: string, dueStatus: string) => {
    const nextReview = new Date(dateStr);
    const now = new Date();
    const diffTime = nextReview.getTime() - now.getTime();
    
    if (dueStatus === 'completed') return 'Completed';
    if (dueStatus === 'paused') return 'Paused';

    if (diffTime <= 0) {
      const overdueTime = Math.abs(diffTime);
      const diffDays = Math.floor(overdueTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        const diffHours = Math.floor(overdueTime / (1000 * 60 * 60));
        return diffHours > 0 ? `${diffHours}h overdue` : 'Due now';
      }
      return `${diffDays}d overdue`;
    } else {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
        return `${diffHours}h left`;
      }
      return `in ${diffDays} days`;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-100 mb-1">
          Revision Queue
        </h1>
        <p className="text-sm text-gray-400">
          Review your solved LeetCode patterns at key spaced repetition milestones
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-5 rounded-2xl border-border-dark/60 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, tags..."
            className="w-full bg-gray-900/60 border border-border-dark/50 rounded-xl py-2.5 pl-11 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center overflow-x-auto whitespace-nowrap bg-gray-900/40 rounded-xl p-1 border border-border-dark/40 w-full sm:w-auto scrollbar-none">
            {[
              { id: 'due', label: 'Due' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'completed', label: 'Completed' },
              { id: 'paused', label: 'Paused' },
              { id: '', label: 'All' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${status === s.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-gray-200'}
                `}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Difficulty Dropdown */}
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-gray-900/60 border border-border-dark/60 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 w-full sm:w-auto flex-1 sm:flex-initial"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-900/60 border border-border-dark/60 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 w-full sm:w-auto flex-1 sm:flex-initial"
          >
            <option value="due_asc">Due Date (Oldest First)</option>
            <option value="due_desc">Due Date (Newest First)</option>
            <option value="date_desc">Solved Date (Newest First)</option>
            <option value="date_asc">Solved Date (Oldest First)</option>
            <option value="diff_desc">Difficulty (Hard First)</option>
            <option value="diff_asc">Difficulty (Easy First)</option>
          </select>
        </div>
      </div>

      {/* Main Problems List */}
      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-800/40 rounded-xl"></div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border-border-dark/40 text-center flex flex-col items-center justify-center gap-4">
          <Calendar className="w-12 h-12 text-gray-600 opacity-60" />
          <div>
            <h3 className="font-display font-semibold text-lg text-gray-300 mb-1">Queue is empty</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {status === 'due' 
                ? "No revisions due right now! Check back later, or review upcoming questions."
                : "No tracked problems found matching your active filters."}
            </p>
          </div>
          {status === 'due' && (
            <button
              onClick={() => setStatus('')}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl transition-all"
            >
              View All Problems
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {problems.map((item: any) => {
            const isOverdue = item.dueStatus === 'overdue';
            const isDueNow = item.dueStatus === 'due';
            
            return (
              <div 
                key={item.id}
                className="glass-panel glass-panel-hover p-5 rounded-2xl border-border-dark/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Problem Info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`
                    w-2.5 h-10 rounded-full shrink-0
                    ${item.problem.difficulty === 'Easy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : ''}
                    ${item.problem.difficulty === 'Medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : ''}
                    ${item.problem.difficulty === 'Hard' ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : ''}
                  `}></div>
                  <div className="flex flex-col min-w-0 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link 
                        to={`/problem/${item.id}`}
                        className="font-display font-bold text-gray-100 hover:text-indigo-400 transition-colors truncate"
                      >
                        {item.problem.title}
                      </Link>
                      <span className={`
                        text-[10px] font-bold px-2 py-0.5 rounded
                        ${item.problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400' : ''}
                        ${item.problem.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' : ''}
                        ${item.problem.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400' : ''}
                      `}>
                        {item.problem.difficulty}
                      </span>
                      {item.status === 'paused' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 flex items-center gap-1">
                          <Pause className="w-2.5 h-2.5" /> Paused
                        </span>
                      )}
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {item.problem.topics.split(',').map((t: string) => (
                        <span 
                          key={t} 
                          className="text-[10px] bg-gray-900/60 border border-border-dark/60 text-gray-400 px-2 py-0.5 rounded-md"
                        >
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tracking / SR Meta */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 shrink-0 border-t sm:border-t-0 border-border-dark/40 pt-4 sm:pt-0">
                  {/* Next Review & Stages */}
                  <div className="text-left sm:text-right">
                    <div className="flex items-center gap-1.5 sm:justify-end text-xs font-semibold">
                      {isOverdue && (
                        <span className="text-rose-500 flex items-center gap-1 font-bold animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                        </span>
                      )}
                      {isDueNow && !isOverdue && (
                        <span className="text-amber-500 font-bold">Due Today</span>
                      )}
                      <span className={`
                        ${isOverdue ? 'text-rose-400 font-semibold' : ''}
                        ${isDueNow && !isOverdue ? 'text-amber-400 font-semibold' : ''}
                        ${!isDueNow && !isOverdue ? 'text-gray-400' : ''}
                      `}>
                        {getRemainingTime(item.nextReviewAt, item.dueStatus)}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Stage {item.currentReviewStage + 1} / 6 • Solved: {new Date(item.solvedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Pause / Resume */}
                    {item.status === 'paused' ? (
                      <button
                        onClick={() => statusMutation.mutate({ id: item.id, newStatus: 'active' })}
                        title="Resume review schedule"
                        className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 transition-colors border border-border-dark"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => statusMutation.mutate({ id: item.id, newStatus: 'paused' })}
                        title="Pause review schedule"
                        className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-amber-500 hover:bg-gray-800 transition-colors border border-border-dark"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(item.id, item.problem.title)}
                      title="Remove tracking"
                      className="p-2 rounded-xl bg-gray-900 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-border-dark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Open Problem Detail */}
                    <Link 
                      to={`/problem/${item.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all text-xs font-semibold"
                    >
                      <span>Revise</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
