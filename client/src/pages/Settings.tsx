import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  User,
  Clock,
  Save,
  CheckCircle,
  HelpCircle,
  UserPlus,
  Plus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api.js';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, updateProfile } = useAuth();

  // ── Profile Settings state ──────────────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Locale & Scheduling state ───────────────────────────────────────────
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [reminderTime, setReminderTime] = useState(user?.reminderTime || '09:00');
  const [localeSuccess, setLocaleSuccess] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);

  // ── Link Account state ──────────────────────────────────────────────────
  const [username, setUsername] = useState(user?.leetcodeUsername || '');
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // ── Manual Import state ─────────────────────────────────────────────────
  const [manualSlug, setManualSlug] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDifficulty, setManualDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [manualTopics, setManualTopics] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualSolvedAt, setManualSolvedAt] = useState(new Date().toISOString().split('T')[0]);
  const [needsManualDetails, setNeedsManualDetails] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  // ── Profile mutation (name only) ────────────────────────────────────────
  const profileMutation = useMutation({
    mutationFn: async () => {
      setProfileSuccess(false);
      setProfileError(null);
      await updateProfile({ name: name.trim() });
    },
    onSuccess: () => {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: (err: any) => {
      setProfileError(err.message || 'Failed to update name.');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }
    profileMutation.mutate();
  };

  // ── Locale mutation ─────────────────────────────────────────────────────
  const localeMutation = useMutation({
    mutationFn: async () => {
      setLocaleSuccess(false);
      setLocaleError(null);
      await updateProfile({ timezone, reminderTime });
    },
    onSuccess: () => {
      setLocaleSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setTimeout(() => setLocaleSuccess(false), 3000);
    },
    onError: (err: any) => {
      setLocaleError(err.message || 'Failed to save locale settings.');
    },
  });

  const handleLocaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reminderTime)) {
      setLocaleError('Reminder time must be in HH:MM format (24h).');
      return;
    }
    localeMutation.mutate();
  };

  // ── Link Account mutation ───────────────────────────────────────────────
  const linkMutation = useMutation({
    mutationFn: async () => {
      setIsLinking(true);
      setLinkSuccess(false);
      setLinkError(null);
      await updateProfile({ leetcodeUsername: username.trim() || null });
    },
    onSuccess: () => {
      setLinkSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setTimeout(() => setLinkSuccess(false), 3000);
    },
    onError: (err: any) => {
      setLinkError(err.message || 'Failed to update LeetCode username.');
    },
    onSettled: () => {
      setIsLinking(false);
    },
  });

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    linkMutation.mutate();
  };

  // ── Manual Import mutation ──────────────────────────────────────────────
  const manualAddMutation = useMutation({
    mutationFn: async (payload: any) => {
      setManualMessage(null);
      setManualError(null);
      const res = await api.post('/sync/manual', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setManualMessage(data.message || 'Problem successfully added!');
      setManualSlug('');
      setManualTitle('');
      setManualTopics('');
      setManualUrl('');
      setNeedsManualDetails(false);
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSlug.trim()) {
      setManualError('Title slug or URL is required.');
      return;
    }

    const payload: any = { titleSlug: manualSlug };
    if (needsManualDetails) {
      if (!manualTitle.trim()) {
        setManualError('Title is required for manual entry.');
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

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight text-gray-100 mb-1">
          Settings
        </h1>
        <p className="text-sm text-gray-400">
          Manage your account, linked LeetCode profile, and scheduling preferences.
        </p>
      </div>

      {/* ── 1. Link Account ──────────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
        <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
          <UserPlus className="w-5 h-5 text-indigo-400" />
          <span>Link Account</span>
        </h2>
        <p className="text-xs text-gray-400">
          Enter your public LeetCode username to enable problem syncing. Your submissions list must be public.
        </p>

        {linkSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            LeetCode username saved successfully.
          </div>
        )}
        {linkError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {linkError}
          </div>
        )}

        <form onSubmit={handleLinkSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="LeetCode Username"
            className="flex-1 bg-gray-900/60 border border-border-dark/60 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLinking}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            {isLinking ? 'Saving...' : 'Save Username'}
          </button>
        </form>

        {user?.leetcodeUsername && (
          <p className="text-xs text-gray-500">
            Currently linked: <span className="text-indigo-400 font-semibold">@{user.leetcodeUsername}</span>
          </p>
        )}
      </div>

      {/* ── 2. Manual Import ─────────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
        <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
          <Plus className="w-5 h-5 text-indigo-400" />
          <span>Manual Import</span>
        </h2>
        <p className="text-xs text-gray-500">
          If auto-sync doesn't pick up a problem, add it manually using its URL or slug.
        </p>

        {manualMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            {manualMessage}
          </div>
        )}
        {manualError && (
          <div className="flex gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{manualError}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
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
              className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Extra fields shown only if LeetCode API fetch fails */}
          {needsManualDetails && (
            <div className="border-t border-border-dark pt-4 flex flex-col gap-4">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                <strong>Note:</strong> We couldn't fetch details automatically. Please fill them in manually.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Problem Title</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Two Sum"
                  className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Difficulty</label>
                <select
                  value={manualDifficulty}
                  onChange={(e) => setManualDifficulty(e.target.value as any)}
                  className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags / Topics (comma-separated)</label>
                <input
                  type="text"
                  value={manualTopics}
                  onChange={(e) => setManualTopics(e.target.value)}
                  placeholder="e.g. Array, Hash Table"
                  className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">LeetCode URL (optional)</label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://leetcode.com/problems/..."
                  className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Solve Date</label>
                <input
                  type="date"
                  required
                  value={manualSolvedAt}
                  onChange={(e) => setManualSolvedAt(e.target.value)}
                  className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl px-3.5 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={manualAddMutation.isPending}
              className="flex-1 bg-gray-900 hover:bg-gray-800 border border-border-dark text-gray-200 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${manualAddMutation.isPending ? 'animate-spin' : ''}`} />
              {manualAddMutation.isPending ? 'Processing...' : needsManualDetails ? 'Save Problem' : 'Verify & Add'}
            </button>
            {needsManualDetails && (
              <button
                type="button"
                onClick={() => { setNeedsManualDetails(false); setManualError(null); }}
                className="px-4 text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── 3. Profile Settings (Full Name only) ─────────────────────────── */}
      <form onSubmit={handleProfileSubmit} className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
        <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
          <User className="w-5 h-5 text-indigo-400" />
          <span>Profile Settings</span>
        </h2>

        {profileSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Name updated successfully.
          </div>
        )}
        {profileError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {profileError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="bg-gray-900/60 border border-border-dark/60 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={profileMutation.isPending}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 self-start px-5"
        >
          <Save className="w-3.5 h-3.5" />
          {profileMutation.isPending ? 'Saving...' : 'Save Name'}
        </button>
      </form>

      {/* ── 4. Locale & Scheduling ───────────────────────────────────────── */}
      <form onSubmit={handleLocaleSubmit} className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
        <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
          <Globe className="w-5 h-5 text-indigo-400" />
          <span>Locale & Scheduling</span>
        </h2>

        {localeSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Locale settings saved.
          </div>
        )}
        {localeError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {localeError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-gray-900/60 border border-border-dark/60 rounded-xl px-3 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <span>Daily Revision Alert Time</span>
              <span title="We check for due revisions at this time daily" className="text-gray-600 hover:text-gray-400 cursor-help">
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                placeholder="e.g. 09:00"
                className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={localeMutation.isPending}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 self-start px-5"
        >
          <Save className="w-3.5 h-3.5" />
          {localeMutation.isPending ? 'Saving...' : 'Save Locale'}
        </button>
      </form>
    </div>
  );
};
