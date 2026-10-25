import {
    classifyProblem,
    compareProblemsByPriority,
    getRevisionEmailCandidates,
    PrioritizableProblem,
} from "./priority.js";

describe("Prioritization and Reminder Logic", () => {
    const fixedNow = new Date("2026-10-25T12:00:00Z");

    const createProblem = (
        overrides: Partial<PrioritizableProblem>,
    ): PrioritizableProblem => ({
        id: "p1",
        nextReviewAt: new Date("2026-10-25T10:00:00Z"),
        currentReviewStage: 0,
        reviewCount: 0,
        lastReviewedAt: null,
        solvedAt: new Date("2026-10-24T10:00:00Z"),
        isStarred: false,
        status: "active",
        ...overrides,
    });

    describe("classifyProblem", () => {
        it("classifies scheduled stage transition due today as Rank 1", () => {
            const problem = createProblem({
                currentReviewStage: 1, // Stage 2 in UI
                reviewCount: 1,
                lastReviewedAt: new Date("2026-10-22T10:00:00Z"),
                nextReviewAt: new Date("2026-10-25T10:00:00Z"), // Due today
            });

            const classified = classifyProblem(problem, fixedNow);
            expect(classified.rank).toBe(1);
            expect(classified.isDueToday).toBe(true);
            expect(classified.isScheduledRevision).toBe(true);
        });

        it("classifies first review due today as Rank 2", () => {
            const problem = createProblem({
                currentReviewStage: 0,
                reviewCount: 0,
                solvedAt: new Date("2026-10-24T10:00:00Z"),
                nextReviewAt: new Date("2026-10-25T10:00:00Z"), // Due today
            });

            const classified = classifyProblem(problem, fixedNow);
            expect(classified.rank).toBe(2);
            expect(classified.isDueToday).toBe(true);
        });

        it("classifies overdue scheduled revision as Rank 3", () => {
            const problem = createProblem({
                title: "Product of Array Except Self",
                currentReviewStage: 1, // Stage 2 in UI
                reviewCount: 1,
                lastReviewedAt: new Date("2026-09-01T10:00:00Z"),
                nextReviewAt: new Date("2026-10-02T10:00:00Z"), // 23d overdue
            });

            const classified = classifyProblem(problem, fixedNow);
            expect(classified.rank).toBe(3);
            expect(classified.isOverdue).toBe(true);
            expect(classified.isScheduledRevision).toBe(true);
        });

        it("classifies recent first review that is overdue as Rank 4", () => {
            const problem = createProblem({
                currentReviewStage: 0,
                reviewCount: 0,
                solvedAt: new Date("2026-10-22T10:00:00Z"), // 3 days ago (recent)
                nextReviewAt: new Date("2026-10-23T10:00:00Z"), // 2 days overdue
            });

            const classified = classifyProblem(problem, fixedNow);
            expect(classified.rank).toBe(4);
            expect(classified.isOverdue).toBe(true);
            expect(classified.isRecentlySolved).toBe(true);
        });

        it("classifies long-overdue newly tracked problem (e.g. 40+ days) as Rank 5 (Backlog)", () => {
            const problem = createProblem({
                title: "Group Anagrams",
                currentReviewStage: 0,
                reviewCount: 0,
                lastReviewedAt: null,
                solvedAt: new Date("2026-07-28T10:00:00Z"), // 89 days ago
                nextReviewAt: new Date("2026-07-29T10:00:00Z"), // 43+ days overdue
            });

            const classified = classifyProblem(problem, fixedNow);
            expect(classified.rank).toBe(5);
            expect(classified.isOverdue).toBe(true);
            expect(classified.isRecentlySolved).toBe(false);
            expect(classified.isScheduledRevision).toBe(false);
        });
    });

    describe("compareProblemsByPriority", () => {
        it("prioritizes scheduled revision due today over 40+ day overdue backlog", () => {
            const backlogProblem = createProblem({
                id: "backlog-1",
                title: "Group Anagrams",
                currentReviewStage: 0,
                nextReviewAt: new Date("2026-07-29T10:00:00Z"), // 43d overdue
                solvedAt: new Date("2026-07-28T10:00:00Z"),
            });

            const activeDueToday = createProblem({
                id: "active-today",
                title: "Two Sum",
                currentReviewStage: 1, // Stage 2 transition
                reviewCount: 1,
                lastReviewedAt: new Date("2026-10-22T10:00:00Z"),
                nextReviewAt: new Date("2026-10-25T10:00:00Z"), // Due today
                solvedAt: new Date("2026-10-21T10:00:00Z"),
            });

            const result = compareProblemsByPriority(activeDueToday, backlogProblem, fixedNow);
            expect(result).toBeLessThan(0); // activeDueToday comes before backlogProblem
        });

        it("prioritizes overdue scheduled revisions over long-overdue unreviewed backlog", () => {
            const backlogProblem = createProblem({
                id: "backlog-1",
                title: "Group Anagrams",
                currentReviewStage: 0,
                nextReviewAt: new Date("2026-07-29T10:00:00Z"), // 43d overdue
                solvedAt: new Date("2026-07-28T10:00:00Z"),
            });

            const overdueScheduled = createProblem({
                id: "scheduled-overdue",
                title: "Longest Consecutive Sequence",
                currentReviewStage: 1, // Stage 2/6
                reviewCount: 1,
                lastReviewedAt: new Date("2026-10-10T10:00:00Z"),
                nextReviewAt: new Date("2026-10-17T10:00:00Z"), // 8d overdue
                solvedAt: new Date("2026-08-28T10:00:00Z"),
            });

            const result = compareProblemsByPriority(overdueScheduled, backlogProblem, fixedNow);
            expect(result).toBeLessThan(0); // overdueScheduled comes before backlog
        });

        it("prioritizes starred problems within the same rank", () => {
            const unstarred = createProblem({
                id: "unstarred",
                isStarred: false,
                currentReviewStage: 1,
                reviewCount: 1,
                nextReviewAt: new Date("2026-10-25T10:00:00Z"),
            });

            const starred = createProblem({
                id: "starred",
                isStarred: true,
                currentReviewStage: 1,
                reviewCount: 1,
                nextReviewAt: new Date("2026-10-25T10:00:00Z"),
            });

            expect(compareProblemsByPriority(starred, unstarred, fixedNow)).toBeLessThan(0);
        });
    });

    describe("getRevisionEmailCandidates", () => {
        it("sends all scheduled revisions due today without backlog dominating", () => {
            const activeScheduled1 = createProblem({
                id: "active-1",
                currentReviewStage: 1,
                reviewCount: 1,
                nextReviewAt: new Date("2026-10-25T10:00:00Z"),
            });

            const activeScheduled2 = createProblem({
                id: "active-2",
                currentReviewStage: 2,
                reviewCount: 2,
                nextReviewAt: new Date("2026-10-25T10:00:00Z"),
            });

            const overdueScheduled = createProblem({
                id: "active-3",
                currentReviewStage: 1,
                reviewCount: 1,
                nextReviewAt: new Date("2026-10-20T10:00:00Z"), // 5d overdue
            });

            // 10 long-overdue backlog problems
            const backlogProblems = Array.from({ length: 10 }, (_, i) =>
                createProblem({
                    id: `backlog-${i}`,
                    currentReviewStage: 0,
                    reviewCount: 0,
                    solvedAt: new Date("2026-08-01T10:00:00Z"),
                    nextReviewAt: new Date("2026-08-02T10:00:00Z"),
                }),
            );

            const allProblems = [
                ...backlogProblems,
                activeScheduled1,
                activeScheduled2,
                overdueScheduled,
            ];

            const result = getRevisionEmailCandidates(allProblems, fixedNow);

            expect(result.totalDueCount).toBe(13);
            expect(result.activeScheduledCount).toBe(3);
            expect(result.backlogCount).toBe(10);
            // Must include all 3 active scheduled revisions
            expect(result.problemsToSend).toHaveLength(3);
            expect(result.problemsToSend.map((p) => p.id)).toEqual([
                "active-2", // Stage 2 transition first
                "active-1", // Stage 1 transition second
                "active-3", // Overdue scheduled third
            ]);
        });

        it("suggests up to 2 backlog focus problems when user has NO active scheduled revisions", () => {
            const backlogProblems = [
                createProblem({
                    id: "backlog-unstarred",
                    isStarred: false,
                    solvedAt: new Date("2026-08-01T10:00:00Z"),
                    nextReviewAt: new Date("2026-08-02T10:00:00Z"),
                }),
                createProblem({
                    id: "backlog-starred-1",
                    isStarred: true,
                    solvedAt: new Date("2026-08-05T10:00:00Z"),
                    nextReviewAt: new Date("2026-08-06T10:00:00Z"),
                }),
                createProblem({
                    id: "backlog-starred-2",
                    isStarred: true,
                    solvedAt: new Date("2026-08-10T10:00:00Z"),
                    nextReviewAt: new Date("2026-08-11T10:00:00Z"),
                }),
            ];

            const result = getRevisionEmailCandidates(backlogProblems, fixedNow);

            expect(result.totalDueCount).toBe(3);
            expect(result.activeScheduledCount).toBe(0);
            expect(result.backlogCount).toBe(3);
            expect(result.problemsToSend).toHaveLength(2);
            // Starred backlog problems should be chosen first
            expect(result.problemsToSend.map((p) => p.id)).toEqual([
                "backlog-starred-1",
                "backlog-starred-2",
            ]);
        });
    });
});
