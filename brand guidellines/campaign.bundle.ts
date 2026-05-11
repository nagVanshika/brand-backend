// ═══════════════════════════════════════════════════════════════
// controllers/v1/campaign.controller.ts
// ═══════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express';
import * as campaignService from '../../services/campaign.service';
import { sendSuccess } from '../../utils/response.util';
import { BidStatus } from '../../models/Campaign.model';

export async function createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const brandId  = (req as any).user.brandId;
        const campaign = await campaignService.createCampaign(brandId, req.body);
        sendSuccess(res, { campaignId: campaign._id }, 'Campaign created', 201);
    } catch (err) { next(err); }
}

export async function listCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const brandId = (req as any).user.brandId;
        const result  = await campaignService.listCampaigns(brandId, {
            page:   Number(req.query.page)  || 1,
            limit:  Number(req.query.limit) || 20,
            status: req.query.status as any
        });
        sendSuccess(res, result, 'Campaigns fetched');
    } catch (err) { next(err); }
}

export async function getCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const campaign = await campaignService.getCampaign(req.params.id, (req as any).user.brandId);
        sendSuccess(res, campaign, 'Campaign fetched');
    } catch (err) { next(err); }
}

export async function updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const updated = await campaignService.updateCampaign(
            req.params.id, (req as any).user.brandId, req.body
        );
        sendSuccess(res, updated, 'Campaign updated');
    } catch (err) { next(err); }
}

export async function deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await campaignService.closeCampaign(req.params.id, (req as any).user.brandId);
        sendSuccess(res, null, 'Campaign closed');
    } catch (err) { next(err); }
}

export async function uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const files = (req.files ?? (req.file ? [req.file] : [])) as Express.Multer.File[];
        if (!files.length) {
            res.status(400).json({ success: false, error: 'NO_FILES', message: 'No files uploaded' });
            return;
        }
        const campaign = await campaignService.addMedia(
            req.params.id, (req as any).user.brandId, files
        );
        sendSuccess(res, { media: campaign.media }, 'Media uploaded');
    } catch (err) { next(err); }
}

export async function removeMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await campaignService.removeMedia(req.params.id, (req as any).user.brandId, req.params.mediaId);
        sendSuccess(res, null, 'Media removed');
    } catch (err) { next(err); }
}

export async function listBids(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await campaignService.listBids(req.params.id, (req as any).user.brandId, {
            page:   Number(req.query.page)  || 1,
            limit:  Number(req.query.limit) || 20,
            status: req.query.status as any
        });
        sendSuccess(res, result, 'Bids fetched');
    } catch (err) { next(err); }
}

export async function updateBidStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await campaignService.updateBidStatus(
            req.params.id,
            (req as any).user.brandId,
            req.params.bidId,
            req.body.status as BidStatus.ACCEPTED | BidStatus.REJECTED
        );
        sendSuccess(res, null, `Bid ${req.body.status.toLowerCase()}`);
    } catch (err) { next(err); }
}

export async function updateStepStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await campaignService.updateStepStatus(
            req.params.id,
            (req as any).user.brandId,
            req.params.stepId,
            req.body.status,
            req.body.review_note
        );
        sendSuccess(res, null, 'Step updated');
    } catch (err) { next(err); }
}


// ═══════════════════════════════════════════════════════════════
// validators/campaign.validator.ts
// ═══════════════════════════════════════════════════════════════
import { z } from 'zod';

const PLATFORMS = ['instagram', 'youtube', 'linkedin', 'facebook', 'twitter', 'tiktok'] as const;
const PAYOUT_TYPES = ['cash', 'barter'] as const;

const stepSchema = z.object({
    title:             z.string().min(2).max(200),
    description:       z.string().max(1000).optional(),
    requires_approval: z.boolean().default(false),
    due_date:          z.string().datetime().optional()
});

export const createCampaignSchema = z.object({
    body: z.object({
        title:              z.string().min(3).max(200),
        description:        z.string().min(10),
        requirements:       z.array(z.string()).optional(),
        payout_type:        z.enum(PAYOUT_TYPES),
        min_payout:         z.number().min(0).optional(),
        max_payout:         z.number().min(0).optional(),
        barter_description: z.string().max(500).optional(),
        min_follower_count: z.number().min(0).optional(),
        platforms:          z.array(z.enum(PLATFORMS)).min(1),
        creators_required:  z.number().int().min(1).optional(),
        start_date:         z.string().datetime(),
        end_date:           z.string().datetime(),
        steps:              z.array(stepSchema).optional()
    }).refine(d => new Date(d.end_date) > new Date(d.start_date), {
        message: 'end_date must be after start_date',
        path: ['end_date']
    })
});

export const updateCampaignSchema = z.object({
    body: createCampaignSchema.shape.body.partial(),
    params: z.object({ id: z.string().length(24) })
});

export const updateBidStatusSchema = z.object({
    body:   z.object({ status: z.enum(['ACCEPTED', 'REJECTED']) }),
    params: z.object({ id: z.string().length(24), bidId: z.string().length(24) })
});

export const updateStepStatusSchema = z.object({
    body: z.object({
        status:      z.enum(['IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMPLETED']),
        review_note: z.string().max(500).optional()
    }),
    params: z.object({ id: z.string().length(24), stepId: z.string().length(24) })
});


// ═══════════════════════════════════════════════════════════════
// routes/v1/campaign.routes.ts
// ═══════════════════════════════════════════════════════════════
import { Router } from 'express';
import { authMiddleware }   from '../../middleware/auth.middleware';
import { validateRequest }  from '../../middleware/validate.middleware';
import { storageMiddleware } from '../../middleware/storage.middleware';
import * as ctrl from '../../controllers/v1/campaign.controller';
import {
    createCampaignSchema,
    updateCampaignSchema,
    updateBidStatusSchema,
    updateStepStatusSchema
} from '../../validators/campaign.validator';

export const campaignRouter = Router();
campaignRouter.use(authMiddleware);

// ── CRUD ──────────────────────────────────────
campaignRouter.post(  '/',     validateRequest(createCampaignSchema), ctrl.createCampaign);
campaignRouter.get(   '/',                                            ctrl.listCampaigns);
campaignRouter.get(   '/:id',                                         ctrl.getCampaign);
campaignRouter.put(   '/:id',  validateRequest(updateCampaignSchema), ctrl.updateCampaign);
campaignRouter.delete('/:id',                                         ctrl.deleteCampaign);

// ── Media ─────────────────────────────────────
campaignRouter.post(  '/:id/media',
    storageMiddleware({ module: 'campaign', field: 'file', maxCount: 5 }),
    ctrl.uploadMedia
);
campaignRouter.delete('/:id/media/:mediaId', ctrl.removeMedia);

// ── Bids ──────────────────────────────────────
campaignRouter.get('/:id/bids',                                               ctrl.listBids);
campaignRouter.put('/:id/bids/:bidId', validateRequest(updateBidStatusSchema), ctrl.updateBidStatus);

// ── Steps ─────────────────────────────────────
campaignRouter.put('/:id/steps/:stepId', validateRequest(updateStepStatusSchema), ctrl.updateStepStatus);
