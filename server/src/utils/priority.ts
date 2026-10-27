export interface PrioritizableProblem {
    id: string;
    nextReviewAt: Date | string;
    currentReviewStage: number;
    reviewCount?: number;
    lastReviewedAt?: Date | string | null;
    solvedAt: Date | string;
    isStarred: boolean;
    status: string;
    [key: string]: any;
}

export interface ClassifiedProblem<T extends PrioritizableProblem> {
    item: T;
    rank: number;
    isDueToday: boolean;
    isOverdue: boolean;
    isScheduledRevision: boolean;
    isRecentlySolved: boolean;
    daysSinceSolved: number;
}

/**
 * Classifies a problem into a priority tier based on spaced-repetition status:
 *
 * Rank 1: Due Today - Stage Transition (Stage >= 1 in DB, Stage 2+ in UI)
 * Rank 2: Due Today - First Review (Stage 0 in DB, Stage 1 in UI)
 * Rank 3: Overdue Scheduled Revision (Stage >= 1 or has review history)
 * Rank 4: Overdue Recent First Review (Stage 0, solved within last 7 days)
 * Rank 5: Long-Overdue Newly Tracked Backlog (Stage 0, no review history, solved > 7 days ago)
 * Rank 6: Upcoming (Future review date)
 */
export function classifyProblem<T extends PrioritizableProblem>(
    item: T,
    now: Date = new Date(),
): ClassifiedProblem<T> {
    const nextReview = new Date(item.nextReviewAt);
    const solvedDate = new Date(item.solvedAt);

    const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    );
    const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
    );

    const isOverdue = nextReview < startOfToday;
    const isDueToday = nextReview >= startOfToday && nextReview <= now;
    const isScheduledForToday = nextReview >= startOfToday && nextReview <= endOfToday;

    // Scheduled revision = has advanced past stage 0, or has review history
    const isScheduledRevision =
        (item.currentReviewStage ?? 0) > 0 ||
        (item.reviewCount ?? 0) > 0 ||
        Boolean(item.lastReviewedAt);

    const daysSinceSolved = Math.floor(
        (now.getTime() - solvedDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isRecentlySolved = daysSinceSolved <= 7;

    let rank = 6; // Upcoming by default

    if (isDueToday || isScheduledForToday) {
        if (isScheduledRevision && item.currentReviewStage > 0) {
            rank = 1; // Due today: Scheduled stage transition
        } else {
            rank = 2; // Due today: Initial scheduled review
        }
    } else if (isOverdue) {
        if (isScheduledRevision) {
            rank = 3; // Overdue active scheduled revision
        } else if (isRecentlySolved) {
            rank = 4; // Overdue recent first review
        } else {
            rank = 5; // Long-overdue newly tracked backlog problem
        }
    }

    return {
        item,
        rank,
        isDueToday: isDueToday || isScheduledForToday,
        isOverdue,
        isScheduledRevision,
        isRecentlySolved,
        daysSinceSolved,
    };
}

/**
 * Consistent comparison function for sorting problems by priority:
 * 1. Priority Rank (Scheduled due today -> overdue scheduled -> backlog -> upcoming)
 * 2. Starred status (Starred problems first within the same rank)
 * 3. Review Stage (Higher stage transitions first)
 * 4. Earliest due date (nextReviewAt ascending)
 */
export function compareProblemsByPriority<T extends PrioritizableProblem>(
    a: T,
    b: T,
    now: Date = new Date(),
): number {
    const classA = classifyProblem(a, now);
    const classB = classifyProblem(b, now);

    // 1. Rank comparison
    if (classA.rank !== classB.rank) {
        return classA.rank - classB.rank;
    }

    // 2. Starred problems first
    if (a.isStarred !== b.isStarred) {
        return a.isStarred ? -1 : 1;
    }

    // 3. Higher stage first for stage transitions
    if (a.currentReviewStage !== b.currentReviewStage) {
        return b.currentReviewStage - a.currentReviewStage;
    }

    // 4. Earliest due date first
    return (
        new Date(a.nextReviewAt).getTime() -
        new Date(b.nextReviewAt).getTime()
    );
}

/**
 * Selects revision candidates for daily digest email reminders.
 *
 * Rules:
 * - Collects all active scheduled revisions requiring revision today (Rank 1, 2, 3, 4).
 * - If active scheduled revisions exist: sends up to 3 prioritized problems (capped at max 3)
 *   so the daily workload is focused and manageable without causing fatigue.
 * - If NO active scheduled revisions exist, but user has backlog:
 *   picks up to 2 prioritized backlog problems (starred first, earliest solved)
 *   to help user start clearing older problems without overwhelming them.
 */
export function getRevisionEmailCandidates<T extends PrioritizableProblem>(
    problems: T[],
    now: Date = new Date(),
    maxActiveAllowed = 3,
): {
    problemsToSend: T[];
    totalDueCount: number;
    activeScheduledCount: number;
    backlogCount: number;
} {
    const classified = problems.map((p) => classifyProblem(p, now));

    // Sort all problems using consistent priority comparator
    classified.sort((a, b) => compareProblemsByPriority(a.item, b.item, now));

    const activeScheduled = classified
        .filter((c) => c.rank >= 1 && c.rank <= 4)
        .map((c) => c.item);

    const backlog = classified
        .filter((c) => c.rank === 5)
        .map((c) => c.item);

    let problemsToSend: T[] = [];

    if (activeScheduled.length > 0) {
        // Send all scheduled revisions requiring revision today
        problemsToSend = activeScheduled.slice(0, maxActiveAllowed);
    } else if (backlog.length > 0) {
        // If no active scheduled revisions, offer up to 2 backlog problems to preserve momentum
        problemsToSend = backlog.slice(0, 2);
    }

    return {
        problemsToSend,
        totalDueCount: problems.length,
        activeScheduledCount: activeScheduled.length,
        backlogCount: backlog.length,
    };
}
