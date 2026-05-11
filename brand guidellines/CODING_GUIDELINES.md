# Backend Coding Guidelines
> Node.js · Express · MongoDB (Mongoose) · TypeScript
> These guidelines are the AI agent's constitution — every file it generates must pass this checklist.

---

## 0. Core Principles

| Principle        | Rule                                                                   |
|------------------|------------------------------------------------------------------------|
| Single purpose   | Every file does one thing. A service that does two things needs splitting. |
| Thin layers      | Controllers: I/O only. Services: logic only. Models: schema only.      |
| Explicit > Magic | No auto-wiring, no decorators, no "magic" imports. Every dependency is explicit. |
| Fail loudly      | Throw typed errors, never swallow them. Let the central handler format them. |
| Encrypt early    | Sensitive data is encrypted before it touches the DB. Never after.     |
| No direct model imports in controllers | Controllers call services. Services call models. |

---

## 1. File Naming Conventions

```
<domain>.<layer>.ts

auth.controller.ts
auth.service.ts
auth.routes.ts
auth.validator.ts
auth.constants.ts

campaign.controller.ts
campaign.service.ts
campaign.model.ts
```

**One domain per file.** If a file grows beyond 300 lines, it likely handles two domains — split it.

---

## 2. Folder Responsibilities (strict)

```
routes/v1/         → Define paths + wire middleware + call controller
controllers/v1/    → Extract params → call service → sendSuccess/sendError
services/          → Business logic + all DB operations
models/            → Mongoose schema + interface only. No pre/post hooks unless unavoidable.
middleware/        → Auth, logging, validation, file upload, guards
validators/        → Zod schemas + validateRequest factory
utils/             → Pure helpers (no DB, no side effects)
constants/         → Enums, allowed values, config constants
config/            → DB/Redis/env connection setup
jobs/              → Cron jobs (no business logic — call services)
scripts/           → One-time ops (migrations, seeds)
```

**Cross-layer calling rules:**
```
✅ route      → middleware → controller → service → model
❌ route      → model  (skip controller and service)
❌ controller → model  (skip service)
❌ service    → controller
❌ model      → service
```

---

## 3. Controller Pattern

Every controller method follows this exact shape:

```ts
export async function createCampaign(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brandId = (req as AuthRequest).user.brandId;
    const result  = await campaignService.createCampaign(brandId, req.body);
    sendSuccess(res, result, 'Campaign created', 201);
  } catch (err) {
    next(err);                           // Always forward — never format errors here
  }
}
```

**Rules:**
- No `if/else` logic
- No Mongoose calls
- No data transformation beyond what's needed to call the service
- Always `next(err)` in catch — never `res.status(500).json(...)`
- Return type is always `Promise<void>`

---

## 4. Service Pattern

```ts
// services/campaign.service.ts

export async function createCampaign(
  brandId: string,
  payload: CreateCampaignPayload
): Promise<ICampaign> {
  // 1. Business rule guards
  const brand = await BrandModel.findById(brandId).lean();
  if (!brand) throw new AppError('Brand not found', 404, 'BRAND_NOT_FOUND');

  // 2. Data transformation
  const data = buildCampaignDocument(brandId, payload);

  // 3. DB write
  return CampaignModel.create(data);
}
```

**Rules:**
- All DB calls are here — never in controllers or routes
- All `lean()` on reads unless you need Mongoose document methods
- Always throw `AppError` (or a subclass) — never `throw new Error('string')`
- Projection on every `find()` that returns a list
- Paginate every list query

---

## 5. Route Pattern

```ts
// routes/v1/campaign.routes.ts
import { Router } from 'express';
import * as ctrl from '../../controllers/v1/campaign.controller';
import { authMiddleware }   from '../../middleware/auth.middleware';
import { validateRequest }  from '../../middleware/validate.middleware';
import { storageMiddleware } from '../../middleware/storage.middleware';
import { createCampaignSchema, updateCampaignSchema } from '../../validators/campaign.validator';

const router = Router();
router.use(authMiddleware);                               // All routes require auth

router.post(  '/',     validateRequest(createCampaignSchema),  ctrl.createCampaign);
router.get(   '/',                                             ctrl.listCampaigns);
router.get(   '/:id',                                          ctrl.getCampaign);
router.put(   '/:id',  validateRequest(updateCampaignSchema),  ctrl.updateCampaign);
router.delete('/:id',                                          ctrl.deleteCampaign);

router.post(  '/:id/media',
  storageMiddleware({ module: 'campaign', field: 'file', maxCount: 5 }),
  ctrl.uploadMedia
);

export default router;
```

**Rules:**
- No logic in route files
- Middleware applied in order: auth → validate → guard → controller
- `storageMiddleware` wraps Multer — never call `multer()` directly on routes

---

## 6. Validator Pattern

