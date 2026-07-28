import { Router } from 'express';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// FETCH ALL NOTIFICATIONS FOR USER
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // limit to latest 50 notifications
    });
    return res.json({ notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// MARK ALL AS READ
router.post('/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// MARK A SPECIFIC NOTIFICATION AS READ
router.post('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const notification = await db.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE ALL READ NOTIFICATIONS
router.delete('/read-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const result = await db.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return res.json({ message: `Cleared ${result.count} read notification(s)` });
  } catch (error) {
    console.error('Clear read notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE ALL NOTIFICATIONS
router.delete('/clear-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const result = await db.notification.deleteMany({
      where: { userId },
    });
    return res.json({ message: `Cleared all ${result.count} notification(s)` });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE NOTIFICATION BY ID
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const notification = await db.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await db.notification.delete({
      where: { id },
    });

    return res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// TRIGGER DUE REVISIONS CHECK & POPULATE ALERTS
router.post('/check-due', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all active solved problems that are due
    const dueProblems = await db.solvedProblem.findMany({
      where: {
        userId,
        status: 'active',
        nextReviewAt: { lte: now },
      },
      include: {
        problem: true,
      },
    });

    if (dueProblems.length === 0) {
      return res.json({ dueCount: 0, message: 'No pending revisions.' });
    }

    // Check if an unread summary notification already exists (regardless of exact date) or sent today
    const existingDigest = await db.notification.findFirst({
      where: {
        userId,
        title: 'Daily Revision Digest',
        OR: [
          { isRead: false },
          { createdAt: { gte: startOfToday } }
        ]
      },
    });

    let newAlertCreated = false;

    if (!existingDigest && dueProblems.length > 0) {
      const overdueProblems = dueProblems.filter(p => new Date(p.nextReviewAt) < startOfToday);
      
      let bodyText = `You have ${dueProblems.length} LeetCode problem(s) due for revision today.`;
      if (overdueProblems.length > 0) {
        bodyText += ` (${overdueProblems.length} overdue)`;
      }

      await db.notification.create({
        data: {
          userId,
          title: 'Daily Revision Digest',
          body: bodyText,
        },
      });

      newAlertCreated = true;
    }

    // Critical warnings check: avoid creating duplicate unread warnings for the same problem
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const highlyOverdue = dueProblems.filter(p => new Date(p.nextReviewAt) < threeDaysAgo);
    for (const item of highlyOverdue) {
      const existingWarning = await db.notification.findFirst({
        where: {
          userId,
          title: 'Critical Revision Overdue',
          body: { contains: item.problem.title },
          OR: [
            { isRead: false },
            { createdAt: { gte: startOfToday } }
          ]
        },
      });

      if (!existingWarning) {
        await db.notification.create({
          data: {
            userId,
            title: 'Critical Revision Overdue',
            body: `"${item.problem.title}" is overdue by more than 3 days. Revise now to protect your recall!`,
          },
        });
        newAlertCreated = true;
      }
    }

    return res.json({
      dueCount: dueProblems.length,
      newAlertCreated,
    });
  } catch (error) {
    console.error('Check due revisions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
