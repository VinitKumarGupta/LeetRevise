import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Target } from 'lucide-react';

const target = 3;
export const practiceListUrl = 'https://neetcode.io/practice/practice/neetcode250';

function GoalProgress({ label, count }: { label: string; count?: number }) {
  const progress = count === undefined ? undefined : Math.min(count, target);
  return (
    <div className="grid gap-1.5">
      <div className="goal-row">
        <span>{label}</span>
        <span className="flex items-center gap-1 tabular-nums">
          {progress === target && <CheckCircle2 className="size-3.5 text-easy" aria-hidden="true" />}
          {progress ?? '—'} / {target}
        </span>
      </div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={target} aria-valuenow={progress}>
        <div className="progress-fill" style={{ width: `${((progress ?? 0) / target) * 100}%` }} />
      </div>
    </div>
  );
}

export function DailyGoal({ solved, reviewed, unavailable, onNavigate }: {
  solved?: number;
  reviewed?: number;
  unavailable: boolean;
  onNavigate: () => void;
}) {
  const goalMet = (solved ?? 0) >= target && (reviewed ?? 0) >= target;
  const GoalIcon = goalMet ? CheckCircle2 : Target;

  return (
    <section className="goal" aria-labelledby="daily-goal-title">
      <div className="goal-title">
        <h2 id="daily-goal-title" className="flex items-center gap-2">
          <GoalIcon className={goalMet ? 'text-easy' : 'text-accent'} aria-hidden="true" />
          Daily Goal
        </h2>
        {goalMet && <span role="status" className="text-easy">Complete</span>}
      </div>
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <GoalProgress label="Solve new problems" count={solved} />
          <div className="goal-links">
            <a href={practiceListUrl} target="_blank" rel="noreferrer" onClick={onNavigate}>
              Find a problem <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
            <Link to="/settings#manual-import" onClick={onNavigate}>Mark as solved</Link>
          </div>
        </div>
        <div className="grid gap-1.5">
          <GoalProgress label="Review old problems" count={reviewed} />
          <div className="goal-links">
            <Link to="/queue" onClick={onNavigate}>Open revision queue</Link>
          </div>
        </div>
      </div>
      {unavailable && <p className="mt-2 text-xs text-muted">Progress is unavailable.</p>}
    </section>
  );
}
