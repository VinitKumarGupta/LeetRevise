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
  const [, setShowManualForm] = useState(false);
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
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-ink mb-1">
          LeetCode Account Sync
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Connect your account to pull latest solved problems, or add revisions manually on failure
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connections & Sync */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Account connection */}
          <div className="panel p-4 sm:p-6 flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent" />
              <span>Link Account</span>
            </h2>
            <p className="text-xs text-muted">
              Enter your public LeetCode username. Your submissions list must be public for the sync to fetch them.
            </p>

            <form onSubmit={handleLinkUsername} className="flex flex-col sm:flex-row gap-3 mt-1">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="LeetCode Username"
                className="field"
              />
              <button
                type="submit"
                disabled={isUpdatingUser}
                className="button button-primary"
              >
                {isUpdatingUser ? 'Saving...' : 'Connect'}
              </button>
            </form>
          </div>

          {/* Sync Trigger Card */}
          <div className="panel p-4 sm:p-6 flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent" />
              <span>Synchronize Submissions</span>
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              When you click **Sync Now**, the tracker contacts LeetCode's public API to query your latest resolved problems. Only successfully accepted submissions not yet tracked in your revision schedule will be imported.
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1 p-4 rounded-xl bg-inset border border-line">
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-muted">Connected Profile:</span>
                <span className="text-sm font-bold text-ink truncate">
                  {user?.leetcodeUsername ? `@${user.leetcodeUsername}` : 'Not connected'}
                </span>
              </div>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !user?.leetcodeUsername}
                className="button button-primary w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                <span>{syncMutation.isPending ? 'Fetching Submissions...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {/* Sync History Logs */}
          <div className="panel p-4 sm:p-6 flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
              <History className="w-5 h-5 text-muted" />
              <span>Sync Log History</span>
            </h2>

            {isLoadingLogs ? (
              <div className="text-center py-6 text-xs text-muted">Loading history logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted border border-dashed border-line rounded-xl">
                No sync logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-line text-muted uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">
                        <span className="hidden sm:inline">New Solved</span>
                        <span className="sm:hidden">New</span>
                      </th>
                      <th className="pb-3 font-semibold">
                        <span className="hidden sm:inline">Skipped Duplicates</span>
                        <span className="sm:hidden">Skipped</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} className="border-b border-line last:border-b-0 hover:bg-inset">
                        <td className="py-3.5 text-muted">
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
                        <td className="py-3.5 font-bold text-ink">{log.newProblemsCount}</td>
                        <td className="py-3.5 text-muted">{log.duplicatesSkippedCount}</td>
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
          <div className="panel p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent" />
                <span>Manual Import</span>
              </h2>
            </div>
            <p className="text-xs text-muted">
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
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  LeetCode URL or Problem Slug
                </label>
                <input
                  type="text"
                  required
                  value={manualSlug}
                  onChange={(e) => setManualSlug(e.target.value)}
                  placeholder="e.g. two-sum or full URL"
                  className="field"
                />
              </div>

              {/* Extra details (shown if LeetCode check fails or username is rate-limited) */}
              {needsManualDetails && (
                <div className="border-t border-line pt-4 flex flex-col gap-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                    <strong>Note:</strong> We couldn't fetch details automatically. Please supply details manually.
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Problem Title
                    </label>
                    <input
                      type="text"
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="e.g. Two Sum"
                      className="field"
                    />
                  </div>

                  {/* Difficulty */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Difficulty
                    </label>
                    <select
                      value={manualDifficulty}
                      onChange={(e) => setManualDifficulty(e.target.value as any)}
                      className="field"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  {/* Topics */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Tags / Topics (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={manualTopics}
                      onChange={(e) => setManualTopics(e.target.value)}
                      placeholder="e.g. Array, Hash Table"
                      className="field"
                    />
                  </div>

                  {/* URL */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      LeetCode URL (optional)
                    </label>
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://leetcode.com/problems/..."
                      className="field"
                    />
                  </div>

                  {/* Solved Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                      Solve Date
                    </label>
                    <input
                      type="date"
                      required
                      value={manualSolvedAt}
                      onChange={(e) => setManualSolvedAt(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={manualAddMutation.isPending}
                className="w-full bg-inset hover:bg-raised border border-line text-ink font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
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
                  className="w-full text-center text-xs text-muted hover:text-muted transition-colors"
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
