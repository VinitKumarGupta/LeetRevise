import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Calendar, 
  AlertTriangle, 
  Info,
  Clock
} from 'lucide-react';
import api from '../services/api.js';

export const Notifications: React.FC = () => {
  const queryClient = useQueryClient();

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

  // Mark specific read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-gray-100 mb-1">
            Notifications
          </h1>
          <p className="text-sm text-gray-400">
            Stay on top of due revisions, streak counts, and profile sync alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-border-dark hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-indigo-400" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications Feed */}
      {isLoading ? (
        <div className="flex flex-col gap-3.5 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800/40 rounded-xl"></div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border-border-dark/60 text-center flex flex-col items-center justify-center gap-4">
          <Bell className="w-12 h-12 text-gray-600 opacity-60" />
          <div>
            <h3 className="font-display font-semibold text-lg text-gray-300 mb-1">Inbox is clean</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              We'll notify you when a problem is due, overdue, or when sync actions require your attention.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notif: any) => {
            const isDigest = notif.title === 'Daily Revision Digest';
            const isOverdue = notif.title === 'Critical Revision Overdue';
            
            return (
              <div 
                key={notif.id}
                onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                className={`
                  glass-panel p-4.5 rounded-2xl border-border-dark/50 flex gap-4 items-start transition-all cursor-pointer relative group
                  ${!notif.isRead ? 'bg-indigo-600/5 border-indigo-500/20' : 'opacity-70'}
                `}
              >
                {/* Icon category */}
                <div className={`
                  p-2 rounded-xl border shrink-0
                  ${isOverdue ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : ''}
                  ${isDigest ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : ''}
                  ${!isOverdue && !isDigest ? 'bg-gray-800 border-border-dark text-gray-400' : ''}
                `}>
                  {isOverdue && <AlertTriangle className="w-5 h-5" />}
                  {isDigest && <Clock className="w-5 h-5" />}
                  {!isOverdue && !isDigest && <Info className="w-5 h-5" />}
                </div>

                {/* Body details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-sm text-gray-200">
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-1.5">
                    {notif.body}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent triggering click read
                    deleteMutation.mutate(notif.id);
                  }}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  title="Dismiss notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
