import { calculateNextReview } from "./scheduler.js";

describe("calculateNextReview", () => {
    const baseDate = new Date("2026-01-15T12:00:00.000Z");

    it.each([
        ["easy", 1, 3],
        ["effort", 0, 1],
        ["forgot", 0, 1],
        ["skipped", 2, 1],
    ] as const)(
        "handles a %s review",
        (result, expectedStage, expectedDays) => {
            const schedule = calculateNextReview(
                result === "easy" ? 0 : result === "effort" ? 0 : 2,
                result,
                baseDate,
            );

            expect(schedule.nextStage).toBe(expectedStage);
            expect(schedule.nextReviewAt).toEqual(
                new Date(
                    `2026-01-${String(15 + expectedDays).padStart(2, "0")}T12:00:00.000Z`,
                ),
            );
        },
    );

    it("keeps the maximum stage when an easy review is already at the maximum", () => {
        const schedule = calculateNextReview(5, "easy", baseDate);

        expect(schedule).toEqual({
            nextStage: 5,
            nextReviewAt: new Date("2026-04-15T12:00:00.000Z"),
        });
    });

    it("bounds an invalid stage before calculating the next interval", () => {
        expect(calculateNextReview(-1, "effort", baseDate).nextStage).toBe(0);
        expect(calculateNextReview(99, "effort", baseDate).nextStage).toBe(5);
    });

    it("handles month boundaries using calendar-day arithmetic", () => {
        const schedule = calculateNextReview(
            0,
            "easy",
            new Date("2026-01-30T12:00:00.000Z"),
        );

        expect(schedule.nextReviewAt).toEqual(
            new Date("2026-02-02T12:00:00.000Z"),
        );
    });
});
