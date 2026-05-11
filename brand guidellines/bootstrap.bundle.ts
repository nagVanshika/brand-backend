// ═══════════════════════════════════════════════════════════════
// utils/paginate.util.ts
// ═══════════════════════════════════════════════════════════════

export interface PaginationMeta {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
}

export function buildPagination(total: number, page: number, limit: number): PaginationMeta {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
}

export function buildSkip(page: number, limit: number): number {
    return (page - 1) * limit;
}


// ═══════════════════════════════════════════════════════════════
// utils/errors.util.ts
// ═══════════════════════════════════════════════════════════════

export class AppError extends Error {
    public readonly statusCode:    number;
    public readonly errorCode:     string;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode    = statusCode;
        this.errorCode     = errorCode;
        this.isOperational = true;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found.`, 404, `${resource.toUpperCase().replace(' ', '_')}_NOT_FOUND`);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class ForbiddenError extends AppError {
    constructor(msg = 'Access denied.') {
        super(msg, 403, 'FORBIDDEN');
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(msg: string) {
        super(msg, 422, 'VALIDATION_ERROR');
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}


// ═══════════════════════════════════════════════════════════════
// index.ts — app bootstrap
// ═══════════════════════════════════════════════════════════════
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { loggerMiddleware }   from './middleware/logger.middleware';
import { errorHandler }       from './middleware/errorHandler.middleware';
import { campaignRouter }     from './routes/v1/campaign.routes';
import { kycRouter, kycAdminRouter } from './routes/v1/kyc.routes';
// import { authRouter }   from './routes/v1/auth.routes';
// import { brandRouter }  from './routes/v1/brand.routes';

const app = express();

// ── Security ──────────────────────────────────
app.use(helmet());
app.use(cors({
    origin:      (process.env.ALLOWED_ORIGINS ?? '').split(','),
    credentials: true
}));
app.use(mongoSanitize());

// ── Performance ───────────────────────────────
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
    threshold: 1024
}));

// ── Body parsing ──────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Global rate limit ─────────────────────────
app.use('/api/', rateLimit({
    windowMs:         15 * 60 * 1000,
    max:              100,
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests.' }
}));

// ── Global request logger (traceId + X-Trace-ID) ──
app.use(loggerMiddleware);

// ── API v1 routes ─────────────────────────────
// app.use('/api/v1/auth',       authRouter);
// app.use('/api/v1/brand',      brandRouter);
app.use('/api/v1/campaign',       campaignRouter);
app.use('/api/v1/kyc',            kycRouter);
app.use('/api/v1/admin/kyc',      kycAdminRouter);

// ── Centralised error handler (MUST be last) ──
app.use(errorHandler);

// ── PM2 cluster: graceful shutdown ────────────
process.on('SIGTERM', () => {
    console.log(JSON.stringify({ event: 'SIGTERM', message: 'Graceful shutdown initiated' }));
    process.exit(0);
});

export default app;
