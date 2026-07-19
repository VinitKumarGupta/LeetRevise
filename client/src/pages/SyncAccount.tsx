import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.js';
import { 
  RefreshCw, 
  UserPlus, 
  History, 
  CheckCircle, 
  XCircle, 
  Plus, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import api from '../services/api.js';

export const SyncAccount: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, updateProfile } = useAuth();

  // Username connection state
  const [username, setUsername] = useState(user?.leetcodeUsername || '');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Manual fallback form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualSlug, setManualSlug] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDifficulty, setManualDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [manualTopics, setManualTopics] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualSolvedAt, setManualSolvedAt] = useState(new Date().toISOString().split('T')[0]);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [needsManualDetails, setNeedsManualDetails] = useState(false);

  // Fetch sync history logs
  const { data: syncHistory, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['syncHistory'],
    queryFn: async () => {
      const res = await api.get('/sync/history');
      return res.data;
    },
    refetchInterval: 10 * 1000, // refresh logs every 10s during sync tests
  });

  // Link username mutation
  const linkUsernameMutation = useMutation({
    mutationFn: async (usernameVal: string) => {
      setIsUpdatingUser(true);
      await updateProfile({ leetcodeUsername: usernameVal || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      alert('LeetCode username updated successfully.');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update username.');
    },
    onSettled: () => {
      setIsUpdatingUser(false);
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/sync');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      alert(`Sync successful! Imported ${data.newProblemsCount} new problem(s).`);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Sync failed. Verify username public profile settings.');
    },
  });

  // Manual problem add mutation
  const manualAddMutation = useMutation({
    mutationFn: async (payload: any) => {
      setManualMessage(null);
      setManualError(null);
      const res = await api.post('/sync/manual', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setManualMessage(data.message || 'Problem successfully added!');
      // Reset form
      setManualSlug('');
      setManualTitle('');
      setManualTopics('');
      setManualUrl('');
      setNeedsManualDetails(false);
      setShowManualForm(false);
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      if (responseData?.needsManualDetails) {
        setNeedsManualDetails(true);
        setManualSlug(responseData.slug);
        setManualError(responseData.message || 'LeetCode API failed. Enter details manually.');
      } else {
        setManualError(responseData?.message || 'Failed to add problem manually.');
      }
    },
  });

  const handleLinkUsername = (e: React.FormEvent) => {
    e.preventDefault();
    linkUsernameMutation.mutate(username.trim());
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSlug.trim()) {
      setManualError('Title slug or URL is required');
      return;
    }

    const payload: any = {
      titleSlug: manualSlug,
    };

    if (needsManualDetails) {
      if (!manualTitle.trim()) {
        setManualError('Title is required for manual entry');
        return;
      }
      payload.title = manualTitle;
      payload.difficulty = manualDifficulty;
      payload.topics = manualTopics;
      payload.url = manualUrl;
      payload.solvedAt = new Date(manualSolvedAt).toISOString();
    }

    manualAddMutation.mutate(payload);
  };

  const logs = syncHistory?.logs || [];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-100 mb-1">
          LeetCode Account Sync
        </h1>
        <p className="text-sm text-gray-400">
          Connect your account to pull latest solved problems, or add revisions manually on failure
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connections & Sync */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Account connection */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <span>Link Account</span>
            </h2>
            <p className="text-xs text-gray-500">
              Enter your public LeetCode username. Your submissions list must be public for the sync to fetch them.
            </p>

            <form onSubmit={handleLinkUsername} className="flex gap-3 mt-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="LeetCode Username"
                className="flex-1 bg-gray-900/60 border border-border-dark/60 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
              />
              <button
                type="submit"
                disabled={isUpdatingUser}
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-colors shrink-0 disabled:opacity-50"
              >
                {isUpdatingUser ? 'Saving...' : 'Connect'}
              </button>
            </form>
          </div>

          {/* Sync Trigger Card */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
              <span>Synchronize Submissions</span>
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              When you click **Sync Now**, the tracker contacts LeetCode's public API to query your latest resolved problems. Only successfully accepted submissions not yet tracked in your revision schedule will be imported.
            </p>
            
            <div className="flex flex-wrap items-center justify-between gap-4 mt-2 p-4 rounded-xl bg-gray-900/30 border border-border-dark/30">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Connected Profile:</span>
                <span className="text-sm font-bold text-gray-200">
                  {user?.leetcodeUsername ? `@${user.leetcodeUsername}` : 'Not connected'}
                </span>
              </div>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !user?.leetcodeUsername}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-indigo-600/10 active:scale-98"
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Fetching Submissions...' : 'Sync Now'}
              </button>
            </div>
          </div>

          {/* Sync History Logs */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              <span>Sync Log History</span>
            </h2>

            {isLoadingLogs ? (
              <div className="text-center py-6 text-xs text-gray-500">Loading history logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-border-dark/60 rounded-xl">
                No sync logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-dark/60 text-gray-500 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">New Solved</th>
                      <th className="pb-3 font-semibold">Skipped Duplicates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-border-dark/30 last:border-b-0 hover:bg-gray-900/10">
                        <td className="py-3.5 text-gray-400">
                          {new Date(log.syncedAt).toLocaleString()}
                        </td>
                        <td className="py-3.5">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-medium" title={log.errorMessage}>
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 font-bold text-gray-200">{log.newProblemsCount}</td>
                        <td className="py-3.5 text-gray-500">{log.duplicatesSkippedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manual Fallback Form */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Manual Import</span>
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              If LeetCode limits syncing or a problem doesn't appear in the recent submissions list, add it manually.
            </p>

            {manualMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {manualMessage}
              </div>
            )}

            {manualError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualAddSubmit} className="flex flex-col gap-4.5 mt-2">
              {/* Slug input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  LeetCode URL or Problem Slug
                </label>
                <input
                  type="text"
                  required
                  value={manualSlug}
                  onChange={(e) => setManualSlug(e.target.value)}
                  placeholder="e.g. two-sum or full URL"
                  className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                />
              </div>

              {/* Extra details (shown if LeetCode check fails or username is rate-limited) */}
              {needsManualDetails && (
                <div className="border-t border-border-dark pt-4 flex flex-col gap-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                    <strong>Note:</strong> We couldn't fetch details automatically. Please supply details manually.
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Problem Title
                    </label>
                    <input
                      type="text"
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. Two Sum"
                      className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                    />
                  </div>

                  {/* Difficulty */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Difficulty
                    </label>
                    <select
                      value={manualDifficulty}
                      onChange={(e) => setManualDifficulty(e.target.value as any)}
                      className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/80 transition-colors"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  {/* Topics */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Tags / Topics (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={manualTopics}
                      onChange={(e) => setManualTopics(e.target.value)}
                      placeholder="e.g. Array, Hash Table"
                      className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                    />
                  </div>

                  {/* URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      LeetCode URL (optional)
                    </label>
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://leetcode.com/problems/..."
                      className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                    />
                  </div>

                  {/* Solved Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Solve Date
                    </label>
                    <input
                      type="date"
                      required
                      value={manualSolvedAt}
                      onChange={(e) => setManualSolvedAt(e.target.value)}
                      className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={manualAddMutation.isPending}
                className="w-full bg-gray-900 hover:bg-gray-800 border border-border-dark text-gray-200 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
              >
                {manualAddMutation.isPending ? 'Processing...' : needsManualDetails ? 'Save Problem' : 'Verify & Add'}
              </button>

              {needsManualDetails && (
                <button
                  type="button"
                  onClick={() => {
                    setNeedsManualDetails(false);
                    setManualError(null);
                  }}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Cancel manual details
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
