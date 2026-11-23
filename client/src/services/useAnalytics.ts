import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.js';
import api from './api.js';

interface AnalyticsData {
  summary: {
    streak: number;
    maxStreak: number;
    completionRate: number;
    completedCount: number;
    totalSolved: number;
    dueCount: number;
    todaySolvedCount: number;
    todayRevisedCount: number;
  };
  difficulty: { easy: number; medium: number; hard: number };
  lastSync: { success: boolean; syncedAt: string; newProblemsCount: number } | null;
  solvedPerWeek: { weekStart: string; weekRange: string; count: number }[];
  latestProblems: { id: string; title: string; difficulty: string; solvedAt: string }[];
  mostForgottenTopics: { topic: string; forgotRate: number; forgotCount: number; totalCount: number }[];
}

export function useAnalytics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['analytics', user?.id, user?.timezone],
    queryFn: async ({ signal }) => (await api.get<AnalyticsData>('/analytics', { signal })).data,
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });
}
