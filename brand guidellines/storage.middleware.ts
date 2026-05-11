import multer, { FileFilterCallback, StorageEngine } from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { AppError } from '../utils/errors.util';

// ─────────────────────────────────────────────
// middleware/storage.middleware.ts
//
// Pluggable file upload middleware.
// Switch between local disk and AWS S3 using:
//   FILE_STORAGE_DRIVER=local  (default)
//   FILE_STORAGE_DRIVER=s3
//
// No other code changes required to switch drivers.
// storageService.getAccessUrl() handles URL resolution.
// ─────────────────────────────────────────────

// ── Config ────────────────────────────────────

const DRIVER        = (process.env.FILE_STORAGE_DRIVER ?? 'local') as 'local' | 's3';
const UPLOAD_DIR    = process.env.UPLOAD_DIR ?? 'uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'application/pdf',
    'video/mp4', 'video/quicktime'
];

// ── S3 client (lazy-initialised) ──────────────

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
    if (!_s3Client) {
        _s3Client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
    }
    return _s3Client;
}

// ── Helpers ───────────────────────────────────

function buildFileName(
    userId: string,
    module: string,
    originalName: string
): string {
    const ext = path.extname(originalName).toLowerCase();
    return `${userId}-${randomUUID()}${ext}`;
}

function buildStorageKey(module: string, fileName: string): string {
    return `${module}/${fileName}`;
}

function fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
): void {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(
            `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, PDF, MP4.`,
            415,
            'INVALID_FILE_TYPE'
        ));
    }
}

// ── Local storage engine ──────────────────────

function buildLocalStorage(module: string): StorageEngine {
    const dest = path.join(UPLOAD_DIR, module);
    fs.mkdirSync(dest, { recursive: true });

    return multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, dest),
        filename: (req, file, cb) => {
            const userId = (req as any).user?.id ?? 'anon';
            cb(null, buildFileName(userId, module, file.originalname));
        }
    });
}

// ── S3 storage engine ─────────────────────────

function buildS3Storage(module: string): StorageEngine {
    const bucket = process.env[`S3_${module.toUpperCase()}_BUCKET`]
        ?? process.env.S3_DEFAULT_BUCKET;

    if (!bucket) {
        throw new AppError(
            `S3 bucket env var not set for module: ${module}`,
            500,
            'STORAGE_CONFIG_ERROR'
        );
    }

    return multerS3({
        s3: getS3Client(),
        bucket,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const userId = (req as any).user?.id ?? 'anon';
            const fileName = buildFileName(userId, module, file.originalname);
            const key = buildStorageKey(module, fileName);
            cb(null, key);
        }
    });
}

// ── Public: storageMiddleware factory ─────────

export interface StorageMiddlewareOptions {
    module:    string;    // 'kyc' | 'campaign' | 'brand' etc.
    field:     string;    // multipart field name
    maxCount?: number;    // 1 (default) or more for multiple files
}

/**
 * Use this on any route that accepts file uploads.
 * It resolves the correct Multer engine from FILE_STORAGE_DRIVER.
 *
 * @example
 * router.post('/documents',
 *   storageMiddleware({ module: 'kyc', field: 'document', maxCount: 1 }),
 *   kycController.uploadDocument
 * );
 */
export function storageMiddleware(opts: StorageMiddlewareOptions) {
    const { module, field, maxCount = 1 } = opts;

    const storage = DRIVER === 's3'
        ? buildS3Storage(module)
        : buildLocalStorage(module);

    const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });
    const handler = maxCount === 1 ? upload.single(field) : upload.array(field, maxCount);

    return (req: Request, res: Response, next: NextFunction): void => {
        handler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('File too large. Maximum size is 5MB.', 413, 'FILE_TOO_LARGE'));
                }
                return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
            }
            if (err) return next(err);
            next();
        });
    };
}

// ── Public: storageService ────────────────────
// Centralised file access — never expose raw paths/keys to the client.

export const storageService = {
    /**
     * Returns a URL the client can use to access the file.
     * local → authenticated API route
     * s3    → presigned GET URL (300s TTL)
     */
    async getAccessUrl(
        storageKey: string,
        module: string
    ): Promise<string> {
        if (DRIVER === 's3') {
            const bucket = process.env[`S3_${module.toUpperCase()}_BUCKET`]
                ?? process.env.S3_DEFAULT_BUCKET ?? '';
            return getSignedUrl(
                getS3Client(),
                new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
                { expiresIn: 300 }
            );
        }
        // Local: serve through authenticated file route
        const fileName = path.basename(storageKey);
        return `/api/v1/files/${module}/${fileName}`;
    },

    /**
     * Delete a file.
     * local → fs.unlink
     * s3    → DeleteObjectCommand
     */
    async delete(storageKey: string, module: string): Promise<void> {
        if (DRIVER === 's3') {
            const bucket = process.env[`S3_${module.toUpperCase()}_BUCKET`]
                ?? process.env.S3_DEFAULT_BUCKET ?? '';
            await getS3Client().send(
                new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })
            );
            return;
        }
        // Local
        const fullPath = path.join(UPLOAD_DIR, module, path.basename(storageKey));
        try {
            await fs.promises.unlink(fullPath);
        } catch {
            // Ignore ENOENT on delete
        }
    },

    /**
     * Returns the storage key to persist in the DB.
     * local → relative path: uploads/kyc/<filename>
     * s3    → S3 object key:  kyc/<filename>
     * In both cases this is what gets stored in filePath / url fields.
     */
    resolveStoredKey(file: Express.Multer.File): string {
        if (DRIVER === 's3') {
            return (file as any).key; // multer-s3 sets this
        }
        return file.path; // multer.diskStorage sets this
    },

    getDriver(): 'local' | 's3' {
        return DRIVER;
    }
};