```ts
// validators/campaign.validator.ts
import { z } from 'zod';
import { PayoutType, CampaignStatus } from '../constants/campaign.constants';

export const createCampaignSchema = z.object({
  body: z.object({
    title:       z.string().min(3).max(200),
    description: z.string().min(10),
    payout_type: z.nativeEnum(PayoutType),
    min_payout:  z.number().min(0).optional(),
    max_payout:  z.number().min(0).optional(),
    start_date:  z.string().datetime(),
    end_date:    z.string().datetime(),
    platforms:   z.array(z.enum(['instagram','youtube','linkedin','facebook','twitter','tiktok'])).min(1),
    steps:       z.array(z.object({
      title:            z.string().min(2),
      description:      z.string().optional(),
      requires_approval: z.boolean().default(false),
      due_date:         z.string().datetime().optional()
    })).optional()
  }).refine(d => !d.end_date || !d.start_date || d.end_date > d.start_date, {
    message: 'end_date must be after start_date'
  })
});

export const updateCampaignSchema = createCampaignSchema.deepPartial();
```

---

## 7. Response Standard

Always use the shared utilities. Never construct raw `res.json()` responses.

```ts
// utils/response.util.ts

sendSuccess(res, data, message, statusCode?)    // 200 default
sendError(res, errorCode, message, statusCode?) // 400 default

// Paginated response (inside data)
{
  items:      T[],
  pagination: { total, page, limit, totalPages }
}
```

---

## 8. Error Handling

```ts
// Throw from service:
throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');

// Domain-specific errors extend AppError:
export class CampaignClosedError extends AppError {
  constructor() {
    super('Campaign is closed for updates', 422, 'CAMPAIGN_CLOSED');
  }
}

// errorHandler middleware catches everything:
// - AppError instances → structured JSON with errorCode + traceId
// - Unknown errors     → 500 + generic message (no stack in prod)
```

Never:
```ts
// ❌ Don't do this
res.status(500).json({ message: err.message });
console.error(err.stack); // in a controller

// ❌ Don't do this
throw new Error('something went wrong');
```

---

## 9. Logging Rules

```ts
// Every request automatically gets:
req.traceId   = randomUUID();
req.startTime = process.hrtime();
res.setHeader('X-Trace-ID', req.traceId);

// Structured log emitted on res.finish:
{
  traceId, method, path, statusCode, durationMs, ip, userId?
}

// NEVER include in logs:
// password, otp, token, PAN, Aadhaar, account_number, upi_id, encryption keys
```

Use `pino` in production. Use structured `console.log(JSON.stringify(...))` in development.

---

## 10. DB Query Rules

```ts
// ✅ Read queries — always lean() + projection
const campaigns = await CampaignModel
  .find({ brand_id: brandId, status: 'OPEN' }, 'title status start_date end_date')
  .sort({ created_at: -1 })
  .skip(skip)
  .limit(limit)
  .lean();

// ✅ Write queries — return the updated doc
const campaign = await CampaignModel
  .findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });

// ❌ Never do full collection scans
await CampaignModel.find(); // missing filter on large collections

// ❌ Never nest loops over DB results
campaigns.forEach(async c => {
  const bids = await BidModel.find({ campaign_id: c._id }); // N+1 — use $lookup instead
});
```

---

## 11. Storage Middleware (pluggable)

```ts
// middleware/storage.middleware.ts
// Usage on any route that accepts files:
storageMiddleware({ module: 'kyc',      field: 'document', maxCount: 1 })
storageMiddleware({ module: 'campaign', field: 'file',     maxCount: 5 })

// Behaviour determined by FILE_STORAGE_DRIVER in .env:
// local → multer.diskStorage → /uploads/<module>/<userId>/<uuid>.<ext>
// s3    → multer.memoryStorage → storageService.upload() → S3 key stored in DB

// File access:
// local → GET /api/v1/files/:filename  (authenticated, streams file)
// s3    → storageService.getAccessUrl(key) → presigned URL (300s TTL)
```

---

## 12. Antigravity Usage (Multiple Prompts)

Since you're using Antigravity to generate modules, keep each prompt scoped to ONE layer or ONE domain. The AI will stay focused and not bleed concerns.

**Prompt strategy:**
```
Prompt 1 → "Generate auth.constants.ts + auth.validator.ts only"
Prompt 2 → "Generate auth.service.ts using the constants from prompt 1"
Prompt 3 → "Generate auth.controller.ts — thin, delegates to auth.service"
Prompt 4 → "Generate auth.routes.ts wiring the controller + validators"
Prompt 5 → "Generate campaign.model.ts schema only — no logic"
Prompt 6 → "Generate campaign.service.ts create + update + list functions"
```

**Always include in every Antigravity prompt:**
1. The relevant constants file
2. The response.util.ts interface
3. The AppError definition
4. The guideline rules for that layer (paste the relevant section above)

This gives the AI full context without sending the entire codebase.

---

## 13. Pre-commit Checklist

Before pushing any new module:

```
✔ API versioned under /api/v1/
✔ Controller methods are < 15 lines
✔ Service is the only layer touching the DB
✔ Zod schema exists in validators/ for every mutable endpoint
✔ lean() used on all read queries
✔ Projection used on all list queries
✔ Pagination on every list API
✔ AppError thrown (not raw Error)
✔ No console.log with PII
✔ sendSuccess/sendError used in all controller responses
✔ storageMiddleware used (not raw multer) for file uploads
✔ Index defined for every field used in a .find() filter
✔ New env vars documented in ARCHITECTURE.md §8
```
