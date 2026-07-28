import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  AlertTriangle, 
  Info,
  Clock,
  Sparkles,
  CheckCircle2,
  Filter
} from 'lucide-react';
import api from '../services/api.js';

export const Notifications: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Clear read notifications mutation
  const clearReadMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/clear-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark specific read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete specific notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const allNotifications = notificationsData?.notifications || [];
  const unreadCount = allNotifications.filter((n: any) => !n.isRead).length;
  const readCount = allNotifications.filter((n: any) => n.isRead).length;

  const filteredNotifications = allNotifications.filter((n: any) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-gray-100 mb-1">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Track revision digests, streak alerts, and system notifications
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
              title="Mark all unread notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          {readCount > 0 && (
            <button
              onClick={() => clearReadMutation.mutate()}
              disabled={clearReadMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 border border-border-dark/80 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold transition-all active:scale-95"
              title="Clear all read notifications"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Clear read</span>
            </button>
          )}

          {allNotifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all notifications?')) {
                  clearAllMutation.mutate();
                }
              }}
              disabled={clearAllMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition-all active:scale-95"
              title="Clear all notifications in inbox"
            >
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-gray-900/60 p-1.5 rounded-2xl border border-border-dark/60">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`
              flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
              ${filter === 'all' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}
            `}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/10">{allNotifications.length}</span>
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`
              flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
              ${filter === 'unread' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}
            `}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-400 text-bg-dark font-extrabold">{unreadCount}</span>
            )}
          </button>

          <button
            onClick={() => setFilter('read')}
            className={`
              flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5
              ${filter === 'read' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}
            `}
          >
            <span>Read</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/10">{readCount}</span>
          </button>
        </div>
      </div>

      {/* Notifications Feed */}
      {isLoading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-800/40 rounded-2xl"></div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel p-10 sm:p-16 rounded-3xl border-border-dark/60 text-center flex flex-col items-center justify-center gap-4">
          <div className="bg-indigo-600/10 p-4 rounded-2xl text-indigo-400 border border-indigo-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-gray-200 mb-1">
              {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'Notification inbox is clean'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
              We'll alert you when a problem is due for spaced repetition or when your sync status updates.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotifications.map((notif: any) => {
            const isDigest = notif.title === 'Daily Revision Digest';
            const isOverdue = notif.title === 'Critical Revision Overdue';
            
            return (
              <div 
                key={notif.id}
                onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                className={`
                  glass-panel p-4 sm:p-5 rounded-2xl border-border-dark/50 flex gap-3.5 items-start transition-all relative group
                  ${!notif.isRead 
                    ? 'bg-indigo-600/10 border-indigo-500/30 shadow-md shadow-indigo-600/5' 
                    : 'opacity-75 hover:opacity-100'}
                `}
              >
                {/* Icon category */}
                <div className={`
                  p-2.5 rounded-xl border shrink-0 mt-0.5
                  ${isOverdue ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : ''}
                  ${isDigest ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : ''}
                  ${!isOverdue && !isDigest ? 'bg-gray-800 border-border-dark text-indigo-400' : ''}
                `}>
                  {isOverdue && <AlertTriangle className="w-5 h-5" />}
                  {isDigest && <Clock className="w-5 h-5" />}
                  {!isOverdue && !isDigest && <Info className="w-5 h-5" />}
                </div>

                {/* Body details */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-display font-bold text-sm text-gray-100">
                      {notif.title}
                    </span>
                    {!notif.isRead ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500 text-white">
                        NEW
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-medium">
                        Read
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed mb-2">
                    {notif.body}
                  </p>

                  <span className="text-[11px] text-gray-500 font-mono">
                    {new Date(notif.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(notif.id);
                      }}
                      className="p-2 rounded-xl text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notif.id);
                    }}
                    className="p-2 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

