import { Router } from "express";
import db from "../db.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { emailService } from "../services/emailService.js";
import { getRevisionEmailCandidates } from "../utils/priority.js";

const router = Router();

// In-memory cache to prevent duplicate cron notifications on the same calendar day (YYYY-MM-DD)
const userLastReminderDate = new Map<string, string>();

async function canSendRevisionEmail(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { revisionEmailsPaused: true },
    });
    return user?.revisionEmailsPaused === false;
}

/**
 * Safely converts Date or date-like value to ISO string without throwing
 */
function safeToIsoString(val: any): string {
    if (!val) return new Date().toISOString();
    if (val instanceof Date) return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
    try {
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
        return new Date().toISOString();
    }
}

/**
 * Evaluates whether a user's scheduled alert time matches the current time in their configured timezone.
 * Returns { shouldAlert: boolean, localDateKey: string }
 */
function checkUserAlertTiming(
    user: { timezone: string; reminderTime: string },
    now: Date = new Date(),
): { shouldAlert: boolean; localDateKey: string } {
    const tz = user.timezone || "UTC";
    let localDateKey: string;
    let currentHour: number;
    let currentMinute: number;

    try {
        localDateKey = now.toLocaleDateString("en-CA", { timeZone: tz }); // "YYYY-MM-DD"
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        const parts = formatter.formatToParts(now);
        currentHour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
        currentMinute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    } catch {
        localDateKey = now.toISOString().split("T")[0];
        currentHour = now.getUTCHours();
        currentMinute = now.getUTCMinutes();
    }

    const [targetHourStr, targetMinuteStr] = (user.reminderTime || "09:00").split(":");
    const targetHour = parseInt(targetHourStr, 10) || 0;
    const targetMinute = parseInt(targetMinuteStr, 10) || 0;

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const targetTotalMinutes = targetHour * 60 + targetMinute;

    // Check if the current time falls within a 60-minute delivery window
    // (with a 5-minute pre-buffer to accommodate minor cron clock jitter).
    // Because each user can only receive one digest per local calendar day (localDateKey),
    // the first recurring cron execution that enters this window triggers the email.
    const diff = currentTotalMinutes - targetTotalMinutes;
    const shouldAlert = diff >= -5 && diff < 60;

    return { shouldAlert, localDateKey };
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

            if (user.revisionEmailsPaused) {
                return res.status(409).json({ message: "Resume revision emails before sending a test email." });
            }

            const now = new Date();
            const endOfToday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                23,
                59,
                59,
                999,
            );

            // Find all active problems due today or earlier
            const dueSolvedProblems = await db.solvedProblem.findMany({
                where: {
                    userId,
                    status: "active",
                    nextReviewAt: {
                        lte: endOfToday,
                    },
                },
                include: {
                    problem: true,
                },
                orderBy: {
                    nextReviewAt: "asc",
                },
            });

            const candidates = getRevisionEmailCandidates(
                dueSolvedProblems,
                now,
            );

            // Map to summary structure
            let problemsToSend = candidates.problemsToSend.map((item) => ({
                id: item.id,
                title: item.problem.title,
                titleSlug: item.problem.titleSlug,
                difficulty: item.problem.difficulty,
                url: item.problem.url,
                topics: item.problem.topics,
                currentReviewStage: item.currentReviewStage,
                isStarred: item.isStarred,
            }));

            let backlogToSend = candidates.backlogToSend.map((item) => ({
                id: item.id,
                title: item.problem.title,
                titleSlug: item.problem.titleSlug,
                difficulty: item.problem.difficulty,
                url: item.problem.url,
                topics: item.problem.topics,
                currentReviewStage: item.currentReviewStage,
                isStarred: item.isStarred,
                solvedAt: safeToIsoString(item.solvedAt),
            }));

            let isSimulatedPreview = false;

            // If user has no problems currently due, send a preview sample from their library
            if (problemsToSend.length === 0 && backlogToSend.length === 0) {
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

            if (!(await canSendRevisionEmail(userId))) {
                return res.status(409).json({ message: "Revision email is currently unavailable for this account." });
            }

            const result = await emailService.sendRevisionDigest(
                user.email,
                user.name,
                problemsToSend,
                appUrl,
                candidates.totalDueCount,
                candidates.activeScheduledCount,
                candidates.backlogCount,
                backlogToSend,
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
                count: problemsToSend.length + backlogToSend.length,
                totalDueCount: candidates.totalDueCount,
                activeScheduledCount: candidates.activeScheduledCount,
                backlogCount: candidates.backlogCount,
                backlogSentCount: backlogToSend.length,
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
 *
 * Prioritizes scheduled stage transitions and due revisions while preventing duplicate sends on the same day.
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
        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
        );
        const todayDateKey = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
        const force = req.query.force === "true";

        // Fetch users who have active due problems (with retry in case serverless DB connection is cold)
        const fetchUsersWithDueProblems = () =>
            db.user.findMany({
                where: { revisionEmailsPaused: false },
                include: {
                    solvedProblems: {
                        where: {
                            status: "active",
                            nextReviewAt: {
                                lte: endOfToday,
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

        let usersWithDueProblems;
        try {
            usersWithDueProblems = await fetchUsersWithDueProblems();
        } catch (initialDbError: any) {
            console.warn(
                "Initial DB query failed during reminder trigger (possible serverless cold start), retrying after 2s delay...",
                initialDbError.message,
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
            usersWithDueProblems = await fetchUsersWithDueProblems();
        }

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

            // Check if it is time to send for this user according to their timezone and alert time
            const { shouldAlert, localDateKey } = checkUserAlertTiming(user, now);

            if (!force && !shouldAlert) {
                skippedCount++;
                continue;
            }

            // Prevent duplicate reminder sends on the same calendar day in user's timezone
            if (!force && userLastReminderDate.get(user.id) === localDateKey) {
                skippedCount++;
                continue;
            }

            // Prioritize scheduled revisions due today (Stage 2+, then Stage 1)
            const candidates = getRevisionEmailCandidates(
                user.solvedProblems,
                now,
            );

            // If no active scheduled revisions and no backlog, skip
            if (candidates.problemsToSend.length === 0 && candidates.backlogToSend.length === 0) {
                skippedCount++;
                continue;
            }

            const problemsToSend = candidates.problemsToSend.map((item) => ({
                id: item.id,
                title: item.problem.title,
                titleSlug: item.problem.titleSlug,
                difficulty: item.problem.difficulty,
                url: item.problem.url,
                topics: item.problem.topics,
                currentReviewStage: item.currentReviewStage,
                isStarred: item.isStarred,
            }));

            const backlogToSend = candidates.backlogToSend.map((item) => ({
                id: item.id,
                title: item.problem.title,
                titleSlug: item.problem.titleSlug,
                difficulty: item.problem.difficulty,
                url: item.problem.url,
                topics: item.problem.topics,
                currentReviewStage: item.currentReviewStage,
                isStarred: item.isStarred,
                solvedAt: safeToIsoString(item.solvedAt),
            }));

            // Check again in case the user paused while this run was processing other accounts.
            if (!(await canSendRevisionEmail(user.id))) {
                skippedCount++;
                continue;
            }

            const result = await emailService.sendRevisionDigest(
                user.email,
                user.name,
                problemsToSend,
                appUrl,
                candidates.totalDueCount,
                candidates.activeScheduledCount,
                candidates.backlogCount,
                backlogToSend,
            );

            if (result.success) {
                sentCount++;
                userLastReminderDate.set(user.id, localDateKey);
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
