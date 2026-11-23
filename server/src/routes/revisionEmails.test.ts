import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { emailService } from '../services/emailService.js';
import authRouter from './auth.js';
import notificationsRouter from './notifications.js';

jest.mock('../db.js', () => ({
    __esModule: true,
    default: { user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } },
}));
jest.mock('../services/emailService.js', () => ({
    emailService: { sendRevisionDigest: jest.fn().mockResolvedValue({ success: true }) },
}));

const userId = 'reviewer';
const email = 'reviewer@example.test';
const jwtSecret = process.env.JWT_SECRET || 'leetcode-revision-tracker-secret-key-12345!';
const headers = {
    Authorization: `Bearer ${jwt.sign({ id: userId, email }, jwtSecret)}`,
    'Content-Type': 'application/json',
};
const otherEmail = 'other@example.test';
const userDb = db.user as unknown as Record<'update' | 'findUnique' | 'findMany', jest.Mock>;
const dueProblem = {
    id: 'due-problem',
    status: 'active',
    nextReviewAt: new Date(0),
    solvedAt: new Date(0),
    currentReviewStage: 1,
    isStarred: false,
    problem: { title: 'Two Sum', titleSlug: 'two-sum', difficulty: 'Easy', url: '', topics: 'Array' },
};

let server: Server;
let baseUrl: string;
let paused: boolean;

beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    app.use('/notifications', notificationsRouter);
    await new Promise<void>((resolve, reject) => {
        server = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve());
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
});

beforeEach(() => {
    jest.clearAllMocks();
    paused = false;
    userDb.update.mockImplementation(async ({ where, data }) => {
        expect(where).toEqual({ id: userId });
        paused = Boolean(data.revisionEmailsPaused);
        return { id: userId, email, revisionEmailsPaused: paused };
    });
    userDb.findUnique.mockImplementation(async ({ where }) => ({
        id: where.id,
        email: where.id === userId ? email : otherEmail,
        revisionEmailsPaused: where.id === userId && paused,
    }));
    userDb.findMany.mockImplementation(async ({ where }) => {
        expect(where).toEqual({ revisionEmailsPaused: false });
        return [
            { id: userId, email, revisionEmailsPaused: paused },
            { id: 'other-user', email: otherEmail, revisionEmailsPaused: false },
        ].filter((user) => !user.revisionEmailsPaused).map((user) => ({
            ...user, name: 'Reviewer', timezone: 'UTC', reminderTime: '09:00', solvedProblems: [dueProblem],
        }));
    });
});

function updatePause(value: boolean) {
    return fetch(`${baseUrl}/auth/profile`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ revisionEmailsPaused: value }),
    });
}

function runCron() {
    const secret = process.env.CRON_SECRET?.replace(/^["']|["']$/g, '').trim();
    return fetch(`${baseUrl}/notifications/send-due-reminders?force=true`, {
        headers: secret ? { 'x-cron-secret': secret } : {},
    });
}

it('persists the pause for the signed-in user and resumes delivery on request', async () => {
    expect((await updatePause(true)).status).toBe(200);
    const profile = await fetch(`${baseUrl}/auth/me`, { headers });
    expect(await profile.json()).toMatchObject({ user: { revisionEmailsPaused: true } });

    const pausedCron = await runCron();
    expect(await pausedCron.json()).toMatchObject({ sentCount: 1 });
    expect(jest.mocked(emailService.sendRevisionDigest).mock.calls.map(([recipient]) => recipient)).toEqual([otherEmail]);

    expect((await updatePause(false)).status).toBe(200);
    const resumedCron = await runCron();
    expect(await resumedCron.json()).toMatchObject({ sentCount: 2 });
    expect(jest.mocked(emailService.sendRevisionDigest).mock.calls.map(([recipient]) => recipient)).toEqual([otherEmail, email, otherEmail]);
});

it('blocks a test email while paused', async () => {
    await updatePause(true);
    const result = await fetch(`${baseUrl}/notifications/test-email`, { method: 'POST', headers });
    expect(result.status).toBe(409);
    expect(emailService.sendRevisionDigest).not.toHaveBeenCalled();
});

it('skips a user who pauses after the scheduled run starts', async () => {
    const findMany = userDb.findMany;
    const fetchCandidates = findMany.getMockImplementation()!;
    findMany.mockImplementationOnce(async (args) => {
        const candidates = await fetchCandidates(args);
        paused = true;
        return candidates;
    });
    const result = await runCron();
    expect(await result.json()).toMatchObject({ sentCount: 1, skippedCount: 1 });
    expect(jest.mocked(emailService.sendRevisionDigest).mock.calls.map(([recipient]) => recipient)).toEqual([otherEmail]);
});
