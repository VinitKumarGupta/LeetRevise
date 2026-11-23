import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
    Search,
    Calendar,
    ChevronRight,
    Play,
    Pause,
    Trash2,
    AlertTriangle,
    Star,
} from "lucide-react";
import api from "../services/api.js";
import { DifficultyBadge, Feedback, Modal, PageHeader } from "../components/ui.js";

export const Queue: React.FC = () => {
    const queryClient = useQueryClient();

    // Filter & Sorting state
    const [search, setSearch] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [status, setStatus] = useState("due"); // default filter to 'due' revisions
    const [sortBy, setSortBy] = useState("priority");
    const [removeTarget, setRemoveTarget] = useState<{ id: string; title: string } | null>(null);

    // Fetch problems list
    const {
        data: queueData,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["problems", search, difficulty, status, sortBy],
        queryFn: async () => {
            const res = await api.get("/problems", {
                params: {
                    search,
                    difficulty,
                    status,
                    sortBy,
                },
            });
            return res.data;
        },
    });

    // Toggle status mutation (pause / resume)
    const statusMutation = useMutation({
        mutationFn: async ({
            id,
            newStatus,
        }: {
            id: string;
            newStatus: "active" | "paused" | "completed";
        }) => {
            const res = await api.patch(`/problems/${id}/status`, {
                status: newStatus,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] });
        },
    });

    const starMutation = useMutation({
        mutationFn: async ({
            id,
            starred,
        }: {
            id: string;
            starred: boolean;
        }) => {
            const res = await api.patch(`/problems/${id}/star`, { starred });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] });
        },
    });

    // Delete problem tracking mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.delete(`/problems/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["problems"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
        },
    });

    const problems = queueData?.problems || [];

    // Formatter for due countdown
    const getRemainingTime = (dateStr: string, dueStatus: string) => {
        const nextReview = new Date(dateStr);
        const now = new Date();
        const diffTime = nextReview.getTime() - now.getTime();

        if (dueStatus === "completed") return "Completed";
        if (dueStatus === "paused") return "Paused";

        if (diffTime <= 0) {
            const overdueTime = Math.abs(diffTime);
            const diffDays = Math.floor(overdueTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                const diffHours = Math.floor(overdueTime / (1000 * 60 * 60));
                return diffHours > 0 ? `${diffHours}h overdue` : "Due now";
            }
            return `${diffDays}d overdue`;
        } else {
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                return `${diffHours}h left`;
            }
            return `in ${diffDays} days`;
        }
    };

    return (
        <div className="page-stack">
            <PageHeader title="Revision Queue" description="Review solved LeetCode problems at each spaced repetition milestone." />

            <section className="panel queue-toolbar" aria-label="Queue filters">
                <div className="queue-controls">
                    <div className="queue-search relative">
                        <Search className="field-icon" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search problems or topics"
                            aria-label="Search problems or topics"
                            className="field field-with-icon"
                        />
                    </div>
                    <div className="segmented queue-filters" role="group" aria-label="Review status">
                        {[
                            { id: "due", label: "Due" },
                            { id: "upcoming", label: "Upcoming" },
                            { id: "completed", label: "Completed" },
                            { id: "paused", label: "Paused" },
                            { id: "starred", label: "Starred" },
                            { id: "", label: "All" },
                        ].map(({ id, label }) => (
                            <button type="button" key={id} onClick={() => setStatus(id)} aria-pressed={status === id} className="segment">
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="queue-selects text-xs text-muted">
                    <label>
                        Difficulty
                        <select className="field" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                            <option value="">All difficulties</option>
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </label>
                    <label>
                        Sort by
                        <select className="field" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                            <option value="priority">Priority (scheduled first)</option>
                            <option value="due_asc">Due date (oldest first)</option>
                            <option value="due_desc">Due date (newest first)</option>
                            <option value="date_desc">Solved date (newest first)</option>
                            <option value="date_asc">Solved date (oldest first)</option>
                            <option value="diff_desc">Difficulty (hard first)</option>
                            <option value="diff_asc">Difficulty (easy first)</option>
                        </select>
                    </label>
                </div>
            </section>

            {isLoading ? (
                <div className="grid gap-2.5" aria-busy="true" aria-label="Loading revision queue">
                    {[1, 2, 3, 4].map((row) => <div key={row} className="skeleton h-24" />)}
                </div>
            ) : error ? (
                <div className="panel empty-state">
                    <p role="alert">Could not load the revision queue.</p>
                    <button type="button" className="button button-secondary button-small" onClick={() => refetch()}>Retry</button>
                </div>
            ) : problems.length === 0 ? (
                <div className="panel empty-state">
                    <Calendar aria-hidden="true" />
                    <h2 className="panel-heading text-ink">Queue is empty</h2>
                    <p>{status === "due" ? "No revisions are due right now." : "No tracked problems match your filters."}</p>
                    {status === "due" && (
                        <button type="button" onClick={() => setStatus("")} className="button button-secondary button-small">
                            View All Problems
                        </button>
                    )}
                </div>
            ) : (
                <ul className="grid gap-2.5" aria-label="Tracked problems">
                    {problems.map((item: any) => {
                        const isOverdue = item.dueStatus === "overdue";
                        const isDueNow = item.dueStatus === "due";
                        const isPaused = item.status === "paused";
                        const isScheduled = item.dueStatus !== "completed" && item.dueStatus !== "paused";
                        const problemPath = `/problem/${item.id}`;
                        const scheduleAction = isPaused ? "Resume review schedule" : "Pause review schedule";
                        const ScheduleIcon = isPaused ? Play : Pause;
                        const starAction = item.isStarred ? "Remove star" : "Mark as starred";

                        return (
                            <li key={item.id} className="panel queue-card" data-starred={item.isStarred}>
                                <div className="queue-card-info">
                                    <div className="queue-card-title">
                                        <Link to={problemPath}>{item.problem.title}</Link>
                                        <DifficultyBadge difficulty={item.problem.difficulty} />
                                        {isPaused && <span className="badge"><Pause aria-hidden="true" /> Paused</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {item.problem.topics.split(",").map((topic: string) => topic.trim()).filter(Boolean).map((topic: string) => (
                                            <span key={topic} className="badge">{topic}</span>
                                        ))}
                                    </div>
                                    <div className="text-xs text-muted">
                                        Stage {item.currentReviewStage + 1} / 6
                                        <span aria-hidden="true"> · </span>
                                        <span>Solved <time dateTime={item.solvedAt}>{new Date(item.solvedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</time></span>
                                    </div>
                                </div>

                                <div className="queue-meta">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                        {isOverdue || isDueNow ? (
                                            <span className="badge" data-tone="medium">
                                                {isOverdue && <AlertTriangle aria-hidden="true" />}
                                                {isDueNow ? "Due today" : "Overdue"}
                                            </span>
                                        ) : null}
                                        <span>{getRemainingTime(item.nextReviewAt, item.dueStatus)}</span>
                                        {isScheduled && (
                                            <time dateTime={item.nextReviewAt}>{new Date(item.nextReviewAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</time>
                                        )}
                                    </div>
                                    <div className="queue-card-actions" role="group" aria-label={`Actions for ${item.problem.title}`}>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            aria-label="Star problem"
                                            title={starAction}
                                            aria-pressed={item.isStarred}
                                            onClick={() => starMutation.mutate({ id: item.id, starred: !item.isStarred })}
                                        >
                                            <Star aria-hidden="true" className={item.isStarred ? "fill-current" : ""} />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            title={scheduleAction}
                                            aria-label={scheduleAction}
                                            onClick={() => statusMutation.mutate({ id: item.id, newStatus: isPaused ? "active" : "paused" })}
                                        >
                                            <ScheduleIcon aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button icon-button-danger"
                                            title="Remove tracking"
                                            aria-label="Remove tracking"
                                            onClick={() => {
                                                deleteMutation.reset();
                                                setRemoveTarget({ id: item.id, title: item.problem.title });
                                            }}
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </button>
                                        <Link to={problemPath} className="button button-accent button-small">
                                            Revise <ChevronRight aria-hidden="true" />
                                        </Link>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {removeTarget && (
                <Modal onClose={() => setRemoveTarget(null)} aria-labelledby="remove-heading" aria-describedby="remove-description">
                    <h2 id="remove-heading" className="panel-heading">Remove problem from queue?</h2>
                    <p id="remove-description" className="mt-2 break-words text-sm text-muted">Stop tracking {removeTarget.title}.</p>
                    {deleteMutation.isError && <div className="mt-3"><Feedback tone="error">Could not remove the problem. Try again.</Feedback></div>}
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <button type="button" className="button button-secondary" onClick={() => setRemoveTarget(null)} autoFocus>Cancel</button>
                        <button
                            type="button"
                            className="button button-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) })}
                        >
                            {deleteMutation.isPending ? "Removing…" : "Remove Problem"}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
