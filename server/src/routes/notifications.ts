import { Router } from "express";
import db from "../db.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { emailService } from "../services/emailService.js";

const router = Router();

/**
 * Randomly picks up to `count` problems (default 2), prioritizing starred problems.
 * If fewer starred problems exist, remaining slots are filled from unstarred problems.
 */
function pickDailyRevisionProblems<T extends { isStarred: boolean }>(
    problems: T[],
    count = 2,
): T[] {
    if (problems.length <= count) {
        return problems;
    }

    const starred = problems.filter((p) => p.isStarred);
    const unstarred = problems.filter((p) => !p.isStarred);

    // Modern Fisher-Yates shuffle
    const shuffle = <U>(arr: U[]): U[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const shuffledStarred = shuffle(starred);
    const shuffledUnstarred = shuffle(unstarred);

    const selected: T[] = [];

    // Priority 1: Pick starred problems
    while (selected.length < count && shuffledStarred.length > 0) {
        selected.push(shuffledStarred.pop()!);
    }

    // Priority 2: Fill remaining slots with unstarred problems
    while (selected.length < count && shuffledUnstarred.length > 0) {
        selected.push(shuffledUnstarred.pop()!);
    }

    return selected;
}

/**
 * POST /api/notifications/test-email
 * Authenticated endpoint: Sends an immediate test revision digest to the logged-in user.
 */
router.post(
    "/test-email",
    authenticateToken,
    async (req: AuthenticatedRequest, res) => {
        try {
            const userId = req.user!.id;

            const user = await db.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const now = new Date();

            // Find all active problems due today or earlier
            const dueSolvedProblems = await db.solvedProblem.findMany({
                where: {
                    userId,
                    status: "active",
                    nextReviewAt: {
                        lte: now,
                    },
                },
                include: {
                    problem: true,
                },
                orderBy: {
                    nextReviewAt: "asc",
                },
            });

            const totalDueCount = dueSolvedProblems.length;
            const selectedDueProblems = pickDailyRevisionProblems(
                dueSolvedProblems,
                2,
            );

            // Map to summary structure
            let problemsToSend = selectedDueProblems.map((item) => ({
                id: item.id,
                title: item.problem.title,
                titleSlug: item.problem.titleSlug,
                difficulty: item.problem.difficulty,
                url: item.problem.url,
                topics: item.problem.topics,
                currentReviewStage: item.currentReviewStage,
                isStarred: item.isStarred,
            }));

            let isSimulatedPreview = false;

            // If user has no problems currently due, send a preview sample from their library
            if (problemsToSend.length === 0) {
                const sampleProblems = await db.solvedProblem.findMany({
                    where: { userId },
                    include: { problem: true },
                    take: 2,
                });

                if (sampleProblems.length > 0) {
                    problemsToSend = sampleProblems.map((item) => ({
                        id: item.id,
                        title: `${item.problem.title} (Test Preview)`,
                        titleSlug: item.problem.titleSlug,
                        difficulty: item.problem.difficulty,
                        url: item.problem.url,
                        topics: item.problem.topics,
                        currentReviewStage: item.currentReviewStage,
                        isStarred: item.isStarred,
                    }));
                    isSimulatedPreview = true;
                } else {
                    problemsToSend = [
                        {
                            id: "sample-1",
                            title: "Two Sum (Test Preview)",
                            titleSlug: "two-sum",
                            difficulty: "Easy",
                            url: "https://leetcode.com/problems/two-sum/",
                            topics: "Array,Hash Table",
                            currentReviewStage: 0,
                            isStarred: true,
                        },
                    ];
                    isSimulatedPreview = true;
                }
            }

            const appUrl =
                process.env.APP_URL ||
                (req.headers.origin as string) ||
                "http://localhost:5173";

            const result = await emailService.sendRevisionDigest(
                user.email,
                user.name,
                problemsToSend,
                appUrl,
                totalDueCount,
            );

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    message: result.error || "Failed to send email via Brevo",
                });
            }

            return res.json({
                success: true,
                message: `Test revision email sent to ${user.email}`,
                emailId: result.id,
                count: problemsToSend.length,
                isSimulatedPreview,
            });
        } catch (error: any) {
            console.error("Error sending test revision email:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Internal server error",
            });
        }
    },
);

/**
 * ALL /api/notifications/send-due-reminders
 * Cron endpoint for cron-job.org to scan and send revision emails to users with problems due today.
 * Supports both GET and POST, and accepts secret via header (x-cron-secret, Bearer) or query param (?secret=...).
 * Protected by optional CRON_SECRET.
 */
router.all("/send-due-reminders", async (req, res) => {
    try {
        const cronSecret = process.env.CRON_SECRET?.replace(/^["']|["']$/g, "").trim();
        if (cronSecret && cronSecret.length > 0) {
            const authHeader = req.headers.authorization;
            const customHeader = req.headers["x-cron-secret"];
            const querySecret = req.query.secret as string | undefined;
            const isAuthorized =
                customHeader === cronSecret ||
                authHeader === `Bearer ${cronSecret}` ||
                querySecret === cronSecret;

            if (!isAuthorized) {
                return res
                    .status(401)
                    .json({ message: "Unauthorized cron trigger." });
            }
        }

        const now = new Date();

        // Fetch users who have active due problems
        const usersWithDueProblems = await db.user.findMany({
            include: {
                solvedProblems: {
                    where: {
                        status: "active",
                        nextReviewAt: {
                            lte: now,
                        },
                    },
                    include: {
                        problem: true,
                    },
                    orderBy: {
                        nextReviewAt: "asc",
                    },
                },
            },
        });

        const appUrl =
            process.env.APP_URL || "https://leetcode-revision-tracker.vercel.app";

        let sentCount = 0;
        let skippedCount = 0;
        const errors: Array<{ email: string; error: string }> = [];

        for (const user of usersWithDueProblems) {
            if (user.solvedProblems.length === 0) {
                skippedCount++;
                continue;
            }

            const totalDueCount = user.solvedProblems.length;

            // Pick 2 random problems, prioritizing starred ones
            const selectedProblems = pickDailyRevisionProblems(
                user.solvedProblems,
                2,
            );

            const problemsToSend = selectedProblems.map((item) => ({
                id: item.id,
                title: item.problem.title,
                titleSlug: item.problem.titleSlug,
                difficulty: item.problem.difficulty,
                url: item.problem.url,
                topics: item.problem.topics,
                currentReviewStage: item.currentReviewStage,
                isStarred: item.isStarred,
            }));

            const result = await emailService.sendRevisionDigest(
                user.email,
                user.name,
                problemsToSend,
                appUrl,
                totalDueCount,
            );

            if (result.success) {
                sentCount++;
            } else {
                errors.push({
                    email: user.email,
                    error: result.error || "Unknown error",
                });
            }
        }

        return res.json({
            success: true,
            totalUsersChecked: usersWithDueProblems.length,
            sentCount,
            skippedCount,
            errors,
        });
    } catch (error: any) {
        console.error("Cron notification error:", error);
        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Internal server error during reminder trigger",
        });
    }
});

export default router;
