import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { syncUserSubmissions } from '../services/syncService.js';
import { calculateNextReview } from '../utils/scheduler.js';

const router = Router();

// Validate manual entry details if LeetCode GraphQL fetch fails or is skipped
const manualAddSchema = z.object({
  titleSlug: z.string().min(1, 'Title slug or URL is required'),
  title: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  topics: z.string().optional(),
  url: z.string().optional(),
  solvedAt: z.string().datetime().optional(),
});

// Trigger LeetCode account sync
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user?.id },
      select: { leetcodeUsername: true },
    });

    if (!user || !user.leetcodeUsername) {
      return res.status(400).json({
        message: 'No LeetCode username connected. Please connect one in settings first.',
      });
    }

    const result = await syncUserSubmissions(req.user!.id, user.leetcodeUsername);
    return res.json({
      message: 'Sync completed successfully.',
      ...result,
    });
  } catch (error: any) {
    console.error('Sync trigger error:', error);
    return res.status(500).json({
      message: error.message || 'Synchronization failed.',
    });
  }
});

// Fetch sync log history
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await db.syncLog.findMany({
      where: { userId: req.user?.id },
      orderBy: { syncedAt: 'desc' },
      take: 20, // return last 20 syncs
    });
    return res.json({ logs });
  } catch (error) {
    console.error('Fetch sync history error:', error);
    return res.status(500).json({ message: 'Failed to fetch sync history' });
  }
});

// Manually add a solved problem (e.g. slug search, or manual inputs on failure)
router.post('/manual', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const body = manualAddSchema.parse(req.body);
    const userId = req.user!.id;

    // Clean up titleSlug in case a full URL was provided
    let slug = body.titleSlug.trim();
    if (slug.includes('leetcode.com/problems/')) {
      const parts = slug.split('leetcode.com/problems/');
      slug = parts[1].split('/')[0];
    }
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    // Check if the user already solved it
    const existingSolved = await db.solvedProblem.findFirst({
      where: {
        userId,
        problem: { titleSlug: slug },
      },
    });

    if (existingSolved) {
      return res.status(400).json({ message: 'This problem is already in your revision queue.' });
    }

    // Check if problem already exists globally
    let problem = await db.problem.findUnique({
      where: { titleSlug: slug },
    });

    const solvedAt = body.solvedAt ? new Date(body.solvedAt) : new Date();

    if (!problem) {
      // If we have custom fields provided by manual fallback form, create it
      if (body.title && body.difficulty) {
        problem = await db.problem.create({
          data: {
            leetcodeProblemId: `manual-${Date.now()}`,
            title: body.title,
            titleSlug: slug,
            difficulty: body.difficulty,
            url: body.url || `https://leetcode.com/problems/${slug}/`,
            topics: body.topics || 'General',
          },
        });
      } else {
        // Otherwise, attempt to fetch details from LeetCode GraphQL using syncService queries (indirectly)
        try {
          // Dynamic import or direct call to GraphQL
          const fetchResponse = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
              query: `
                query questionData($titleSlug: String!) {
                  question(titleSlug: $titleSlug) {
                    questionId
                    title
                    difficulty
                    topicTags { name }
                  }
                }
              `,
              variables: { titleSlug: slug },
            }),
          });

          if (!fetchResponse.ok) throw new Error('Fetch failed');
          const resJson = await fetchResponse.json() as any;
          if (resJson.errors || !resJson.data?.question) {
            return res.status(404).json({
              message: 'Problem not found on LeetCode. Please enter details manually.',
              needsManualDetails: true,
              slug,
            });
          }

          const q = resJson.data.question;
          problem = await db.problem.create({
            data: {
              leetcodeProblemId: q.questionId,
              title: q.title,
              titleSlug: slug,
              difficulty: q.difficulty,
              url: `https://leetcode.com/problems/${slug}/`,
              topics: q.topicTags.map((t: any) => t.name).join(', ') || 'General',
            },
          });
        } catch (error) {
          return res.status(400).json({
            message: 'Could not connect to LeetCode. Please fill in details manually.',
            needsManualDetails: true,
            slug,
          });
        }
      }
    }

    // Schedule next review (Stage 0, 1 day interval)
    const { nextReviewAt } = calculateNextReview(0, 'easy', solvedAt);

    const solvedProblem = await db.solvedProblem.create({
      data: {
        userId,
        problemId: problem.id,
        solvedAt,
        currentReviewStage: 0,
        nextReviewAt,
        status: 'active',
      },
      include: {
        problem: true,
      },
    });

    return res.status(201).json({
      message: 'Problem successfully added to queue.',
      solvedProblem,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Manual add error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
