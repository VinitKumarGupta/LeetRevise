import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  User,
  Clock,
  Save,
  UserPlus,
  Plus,
  Link2,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api.js';
import { Feedback, PageHeader } from '../components/ui.js';

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
    <div className="page-stack settings-page">
      <PageHeader title="Settings" description="Manage your account, LeetCode connection, and revision schedule." />

      <div className="settings-sections">
        <section className="panel settings-section" aria-labelledby="link-heading">
          <header>
            <span className="section-icon"><UserPlus aria-hidden="true" /></span>
            <div>
              <h2 id="link-heading" className="panel-heading">Link Account</h2>
              <p>Connect your LeetCode profile to sync solved problems.</p>
            </div>
          </header>

          <div className="settings-content">
            {user?.leetcodeUsername && (
              <div className="settings-status">
                <span className="badge" data-tone="easy"><Link2 aria-hidden="true" /> Linked</span>
                <b>@{user.leetcodeUsername}</b>
              </div>
            )}
            <form onSubmit={handleLinkSubmit} className="settings-form" aria-busy={isLinking}>
              <div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="leetcode-username" className="field-label">LeetCode username</label>
                    <input
                      id="leetcode-username"
                      type="text"
                      className="field"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your public username"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-describedby="link-help"
                    />
                  </div>
                  <button type="submit" className="button button-primary" disabled={isLinking}>
                    {isLinking && <RefreshCw aria-hidden="true" className="animate-spin" />}
                    {isLinking ? 'Saving…' : 'Save Username'}
                  </button>
                </div>
                <p id="link-help" className="field-help">Your LeetCode submissions list must be public.</p>
              </div>
            </form>
            {linkSuccess && <Feedback tone="success">LeetCode username saved.</Feedback>}
            {linkError && <Feedback tone="error">{linkError}</Feedback>}
          </div>
        </section>

        <section className="panel settings-section" aria-labelledby="import-heading">
          <header>
            <span className="section-icon"><Plus aria-hidden="true" /></span>
            <div>
              <h2 id="import-heading" className="panel-heading">Manual Import</h2>
              <p>Add a solved problem that didn’t come through on a sync.</p>
            </div>
          </header>

          <div className="settings-content">
            <form onSubmit={handleManualSubmit} className="settings-form" aria-busy={manualAddMutation.isPending}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="manual-slug" className="field-label">LeetCode URL or problem slug</label>
                  <input
                    id="manual-slug"
                    type="text"
                    required
                    className="field"
                    value={manualSlug}
                    onChange={(e) => setManualSlug(e.target.value)}
                    placeholder="e.g. two-sum or full URL"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
                {!needsManualDetails && (
                  <button type="submit" className="button button-secondary" disabled={manualAddMutation.isPending}>
                    {manualAddMutation.isPending ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <Plus aria-hidden="true" />}
                    {manualAddMutation.isPending ? 'Verifying…' : 'Verify & Add'}
                  </button>
                )}
              </div>

              {needsManualDetails && (
                <div className="settings-form settings-extra">
                  {manualError && <Feedback tone="warning">{manualError}</Feedback>}
                  <div className="form-grid">
                    <div>
                      <label htmlFor="manual-title" className="field-label">Problem title</label>
                      <input id="manual-title" type="text" required className="field" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="e.g. Two Sum" />
                    </div>
                    <div>
                      <label htmlFor="manual-difficulty" className="field-label">Difficulty</label>
                      <select id="manual-difficulty" className="field" value={manualDifficulty} onChange={(e) => setManualDifficulty(e.target.value as typeof manualDifficulty)}>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="manual-topics" className="field-label">Topics (comma-separated)</label>
                      <input id="manual-topics" type="text" className="field" value={manualTopics} onChange={(e) => setManualTopics(e.target.value)} placeholder="e.g. Array, Hash Table" />
                    </div>
                    <div>
                      <label htmlFor="manual-url" className="field-label">LeetCode URL (optional)</label>
                      <input id="manual-url" type="url" className="field" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://leetcode.com/problems/…" />
                    </div>
                    <div>
                      <label htmlFor="manual-date" className="field-label">Solve date</label>
                      <input id="manual-date" type="date" required className="field" value={manualSolvedAt} onChange={(e) => setManualSolvedAt(e.target.value)} />
                    </div>
                  </div>
                  <div className="settings-actions">
                    <button type="submit" className="button button-secondary" disabled={manualAddMutation.isPending}>
                      {manualAddMutation.isPending ? <RefreshCw aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                      {manualAddMutation.isPending ? 'Saving…' : 'Save Problem'}
                    </button>
                    <button type="button" className="button button-ghost" onClick={() => { setNeedsManualDetails(false); setManualError(null); }}>Cancel</button>
                  </div>
                </div>
              )}
            </form>
            {manualMessage && <Feedback tone="success">{manualMessage}</Feedback>}
            {manualError && !needsManualDetails && <Feedback tone="error">{manualError}</Feedback>}
          </div>
        </section>

        <section className="panel settings-section" aria-labelledby="profile-heading">
          <header>
            <span className="section-icon"><User aria-hidden="true" /></span>
            <div>
              <h2 id="profile-heading" className="panel-heading">Profile Settings</h2>
              <p>Update the name shown on your profile and the leaderboard.</p>
            </div>
          </header>

          <div className="settings-content">
            <form onSubmit={handleProfileSubmit} className="settings-form" aria-busy={profileMutation.isPending}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="profile-name" className="field-label">Full name</label>
                  <input id="profile-name" type="text" required autoComplete="name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <button type="submit" className="button button-secondary" disabled={profileMutation.isPending}>
                  <Save aria-hidden="true" /> {profileMutation.isPending ? 'Saving…' : 'Save Name'}
                </button>
              </div>
            </form>
            {profileSuccess && <Feedback tone="success">Name updated.</Feedback>}
            {profileError && <Feedback tone="error">{profileError}</Feedback>}
          </div>
        </section>

        <section className="panel settings-section" aria-labelledby="locale-heading">
          <header>
            <span className="section-icon"><Globe aria-hidden="true" /></span>
            <div>
              <h2 id="locale-heading" className="panel-heading">Locale &amp; Scheduling</h2>
              <p>Set your timezone and choose when to receive revision reminders.</p>
            </div>
          </header>

          <div className="settings-content">
            <form onSubmit={handleLocaleSubmit} className="settings-form" aria-busy={localeMutation.isPending}>
              <div className="form-grid">
                <div>
                  <label htmlFor="schedule-timezone" className="field-label">Timezone</label>
                  <select id="schedule-timezone" className="field" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-time" className="field-label">Daily revision alert time</label>
                  <div className="relative">
                    <Clock className="field-icon" aria-hidden="true" />
                    <input id="schedule-time" type="text" required className="field field-with-icon" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} placeholder="e.g. 09:00" aria-describedby="schedule-help" aria-invalid={Boolean(localeError)} />
                  </div>
                  <p id="schedule-help" className="field-help">Use 24-hour time in HH:MM format.</p>
                </div>
              </div>
              <div className="settings-actions">
                <button type="submit" className="button button-secondary" disabled={localeMutation.isPending}>
                  <Save aria-hidden="true" /> {localeMutation.isPending ? 'Saving…' : 'Save Locale'}
                </button>
              </div>
            </form>
            {localeSuccess && <Feedback tone="success">Locale settings saved.</Feedback>}
            {localeError && <Feedback tone="error">{localeError}</Feedback>}
          </div>
        </section>
      </div>
    </div>
  );
};
