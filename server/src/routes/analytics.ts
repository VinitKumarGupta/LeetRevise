import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Fetch user's solved problems
    const solvedProblems = await db.solvedProblem.findMany({
      where: { userId },
      include: {
        problem: true,
        history: true,
      },
    });

    const totalSolved = solvedProblems.length;

    // 2. Count by due states
    let dueCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let pausedCount = 0;

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const item of solvedProblems) {
      // Difficulty distribution
      if (item.problem.difficulty === 'Easy') easySolved++;
      else if (item.problem.difficulty === 'Medium') mediumSolved++;
      else if (item.problem.difficulty === 'Hard') hardSolved++;

      // Status distribution
      if (item.status === 'completed') {
        completedCount++;
      } else if (item.status === 'paused') {
        pausedCount++;
      } else {
        const nextReview = new Date(item.nextReviewAt);
        if (nextReview < startOfToday) {
          overdueCount++;
          dueCount++; // overdue is also due
        } else if (nextReview <= now) {
          dueCount++;
        } else {
          upcomingCount++;
        }
      }
    }

    // 3. Latest sync status
    const lastSync = await db.syncLog.findFirst({
      where: { userId },
      orderBy: { syncedAt: 'desc' },
    });

    // 4. Calculate Streaks (Revision Streak)
    // Get all review dates (excluding skips)
    const reviews = await db.reviewHistory.findMany({
      where: {
        solvedProblem: { userId },
        result: { in: ['easy', 'effort', 'forgot'] },
      },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: 'desc' },
    });

    // Extract unique dates in YYYY-MM-DD
    const reviewDates = Array.from(
      new Set(
        reviews.map((r) => {
          const d = new Date(r.reviewedAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')}`;
        })
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending order

    let currentStreak = 0;
    let maxStreak = 0;

    if (reviewDates.length > 0) {
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(yesterday.getDate()).padStart(2, '0')}`;

      // Check if user has reviewed today or yesterday to maintain the streak
      if (reviewDates[0] === todayStr || reviewDates[0] === yesterdayStr) {
        currentStreak = 1;
        let tempStreak = 1;
        let prevDate = new Date(reviewDates[0]);

        for (let i = 1; i < reviewDates.length; i++) {
          const currDate = new Date(reviewDates[i]);
          const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
            currentStreak = tempStreak;
          } else if (diffDays > 1) {
            break;
          }
          prevDate = currDate;
        }
      }

      // Calculate max streak
      let tempMax = 1;
      let prevDate = new Date(reviewDates[0]);
      maxStreak = 1;

      for (let i = 1; i < reviewDates.length; i++) {
        const currDate = new Date(reviewDates[i]);
        const diffTime = Math.abs(prevDate.getTime() - currDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempMax++;
        } else if (diffDays > 1) {
          if (tempMax > maxStreak) maxStreak = tempMax;
          tempMax = 1;
        }
        prevDate = currDate;
      }
      if (tempMax > maxStreak) maxStreak = tempMax;
    }

    // 5. Completion rate (successful reviews vs total reviews)
    let totalReviewsLogged = 0;
    let forgottenReviews = 0;

    solvedProblems.forEach((p) => {
      p.history.forEach((h) => {
        if (h.result !== 'skipped') {
          totalReviewsLogged++;
          if (h.result === 'forgot') {
            forgottenReviews++;
          }
        }
      });
    });

    const completionRate = totalReviewsLogged > 0 
      ? Math.round(((totalReviewsLogged - forgottenReviews) / totalReviewsLogged) * 100) 
      : 100;

    // 6. Topics and their failure rates
    const topicStats: Record<string, { total: number; forgot: number }> = {};
    solvedProblems.forEach((p) => {
      const topicsList = p.problem.topics.split(',').map((t) => t.trim());
      topicsList.forEach((topic) => {
        if (!topicStats[topic]) {
          topicStats[topic] = { total: 0, forgot: 0 };
        }
        p.history.forEach((h) => {
          if (h.result !== 'skipped') {
            topicStats[topic].total++;
            if (h.result === 'forgot') {
              topicStats[topic].forgot++;
            }
          }
        });
      });
    });

    const mostForgottenTopics = Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        forgotCount: stats.forgot,
        totalCount: stats.total,
        forgotRate: stats.total > 0 ? Math.round((stats.forgot / stats.total) * 100) : 0,
      }))
      .filter((t) => t.forgotCount > 0)
      .sort((a, b) => b.forgotRate - a.forgotRate)
      .slice(0, 5); // Top 5 forgotten topics

    // 7. Solved Problems per week (last 6 weeks)
    const solvedPerWeek: { weekStart: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      // Get start of week (Sunday or Monday)
      const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
      const weekStartStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      
      const count = solvedProblems.filter((p) => {
        const solvedDate = new Date(p.solvedAt);
        const nextWeek = new Date(weekStart);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return solvedDate >= weekStart && solvedDate < nextWeek;
      }).length;

      solvedPerWeek.push({ weekStart: weekStartStr, count });
    }

    // 8. Latest Solved Problems (last 5)
    const latestProblems = [...solvedProblems]
      .sort((a, b) => new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime())
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.problem.title,
        difficulty: item.problem.difficulty,
        solvedAt: item.solvedAt,
      }));

    return res.json({
      summary: {
        totalSolved,
        dueCount,
        overdueCount,
        upcomingCount,
        completedCount,
        pausedCount,
        streak: currentStreak,
        maxStreak,
        completionRate,
      },
      difficulty: {
        easy: easySolved,
        medium: mediumSolved,
        hard: hardSolved,
      },
      lastSync: lastSync
        ? {
            syncedAt: lastSync.syncedAt,
            success: lastSync.success,
            newProblemsCount: lastSync.newProblemsCount,
            duplicatesSkippedCount: lastSync.duplicatesSkippedCount,
          }
        : null,
      solvedPerWeek,
      mostForgottenTopics,
      latestProblems,
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
