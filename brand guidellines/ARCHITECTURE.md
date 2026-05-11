# Brand Backend — Solution Architecture Plan
> Senior Solution Architect Document · Node.js + Express + MongoDB

---

## 1. Project Scaffold

```
src/
├── config/
│   ├── db.config.ts            # Mongoose connection + retry logic
│   ├── redis.config.ts         # Redis client (ioredis)
│   ├── env.config.ts           # Validated env vars (zod-env)
│   └── storage.config.ts       # Resolves FILE_STORAGE_DRIVER at boot
│
├── constants/
│   ├── kyc.constants.ts
│   ├── campaign.constants.ts
│   └── auth.constants.ts
│
├── controllers/
│   └── v1/
│       ├── auth.controller.ts
│       ├── brand.controller.ts
│       ├── kyc.controller.ts
│       ├── campaign.controller.ts
│       ├── team.controller.ts
│       └── upload.controller.ts
│
├── services/
│   ├── auth.service.ts
│   ├── brand.service.ts
│   ├── kyc.service.ts
│   ├── campaign.service.ts
│   ├── otp.service.ts
│   ├── storage.service.ts      # Pluggable: local | S3
│   └── mail.service.ts
│
├── models/
│   ├── Admin.model.ts
│   ├── Brand.model.ts
│   ├── BrandKYC.model.ts
│   ├── User.model.ts
│   ├── Campaign.model.ts
│   ├── CampaignRoster.model.ts
│   └── OTPStore.model.ts
│
├── routes/
│   └── v1/
│       ├── index.ts            # Aggregates all v1 routes
│       ├── auth.routes.ts
│       ├── brand.routes.ts
│       ├── kyc.routes.ts
│       ├── campaign.routes.ts
│       ├── team.routes.ts
│       ├── upload.routes.ts
│       └── admin/
│           └── kyc.routes.ts
│
├── middleware/
│   ├── logger.middleware.ts    # traceId + hrtime + X-Trace-ID
│   ├── auth.middleware.ts      # JWT verify
│   ├── errorHandler.middleware.ts
│   ├── rateLimiter.middleware.ts
│   ├── storage.middleware.ts   # Multer + driver resolver
│   ├── kyc.middleware.ts       # edit-lock + admin-only guards
│   └── validate.middleware.ts  # Zod schema runner
│
├── validators/
│   ├── auth.validator.ts
│   ├── brand.validator.ts
│   ├── kyc.validator.ts
│   └── campaign.validator.ts
│
├── utils/
│   ├── response.util.ts        # sendSuccess / sendError
│   ├── crypto.util.ts          # AES-256-CBC encrypt/decrypt
│   ├── storage.util.ts         # LocalStorageService / S3StorageService
│   ├── paginate.util.ts        # reusable pagination helper
│   └── errors.util.ts          # AppError hierarchy
│
├── jobs/
│   └── otp.cleanup.job.ts      # Cron: purge expired OTPs
│
├── scripts/
│   └── migrate-files-to-s3.ts  # One-time migration script
│
└── index.ts                    # App bootstrap
```

---

## 2. Infrastructure


### Compression
```ts
import compression from 'compression';
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024   // Only compress responses > 1KB
}));
```

### Security stack (applied in order)
```
helmet()            → sets 14 security headers
mongoSanitize()     → strips $ and . from req.body/params
cors()              → whitelist origins from env
compression()       → gzip/br response bodies
rateLimiter         → per-route limits (see below)
loggerMiddleware    → traceId + execution time
authMiddleware      → JWT verify (applied per-router)
validateRequest     → Zod schema per route
```

---

## 3. Feature Modules

### 3.1 Auth — Email + OTP Flow

```
POST /api/v1/auth/request-otp    → OTP generated, stored in Redis (TTL 5 min), emailed
POST /api/v1/auth/verify-otp     → OTP checked → JWT issued (access 15m + refresh 7d)
POST /api/v1/auth/refresh         → Rotate access token using refresh token
POST /api/v1/auth/logout          → Blacklist refresh token
```

OTP strategy:
- 6-digit numeric OTP
- SHA-256 hashed before storing in Redis
- Key: `otp:<email>` with TTL 300s
- Max 3 attempts before key deleted (brute-force guard)
- Resend throttle: 1 per 60s (separate Redis key `otp:lock:<email>`)

JWT strategy:
- Access token: 15 min, signed with RS256 private key
- Refresh token: 7 days, stored in httpOnly cookie (web) or body (mobile)
- Brand ID + role embedded in payload

### 3.2 Brand KYC

