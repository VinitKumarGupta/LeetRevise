import { getDailyGoal } from './dailyGoal.js';
import { resolveSolveDate } from './localDay.js';

const date = (value: string) => new Date(value);
const review = (reviewedAt: string, result = 'easy') => ({ reviewedAt: date(reviewedAt), result });

it('counts distinct older problems reviewed and new solves on the user’s calendar day', () => {
    const now = date('2026-11-23T20:00:00Z'); // November 24, 01:30 in Kolkata
    const problems = [
        { solvedAt: date('2026-11-23T18:35:00Z'), history: [review('2026-11-23T19:00:00Z')] },
        { solvedAt: date('2026-11-23T18:29:00Z'), history: [
            review('2026-11-23T19:00:00Z', 'forgot'), review('2026-11-23T19:10:00Z'),
        ] },
        { solvedAt: date('2026-11-21T13:00:00Z'), history: [review('2026-11-23T19:30:00Z', 'skipped')] },
        { solvedAt: date('2026-11-20T13:00:00Z'), history: [review('2026-11-23T18:29:00Z')] },
        { solvedAt: date('2026-11-23T21:00:00Z'), history: [] },
    ];

    expect(getDailyGoal(problems, 'Asia/Kolkata', now)).toEqual({
        todaySolvedCount: 1, todayRevisedCount: 1,
    });
});

it('keeps the date of a late import and resets the counts at local midnight', () => {
    const problem = { solvedAt: date('2026-11-23T07:55:00Z'), history: [] };
    expect(getDailyGoal([problem], 'America/Los_Angeles', date('2026-11-23T07:59:00Z')).todaySolvedCount).toBe(1);
    expect(getDailyGoal([problem], 'America/Los_Angeles', date('2026-11-23T08:01:00Z')).todaySolvedCount).toBe(0);
});

it('resolves manual dates in the account timezone across a daylight saving change', () => {
    const now = date('2026-03-10T03:00:00Z');
    expect(resolveSolveDate('2026-03-08', 'America/Los_Angeles', now)?.toISOString()).toBe('2026-03-08T08:00:00.000Z');
    expect(resolveSolveDate('2026-03-09', 'America/Los_Angeles', now)).toBe(now);
    expect(resolveSolveDate('2026-03-10', 'America/Los_Angeles', now)).toBeNull();
    expect(resolveSolveDate('2026-03-08', 'Asia/Kolkata', now)?.toISOString()).toBe('2026-03-07T18:30:00.000Z');
});
