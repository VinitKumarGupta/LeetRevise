import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  BookOpen, 
  Check, 
  Save, 
  History, 
  Clock, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import api from '../services/api.js';

export const ProblemDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    mutationFn: async (result: 'easy' | 'effort' | 'forgot' | 'skipped') => {
      const res = await api.post(`/problems/${id}/review`, { result, notes });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      alert(`Review logged! Next revision scheduled for ${new Date(data.solvedProblem.nextReviewAt).toLocaleDateString()}`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to log review.');
    },
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
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
      alert(err.response?.data?.message || 'Failed to save notes.');
    },
    onSettled: () => {
      setIsSavingNotes(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-6 bg-gray-800/60 rounded w-24"></div>
        <div className="h-20 bg-gray-800/60 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-gray-800/60 rounded-2xl"></div>
          <div className="h-96 bg-gray-800/60 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !problemData?.problem) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center flex flex-col items-center gap-3">
        <p className="font-semibold">Problem tracking record not found.</p>
        <Link to="/queue" className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl transition-all">
          Back to Queue
        </Link>
      </div>
    );
  }

  const { problem } = problemData;
  const pData = problem.problem; // canonical details
  const history = problem.history || [];

  // Spaced repetition stages metadata
  const stages = [
    { label: 'Stage 1', interval: '1 day' },
    { label: 'Stage 2', interval: '3 days' },
    { label: 'Stage 3', interval: '1 week' },
    { label: 'Stage 4', interval: '2 weeks' },
    { label: 'Stage 5', interval: '1 month' },
    { label: 'Stage 6', interval: '3 months' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Problem Header Card */}
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className={`
          absolute top-0 left-0 w-2.5 h-full
          ${pData.difficulty === 'Easy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
          ${pData.difficulty === 'Medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}
          ${pData.difficulty === 'Hard' ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}
        `}></div>

        <div className="flex flex-col gap-3 pl-2 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 font-mono">
              ID: {pData.leetcodeProblemId}
            </span>
            <span className={`
              text-xs font-bold px-2 py-0.5 rounded
              ${pData.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
              ${pData.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
              ${pData.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''}
            `}>
              {pData.difficulty}
            </span>
            {problem.status === 'paused' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                Tracking Paused
              </span>
            )}
          </div>
          
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-gray-100 tracking-tight">
            {pData.title}
          </h1>

          <div className="flex flex-wrap gap-1.5 mt-1">
            {pData.topics.split(',').map((t: string) => (
              <span 
                key={t} 
                className="text-[10px] bg-gray-900/60 border border-border-dark/60 text-gray-400 px-2 py-0.5 rounded-md"
              >
                {t.trim()}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <a
            href={pData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-900 border border-border-dark hover:bg-gray-800 text-gray-200 transition-colors shadow-sm"
          >
            <span>Open LeetCode</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Visual Stepper of Spaced Repetition Stages */}
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Spaced Repetition Milestone
        </h2>
        <div className="relative flex items-center justify-between mt-4 mb-2">
          {/* Progress bar line */}
          <div className="absolute left-0 right-0 h-1.5 bg-gray-900 rounded-full z-0"></div>
          <div 
            className="absolute left-0 h-1.5 bg-indigo-600 rounded-full z-0 transition-all duration-500"
            style={{ width: `${(problem.currentReviewStage / (stages.length - 1)) * 100}%` }}
          ></div>

          {/* Steps */}
          {stages.map((stage, idx) => {
            const isCompleted = idx < problem.currentReviewStage;
            const isCurrent = idx === problem.currentReviewStage;
            
            return (
              <div key={idx} className="flex flex-col items-center gap-2 relative z-10 shrink-0">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border
                  ${isCompleted 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30' 
                    : ''}
                  ${isCurrent 
                    ? 'bg-bg-dark border-indigo-500 text-indigo-400 ring-4 ring-indigo-500/20 scale-110 shadow-lg' 
                    : ''}
                  ${!isCompleted && !isCurrent 
                    ? 'bg-bg-dark border-border-dark text-gray-500' 
                    : ''}
                `}>
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                  <span className="text-[9px] text-gray-500 font-medium">
                    {stage.interval}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Notes and Logging */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Notes Editor */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Notes Area */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Personal Solution Notes</span>
              </h2>
              <button
                onClick={() => saveNotesMutation.mutate()}
                disabled={isSavingNotes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 border border-border-dark hover:bg-gray-800 text-gray-300 disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingNotes ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Notes'}
              </button>
            </div>
            
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document the core pattern, time/space complexity, tricky edge cases, common bugs, templates or tricks..."
              className="w-full bg-gray-900/40 border border-border-dark/60 rounded-xl p-4 min-h-[300px] text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors leading-relaxed resize-y font-sans"
            />
          </div>
        </div>

        {/* Right Side: Log Review & History */}
        <div className="flex flex-col gap-6">
          {/* Review Decision Card */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200">
              Log Revision Result
            </h2>
            <p className="text-xs text-gray-500">
              Pick an outcome to advance or adjust the repetition schedule.
            </p>

            <div className="flex flex-col gap-2.5 mt-2">
              {/* Solved Easily */}
              <button
                onClick={() => reviewMutation.mutate('easy')}
                disabled={reviewMutation.isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-semibold text-xs text-left transition-all active:scale-98"
              >
                <span>Solved Easily</span>
                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Next Milestone
                </span>
              </button>

              {/* Solved with Effort */}
              <button
                onClick={() => reviewMutation.mutate('effort')}
                disabled={reviewMutation.isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 font-semibold text-xs text-left transition-all active:scale-98"
              >
                <span>Solved with Effort</span>
                <span className="text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Repeat Interval
                </span>
              </button>

              {/* Forgot */}
              <button
                onClick={() => reviewMutation.mutate('forgot')}
                disabled={reviewMutation.isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-semibold text-xs text-left transition-all active:scale-98"
              >
                <span>Forgot Solution</span>
                <span className="text-[10px] bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Reset to Stage 1
                </span>
              </button>

              {/* Skipped */}
              <button
                onClick={() => reviewMutation.mutate('skipped')}
                disabled={reviewMutation.isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-gray-500/20 bg-gray-500/5 hover:bg-gray-500/10 text-gray-400 font-semibold text-xs text-left transition-all active:scale-98"
              >
                <span>Skip For Now</span>
                <span className="text-[10px] bg-gray-500/10 px-2 py-0.5 rounded border border-gray-500/20">
                  Postpone 1 Day
                </span>
              </button>
            </div>

            <div className="border-t border-border-dark/60 pt-4 text-[11px] text-gray-500 flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Last Reviewed:</span>
                <span className="font-semibold text-gray-400">
                  {problem.lastReviewedAt ? new Date(problem.lastReviewedAt).toLocaleDateString() : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Next Scheduled:</span>
                <span className="font-semibold text-indigo-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(problem.nextReviewAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              <span>Revision History</span>
            </h2>

            {history.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-8">
                No reviews logged yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                {history.map((hist: any, index: number) => (
                  <div key={hist.id} className="relative flex gap-3 items-start">
                    {/* Vertical line indicator */}
                    {index < history.length - 1 && (
                      <div className="absolute left-[13px] top-6 bottom-[-20px] w-0.5 bg-gray-900"></div>
                    )}
                    
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-bold uppercase
                      ${hist.result === 'easy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : ''}
                      ${hist.result === 'effort' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : ''}
                      ${hist.result === 'forgot' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : ''}
                      ${hist.result === 'skipped' ? 'bg-gray-800 border-border-dark text-gray-400' : ''}
                    `}>
                      {hist.result.substring(0, 2)}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-300">
                        {hist.result === 'easy' && 'Solved Easily'}
                        {hist.result === 'effort' && 'Solved with Effort'}
                        {hist.result === 'forgot' && 'Forgot Solution'}
                        {hist.result === 'skipped' && 'Review Postponed'}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(hist.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
