import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Globe, 
  User, 
  Clock, 
  Save, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import api from '../services/api.js';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, updateProfile } = useAuth();

  // Local state initialized from Context User details
  const [name, setName] = useState(user?.name || '');
  const [leetcodeUsername, setLeetcodeUsername] = useState(user?.leetcodeUsername || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [notificationEnabled, setNotificationEnabled] = useState(user?.notificationEnabled ?? true);
  const [reminderTime, setReminderTime] = useState(user?.reminderTime || '09:00');
  
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Timezones helper list
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

  // Update profile mutation
  const profileMutation = useMutation({
    mutationFn: async (payload: any) => {
      setSuccessMsg(false);
      setErrorMsg(null);
      await updateProfile(payload);
    },
    onSuccess: () => {
      setSuccessMsg(true);
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setTimeout(() => setSuccessMsg(false), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to save settings.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Time regex check
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reminderTime)) {
      setErrorMsg('Reminder time must be in HH:MM format (24h).');
      return;
    }

    profileMutation.mutate({
      name: name.trim(),
      leetcodeUsername: leetcodeUsername.trim() || null,
      timezone,
      notificationEnabled,
      reminderTime,
    });
  };

  // Browser push notification permissions tester
  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('Browser notification permission GRANTED!');
      } else {
        alert('Permission was denied or ignored.');
      }
    } catch (err) {
      console.error('Error requesting notification permissions:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-100 mb-1">
          Settings & Preferences
        </h1>
        <p className="text-sm text-gray-400">
          Manage your account profile, spacing repetitions scheduler timezone, and alert notification channels
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Status Banners */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>Preferences saved successfully!</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* User Profile Details */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <User className="w-5 h-5 text-indigo-400" />
              <span>Profile Settings</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="bg-gray-900/60 border border-border-dark/60 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Linked LeetCode Username
                </label>
                <input
                  type="text"
                  value={leetcodeUsername}
                  onChange={(e) => setLeetcodeUsername(e.target.value)}
                  placeholder="LeetCode username"
                  className="bg-gray-900/60 border border-border-dark/60 rounded-xl px-4 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Local timezone & schedules */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Globe className="w-5 h-5 text-indigo-400" />
              <span>Locale & Scheduling</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Timezone
                </label>
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
                  <span title="We check for due revisions and create warnings at this time daily" className="text-gray-600 hover:text-gray-400 cursor-help">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    placeholder="e.g. 09:00"
                    className="w-full bg-gray-900/60 border border-border-dark/60 rounded-xl py-2.5 pl-11 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Channels */}
          <div className="glass-panel p-6 rounded-2xl border-border-dark/60 shadow-xl flex flex-col gap-4">
            <h2 className="font-display font-bold text-lg text-gray-200 flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Bell className="w-5 h-5 text-indigo-400" />
              <span>Notifications Preferences</span>
            </h2>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/30 border border-border-dark/30">
              <div className="flex flex-col min-w-0 pr-4">
                <span className="text-xs font-bold text-gray-200 mb-0.5">Enable In-App Digest alerts</span>
                <span className="text-[11px] text-gray-500 leading-normal">
                  Send a compiled digest notification when revisions become due.
                </span>
              </div>
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-border-dark/60 bg-gray-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-bg-dark"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/30 border border-border-dark/30">
              <div className="flex flex-col min-w-0 pr-4">
                <span className="text-xs font-bold text-gray-200 mb-0.5">Browser Push Notification permissions</span>
                <span className="text-[11px] text-gray-500 leading-normal">
                  Grant permission to receive system tray notifications from LeetRevise.
                </span>
              </div>
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 font-semibold rounded-xl text-[11px] transition-colors border border-border-dark shrink-0"
              >
                Request Permission
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {profileMutation.isPending ? 'Saving configuration...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};
