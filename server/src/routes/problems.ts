import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { calculateNextReview } from '../utils/scheduler.js';

const router = Router();

const reviewSchema = z.object({
  result: z.enum(['easy', 'effort', 'forgot', 'skipped']),
  notes: z.string().optional(),
});

const updateNotesSchema = z.object({
  notes: z.string(),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'completed']),
});

// GET ALL USER PROBLEMS (with search, filter, sorting)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { search, difficulty, status, sortBy } = req.query;

    // Build Prisma query clauses
    const whereClause: any = {
      userId,
    };

    // Filter by difficulty
    if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty as string)) {
      whereClause.problem = {
        ...whereClause.problem,
        difficulty: difficulty as string,
      };
    }

    // Filter by search query (title, topic)
    if (search && (search as string).trim() !== '') {
      const searchStr = (search as string).trim();
      whereClause.problem = {
        ...whereClause.problem,
        OR: [
          { title: { contains: searchStr } },
          { topics: { contains: searchStr } },
        ],
      };
    }

    // Fetch all user solved problems first to filter dynamically by status (since SQLite doesn't let us easily query complex date math logic directly in SQL without raw queries)
    let solvedProblems = await db.solvedProblem.findMany({
      where: whereClause,
      include: {
        problem: true,
      },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Map status/due criteria
    // status: due, overdue, upcoming, completed, paused
    if (status) {
      solvedProblems = solvedProblems.filter((item) => {
        if (status === 'completed') return item.status === 'completed';
        if (status === 'paused') return item.status === 'paused';
        if (item.status !== 'active') return false; // for active states

        const nextReview = new Date(item.nextReviewAt);
        if (status === 'due') {
          return nextReview <= now;
        }
        if (status === 'overdue') {
          return nextReview < startOfToday;
        }
        if (status === 'upcoming') {
          return nextReview > now;
        }
        return true;
      });
    }

    // Differentiate due/overdue status for UI metadata
    const items = solvedProblems.map((item) => {
      const nextReview = new Date(item.nextReviewAt);
      let itemDueStatus: 'due' | 'overdue' | 'upcoming' | 'completed' | 'paused' = 'upcoming';

      if (item.status === 'completed') itemDueStatus = 'completed';
      else if (item.status === 'paused') itemDueStatus = 'paused';
      else if (nextReview < startOfToday) itemDueStatus = 'overdue';
      else if (nextReview <= now) itemDueStatus = 'due';

      return {
        ...item,
        dueStatus: itemDueStatus,
      };
    });

    // Sorting
    // sortBy: due_asc, due_desc, diff_asc, diff_desc, date_asc, date_desc
    if (sortBy) {
      items.sort((a, b) => {
        if (sortBy === 'due_asc') {
          return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
        }
        if (sortBy === 'due_desc') {
          return new Date(b.nextReviewAt).getTime() - new Date(a.nextReviewAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.solvedAt).getTime() - new Date(b.solvedAt).getTime();
        }
        if (sortBy === 'date_desc') {
          return new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime();
        }
        if (sortBy === 'diff_asc' || sortBy === 'diff_desc') {
          const diffWeight = { Easy: 1, Medium: 2, Hard: 3 };
          const weightA = diffWeight[a.problem.difficulty as 'Easy' | 'Medium' | 'Hard'] || 0;
          const weightB = diffWeight[b.problem.difficulty as 'Easy' | 'Medium' | 'Hard'] || 0;
          return sortBy === 'diff_asc' ? weightA - weightB : weightB - weightA;
        }
        return 0;
      });
    } else {
      // Default sort: overdue/due first, then by nextReviewAt asc
      items.sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
    }

    return res.json({ problems: items });
  } catch (error) {
    console.error('Fetch solved problems error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET SINGLE PROBLEM DETAILS
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const solvedProblem = await db.solvedProblem.findFirst({
      where: { id, userId },
      include: {
        problem: true,
        history: {
          orderBy: { reviewedAt: 'desc' },
        },
      },
    });

    if (!solvedProblem) {
      return res.status(404).json({ message: 'Problem tracking record not found' });
    }

    // Get current due status
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextReview = new Date(solvedProblem.nextReviewAt);
    let dueStatus: 'due' | 'overdue' | 'upcoming' | 'completed' | 'paused' = 'upcoming';

    if (solvedProblem.status === 'completed') dueStatus = 'completed';
    else if (solvedProblem.status === 'paused') dueStatus = 'paused';
    else if (nextReview < startOfToday) dueStatus = 'overdue';
    else if (nextReview <= now) dueStatus = 'due';

    return res.json({
      problem: {
        ...solvedProblem,
        dueStatus,
      },
    });
  } catch (error) {
    console.error('Fetch problem detail error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// LOG A PROBLEM REVIEW (SUBMIT OUTCOME)
router.post('/:id/review', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { result, notes } = reviewSchema.parse(req.body);

    const solvedProblem = await db.solvedProblem.findFirst({
      where: { id, userId },
    });

    if (!solvedProblem) {
      return res.status(404).json({ message: 'Problem tracking record not found' });
    }

    const currentStage = solvedProblem.currentReviewStage;
    const next = calculateNextReview(currentStage, result, new Date());

    // Update the solved problem record
    const updated = await db.solvedProblem.update({
      where: { id },
      data: {
        currentReviewStage: next.nextStage,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: new Date(),
        reviewCount: { increment: 1 },
        // Automatically set status to active if they were paused
        status: solvedProblem.status === 'paused' ? 'active' : solvedProblem.status,
      },
    });

    // Create review history entry
    const historyEntry = await db.reviewHistory.create({
      data: {
        solvedProblemId: id,
        result,
        notes,
      },
    });

    // Create in-app notification when they complete a review
    await db.notification.create({
      data: {
        userId,
        title: 'Review Logged',
        body: `Log registered for "${result}" review. Next scheduled review: ${next.nextReviewAt.toLocaleDateString()}.`,
      },
    });

    return res.json({
      message: 'Review logged successfully',
      solvedProblem: updated,
      historyEntry,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Review logging error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// UPDATE PERSONAL NOTES FOR A PROBLEM
router.patch('/:id/notes', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { notes } = updateNotesSchema.parse(req.body);

    const solvedProblem = await db.solvedProblem.findFirst({
      where: { id, userId },
    });

    if (!solvedProblem) {
      return res.status(404).json({ message: 'Problem tracking record not found' });
    }

    // Notes are saved directly in the history or on a per-review level. 
    // To support a persistent general note for the SolvedProblem itself, let's save it by creating or updating the latest review history note, or let's support general problem notes. 
    // Wait, in our schema, notes is on ReviewHistory. 
    // If the user wants to update the notes on the problem, we can find the latest ReviewHistory entry and update it, OR create a dummy review history entry of type "skipped/notes" to hold it, or update the solved problem's latest note.
    // Wait! Let's check: the schema defines `notes` in `ReviewHistory`. Let's write the note updating logic:
    // If there is an existing history entry, we can edit its notes, or create an entry if none exists.
    // To keep it simple, let's find the latest review history entry. If it exists, update it. If not, create a placeholder history entry.
    const latestHistory = await db.reviewHistory.findFirst({
      where: { solvedProblemId: id },
      orderBy: { reviewedAt: 'desc' },
    });

    if (latestHistory) {
      await db.reviewHistory.update({
        where: { id: latestHistory.id },
        data: { notes },
      });
    } else {
      await db.reviewHistory.create({
        data: {
          solvedProblemId: id,
          result: 'skipped',
          notes: notes || '',
        },
      });
    }

    return res.json({ message: 'Notes updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Notes update error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// UPDATE STATE STATUS (ACTIVE, PAUSED, COMPLETED)
router.patch('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { status } = updateStatusSchema.parse(req.body);

    const solvedProblem = await db.solvedProblem.findFirst({
      where: { id, userId },
    });

    if (!solvedProblem) {
      return res.status(404).json({ message: 'Problem tracking record not found' });
    }

    const updated = await db.solvedProblem.update({
      where: { id },
      data: { status },
    });

    return res.json({
      message: `Problem status set to ${status}`,
      solvedProblem: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Status update error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE SOLVED PROBLEM FROM TRACKING
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const solvedProblem = await db.solvedProblem.findFirst({
      where: { id, userId },
    });

    if (!solvedProblem) {
      return res.status(404).json({ message: 'Problem tracking record not found' });
    }

    await db.solvedProblem.delete({
      where: { id },
    });

    return res.json({ message: 'Problem tracking removed successfully' });
  } catch (error) {
    console.error('Delete problem error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
