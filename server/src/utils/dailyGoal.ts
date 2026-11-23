import { createLocalDayFormatter } from './localDay.js';

interface TrackedProblem {
    solvedAt: Date;
    history: { reviewedAt: Date; result: string }[];
}

export function getDailyGoal(problems: TrackedProblem[], timeZone: string, now: Date) {
    const formatDay = createLocalDayFormatter(timeZone);
    const today = formatDay(now);
    let todaySolvedCount = 0;
    let todayRevisedCount = 0;

    for (const { solvedAt, history } of problems) {
        if (solvedAt > now) continue;
        if (formatDay(solvedAt) === today) {
            todaySolvedCount++;
        } else if (history.some(({ reviewedAt, result }) =>
            reviewedAt <= now && ['easy', 'effort', 'forgot'].includes(result) && formatDay(reviewedAt) === today,
        )) {
            todayRevisedCount++;
        }
    }

    return { todaySolvedCount, todayRevisedCount };
}
