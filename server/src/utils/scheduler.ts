// Spaced Repetition Intervals in days
// Stage 0: 1 day
// Stage 1: 3 days
// Stage 2: 7 days (1 week)
// Stage 3: 14 days (2 weeks)
// Stage 4: 30 days (~1 month)
// Stage 5: 90 days (~3 months)
export const STAGE_INTERVALS = [1, 3, 7, 14, 30, 90];
export const MAX_STAGE = STAGE_INTERVALS.length - 1; // 5

export interface ScheduleResult {
  nextStage: number;
  nextReviewAt: Date;
}

/**
 * Calculates the next review stage and date based on the spaced repetition schedule and user response.
 * 
 * @param currentStage The current stage of the problem (0 to 5)
 * @param result The outcome of the review: 'easy', 'effort', 'forgot', or 'skipped'
 * @param baseDate The date from which to schedule the next review (defaults to now)
 */
export function calculateNextReview(
  currentStage: number,
  result: 'easy' | 'effort' | 'forgot' | 'skipped',
  baseDate: Date = new Date()
): ScheduleResult {
  let nextStage = currentStage;
  let intervalDays = STAGE_INTERVALS[currentStage];

  // Ensure stage is bounded
  if (nextStage < 0) nextStage = 0;
  if (nextStage > MAX_STAGE) nextStage = MAX_STAGE;

  switch (result) {
    case 'easy':
      // Move to next stage, increase interval
      if (nextStage < MAX_STAGE) {
        nextStage += 1;
      }
      intervalDays = STAGE_INTERVALS[nextStage];
      break;

    case 'effort':
      // Keep same stage, keep same interval
      intervalDays = STAGE_INTERVALS[nextStage];
      break;

    case 'forgot':
      // Reset back to stage 0, 1-day interval
      nextStage = 0;
      intervalDays = STAGE_INTERVALS[0];
      break;

    case 'skipped':
      // Keep same stage, but review again tomorrow (1-day delay)
      intervalDays = 1;
      break;
  }

  const nextReviewAt = new Date(baseDate);
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return {
    nextStage,
    nextReviewAt,
  };
}
