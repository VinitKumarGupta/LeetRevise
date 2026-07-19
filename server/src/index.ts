import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Route imports
import authRouter from "./routes/auth.js";
import syncRouter from "./routes/sync.js";
import problemsRouter from "./routes/problems.js";
import analyticsRouter from "./routes/analytics.js";
import notificationsRouter from "./routes/notifications.js";
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for local development
const corsOptions = {
    origin: [
        "http://localhost:5173",
        "https://leetcode-revision-tracker.vercel.app",
    ], // Vite default port
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Enhanced diagnostics health check
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    // Try a simple direct SQL query to test connectivity
    await db.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      time: new Date(),
      database: 'connected',
      latency: `${Date.now() - start}ms`,
      diagnostics: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error: any) {
    console.error('Health check DB error:', error);
    res.status(500).json({
      status: 'error',
      time: new Date(),
      database: 'disconnected',
      errorMessage: error.message || error,
      diagnostics: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  }
});

// API route mounts
app.use("/api/auth", authRouter);
app.use("/api/sync", syncRouter);
app.use("/api/problems", problemsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/notifications", notificationsRouter);

// Express error handler
app.use(
    (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        console.error("Unhandled server error:", err);
        res.status(500).json({
            message: err.message || "Internal server error",
        });
    },
);

app.listen(PORT, () => {
    console.log(
        `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
    );
});