```
POST   /api/v1/kyc               → Submit KYC details (blocked if approved)
POST   /api/v1/kyc/documents     → Upload document (multer → storage driver)
GET    /api/v1/kyc               → Own KYC status + docs
GET    /api/v1/kyc/details       → Own KYC decrypted (settings view)

GET    /api/v1/admin/kyc         → List all (paginated, filterable)
GET    /api/v1/admin/kyc/:id     → Detail (auto → UNDER_REVIEW on open)
PUT    /api/v1/admin/kyc/:id/approve
PUT    /api/v1/admin/kyc/:id/reject       → remark required
PUT    /api/v1/admin/kyc/:id/request-info → remark required
```

KYC status lifecycle: NOT_STARTED → PENDING_REVIEW → UNDER_REVIEW → APPROVED | REJECTED | NEEDS_INFO

Encryption: AES-256-CBC on all PII fields. Encrypt in service layer, not in model hooks.
Lock: isEditable = false once APPROVED — enforced by kycEditLock middleware + service guard.

### 3.3 Campaign — Create & Update

```
POST   /api/v1/campaign          → Create campaign (brand auth required)
GET    /api/v1/campaign          → List own campaigns (paginated)
GET    /api/v1/campaign/:id      → Single campaign
PUT    /api/v1/campaign/:id      → Update (only if status = OPEN)
DELETE /api/v1/campaign/:id      → Soft delete (status → CLOSED)
POST   /api/v1/campaign/:id/media → Upload media assets
DELETE /api/v1/campaign/:id/media/:mediaId

GET    /api/v1/campaign/:id/bids         → List bids (paginated)
PUT    /api/v1/campaign/:id/bids/:bidId  → Accept / reject bid

GET    /api/v1/campaign/:id/steps
PUT    /api/v1/campaign/:id/steps/:stepId → Update step status
```

### 3.4 File Storage (pluggable)

Controlled by `FILE_STORAGE_DRIVER` env var.
- `local` → Multer DiskStorage → `/uploads/<module>/<userId>/<uuid>.<ext>`
- `s3`    → Multer MemoryStorage → `s3.putObject()` → returns S3 key

`storageService.getAccessUrl(key)`:
- local → `/api/v1/files/<filename>` (served via authenticated route)
- s3    → `getSignedUrl()` with 300s TTL

---

## 4. Logging Standard (every request)

```ts
// loggerMiddleware applies globally before all routes
{
  traceId:    randomUUID(),        // unique per request
  method:     req.method,
  path:       req.originalUrl,
  statusCode: res.statusCode,
  durationMs: hrtime delta,        // process.hrtime() start + finish
  ip:         req.ip,
  userId:     req.user?.id         // after auth, if available
}
// Response header: X-Trace-ID: <traceId>
// NEVER log: body, password, token, OTP, PAN, Aadhaar
```

---

## 5. Response Shape (all endpoints)

```ts
// Success
{ success: true,  data: T,      message: string }

// Error
{ success: false, error: string, message: string, traceId: string }

// Paginated list (inside data)
{ items: T[], pagination: { total, page, limit, totalPages } }
```

---

## 6. Rate Limits

| Route group              | Window    | Max requests |
|--------------------------|-----------|--------------|
| All /api/v1/*            | 15 min    | 100          |
| POST /auth/request-otp   | 60 sec    | 1            |
| POST /auth/verify-otp    | 5 min     | 5            |
| POST /kyc (submit)       | 24 hours  | 5            |
| POST /campaign           | 1 hour    | 20           |

---

## 7. Database Indexes (beyond model-level)

```ts
// Queries that need compound indexes:
Campaign:      { brand_id: 1, status: 1, created_at: -1 }
Campaign:      { 'bids.bidder_id': 1, 'bids.bidder_type': 1 }
BrandKYC:      { kyc_status: 1, created_at: 1 }
User:          { brand_id: 1, role: 1 }
OTPStore:      { email: 1, expires_at: 1 }   // TTL index on expires_at
```

---

## 8. Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
FILE_STORAGE_DRIVER=local           # local | s3

# Database
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://...

# Auth
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
KYC_ENCRYPTION_KEY=<64-char hex>    # 32 bytes AES-256

# Storage — local
UPLOAD_DIR=uploads

# Storage — S3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_KYC_BUCKET=brand-kyc-docs
S3_CAMPAIGN_BUCKET=brand-campaign-media

# Mail
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=noreply@athlory.com

# CORS
ALLOWED_ORIGINS=https://app.athlory.com,https://admin.athlory.com
```

---

## 9. AI Prompt Checklist (per module)

Before generating any module, AI must confirm:

```
✔ Route versioned under /api/v1/
✔ Controller is thin — no logic, calls service only
✔ Service owns all DB operations and business logic
✔ All list APIs have pagination (?page, ?limit)
✔ lean() used on all read queries with projection
✔ Zod validator schema created in validators/
✔ validateRequest middleware applied on route
✔ sendSuccess / sendError used in every controller method
✔ AppError (typed) thrown from service, caught by errorHandler
✔ No sensitive data in logs or responses
✔ Storage calls go through storageService (never direct multer.diskStorage)
✔ Indexes defined for all frequently filtered fields
```
