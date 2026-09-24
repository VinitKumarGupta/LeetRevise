import { Router, Response } from 'express';
import db from '../db.js';
import { authenticateTokenOptional, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

export interface LeaderboardUser {
  id: string;
  name: string;
  username: string;
  initials: string;
  score: number;
  solvedCount: number;
  streak: number;
  reviewCount: number;
  completedCount: number;
  rank: number;
  isCurrentUser: boolean;
}

// Points Logic:
// 1. Solved Problem: 10 points
// 2. Mastered / Completed Problem (all review stages): 20 bonus points
// 3. Spaced Review Logged: 5 points
// 4. Active Streak Day: 10 points
export function calculateUserScore(
  solvedCount: number,
  completedCount: number,
  reviewCount: number,
  streakDays: number
): number {
  return (solvedCount * 10) + (completedCount * 20) + (reviewCount * 5) + (streakDays * 10);
}

// Extract initials from name
function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Compute active streak from review & solve activity dates
function calculateStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const now = new Date();
  const dateStrings = Array.from(
    new Set(
      dates.map((d) => {
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      })
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (dateStrings.length === 0) return 0;

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStrings[0] !== todayStr && dateStrings[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let prevDate = new Date(dateStrings[0]);

  for (let i = 1; i < dateStrings.length; i++) {
    const currDate = new Date(dateStrings[i]);
    const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      break;
    }
    prevDate = currDate;
  }

  return streak;
}

// GET /api/leaderboard - Real database users only
router.get('/', authenticateTokenOptional, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as string) || 'all-time';
    const sortBy = (req.query.sortBy as string) || 'score';
    const currentUserId = req.user?.id;

    let filterDate: Date | null = null;
    if (timeframe === 'week') {
      filterDate = new Date();
      filterDate.setDate(filterDate.getDate() - 7);
    } else if (timeframe === 'month') {
      filterDate = new Date();
      filterDate.setDate(filterDate.getDate() - 30);
    }

    // Query real users from database
    const dbUsers = await db.user.findMany({
      select: {
        id: true,
        name: true,
        leetcodeUsername: true,
        createdAt: true,
        solvedProblems: {
          select: {
            id: true,
            status: true,
            currentReviewStage: true,
            solvedAt: true,
            history: {
              select: {
                id: true,
                reviewedAt: true,
                result: true,
              },
            },
          },
        },
      },
    });

    const entries = dbUsers.map((user) => {
      // Filter solved problems by timeframe if requested
      const userSolved = filterDate
        ? user.solvedProblems.filter((p) => new Date(p.solvedAt) >= filterDate!)
        : user.solvedProblems;

      const allReviews = user.solvedProblems.flatMap((p) => p.history);
      const timeframeReviews = filterDate
        ? allReviews.filter((r) => new Date(r.reviewedAt) >= filterDate!)
        : allReviews;

      // Activity dates for streak
      const activityDates: Date[] = [];
      allReviews.forEach((r) => activityDates.push(new Date(r.reviewedAt)));
      user.solvedProblems.forEach((p) => activityDates.push(new Date(p.solvedAt)));
      const streak = calculateStreak(activityDates);

      const solvedCount = userSolved.length;
      const completedCount = userSolved.filter(
        (p) => p.status === 'completed' || p.currentReviewStage >= 5
      ).length;
      const reviewCount = timeframeReviews.filter((r) => r.result !== 'skipped').length;

      // Transparent scoring formula
      const score = calculateUserScore(solvedCount, completedCount, reviewCount, streak);

      return {
        id: user.id,
        name: user.name,
        username: user.leetcodeUsername || user.name.toLowerCase().replace(/\s+/g, '_'),
        initials: getInitials(user.name),
        score,
        solvedCount,
        streak,
        reviewCount,
        completedCount,
        rank: 0,
        isCurrentUser: currentUserId === user.id,
      };
    });

    // Sort entries based on requested criteria
    entries.sort((a, b) => {
      if (sortBy === 'solved') {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        return b.score - a.score;
      }
      if (sortBy === 'streak') {
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.score - a.score;
      }
      // default: score
      if (b.score !== a.score) return b.score - a.score;
      return b.solvedCount - a.solvedCount;
    });

    // Assign sequential ranks (1, 2, 3...)
    const rankedEntries = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return res.json({
      entries: rankedEntries,
      scoringModel: {
        solvedProblem: 10,
        completedProblem: 20,
        reviewLogged: 5,
        streakDay: 10,
        description: 'Score = (Solved × 10) + (Completed × 20) + (Reviews × 5) + (Streak × 10)',
      },
    });
  } catch (error: any) {
    console.error('Fetch leaderboard error:', error);
    return res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

export default router;
