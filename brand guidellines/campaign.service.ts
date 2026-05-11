import mongoose from 'mongoose';
import CampaignModel, {
    ICampaign,
    CampaignStatus,
    BidStatus,
    StepStatus
} from '../models/Campaign.model';
import { AppError } from '../utils/errors.util';
import { buildPagination } from '../utils/paginate.util';

// ─────────────────────────────────────────────
// services/campaign.service.ts
// All campaign business logic and DB operations.
// Controllers call only these functions.
// ─────────────────────────────────────────────

// ── Types ─────────────────────────────────────

export interface CreateCampaignPayload {
    title:              string;
    description:        string;
    requirements?:      string[];
    payout_type:        'cash' | 'barter';
    min_payout?:        number;
    max_payout?:        number;
    barter_description?: string;
    min_follower_count?: number;
    platforms:          string[];
    creators_required?: number;
    start_date:         string;
    end_date:           string;
    steps?: Array<{
        title:             string;
        description?:      string;
        requires_approval: boolean;
        due_date?:         string;
    }>;
}

export interface ListCampaignFilter {
    page:    number;
    limit:   number;
    status?: CampaignStatus;
}

export interface UpdateCampaignPayload extends Partial<CreateCampaignPayload> {}

// ── Create ────────────────────────────────────

export async function createCampaign(
    brandId: string,
    payload: CreateCampaignPayload
): Promise<ICampaign> {
    if (payload.payout_type === 'cash') {
        if (!payload.min_payout && !payload.max_payout) {
            throw new AppError(
                'Cash campaigns must specify min_payout or max_payout.',
                422,
                'CAMPAIGN_PAYOUT_REQUIRED'
            );
        }
        if (payload.min_payout && payload.max_payout && payload.min_payout > payload.max_payout) {
            throw new AppError(
                'min_payout cannot exceed max_payout.',
                422,
                'CAMPAIGN_PAYOUT_INVALID'
            );
        }
    }

    if (new Date(payload.end_date) <= new Date(payload.start_date)) {
        throw new AppError('end_date must be after start_date.', 422, 'CAMPAIGN_DATE_INVALID');
    }

    const steps = (payload.steps ?? []).map(s => ({
        ...s,
        due_date:  s.due_date ? new Date(s.due_date) : undefined,
        status:    StepStatus.PENDING
    }));

    return CampaignModel.create({
        brand_id:           new mongoose.Types.ObjectId(brandId),
        title:              payload.title,
        description:        payload.description,
        requirements:       payload.requirements ?? [],
        payout_type:        payload.payout_type,
        min_payout:         payload.min_payout,
        max_payout:         payload.max_payout,
        barter_description: payload.barter_description,
        min_follower_count: payload.min_follower_count ?? 0,
        platforms:          payload.platforms,
        creators_required:  payload.creators_required ?? 1,
        start_date:         new Date(payload.start_date),
        end_date:           new Date(payload.end_date),
        status:             CampaignStatus.OPEN,
        steps,
        bids:               [],
        media:              []
    });
}

// ── List (own campaigns, paginated) ───────────

export async function listCampaigns(
    brandId: string,
    filter: ListCampaignFilter
) {
    const query: Record<string, any> = { brand_id: brandId };
    if (filter.status) query.status = filter.status;

    const skip  = (filter.page - 1) * filter.limit;
    const total = await CampaignModel.countDocuments(query);

    const items = await CampaignModel
        .find(query, 'title status payout_type platforms start_date end_date creators_required created_at')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(filter.limit)
        .lean();

    return { items, pagination: buildPagination(total, filter.page, filter.limit) };
}

// ── Single ────────────────────────────────────

export async function getCampaign(
    campaignId: string,
    brandId: string
): Promise<ICampaign> {
    const campaign = await CampaignModel.findOne({
        _id:      campaignId,
        brand_id: brandId
    }).lean();

    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
    return campaign as ICampaign;
}

// ── Update ────────────────────────────────────

export async function updateCampaign(
    campaignId: string,
    brandId:    string,
    payload:    UpdateCampaignPayload
): Promise<ICampaign> {
    const campaign = await CampaignModel.findOne({ _id: campaignId, brand_id: brandId });
    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

    if (campaign.status !== CampaignStatus.OPEN) {
        throw new AppError(
            'Only open campaigns can be updated.',
            422,
            'CAMPAIGN_NOT_EDITABLE'
        );
    }

    // Build $set payload — only include defined fields
    const $set: Record<string, any> = {};
    const allowed: Array<keyof UpdateCampaignPayload> = [
        'title', 'description', 'requirements', 'payout_type',
        'min_payout', 'max_payout', 'barter_description',
        'min_follower_count', 'platforms', 'creators_required',
        'start_date', 'end_date'
    ];

    for (const key of allowed) {
        if (payload[key] !== undefined) {
            $set[key] = key === 'start_date' || key === 'end_date'
                ? new Date(payload[key] as string)
                : payload[key];
        }
    }

    if (payload.steps) {
        $set.steps = payload.steps.map(s => ({
            ...s,
            due_date: s.due_date ? new Date(s.due_date) : undefined,
            status:   StepStatus.PENDING
        }));
    }

    const updated = await CampaignModel
        .findByIdAndUpdate(campaignId, { $set }, { new: true, runValidators: true })
        .lean();

    return updated as ICampaign;
}

// ── Soft delete (close) ───────────────────────

export async function closeCampaign(
    campaignId: string,
    brandId:    string
): Promise<void> {
    const campaign = await CampaignModel.findOne({ _id: campaignId, brand_id: brandId });
    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

    if (campaign.status === CampaignStatus.COMPLETED) {
        throw new AppError('Completed campaigns cannot be closed.', 422, 'CAMPAIGN_COMPLETED');
    }

    await CampaignModel.findByIdAndUpdate(campaignId, { $set: { status: CampaignStatus.CLOSED } });
}

// ── Media ─────────────────────────────────────

export async function addMedia(
    campaignId: string,
    brandId:    string,
    files:      Express.Multer.File[]
): Promise<ICampaign> {
    const campaign = await CampaignModel.findOne({ _id: campaignId, brand_id: brandId });
    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');
    if (campaign.status !== CampaignStatus.OPEN) {
        throw new AppError('Media can only be added to open campaigns.', 422, 'CAMPAIGN_NOT_OPEN');
    }

    const mediaItems = files.map(f => {
        const mimeType = f.mimetype;
        const mediaType = mimeType.startsWith('video') ? 'VIDEO'
            : mimeType === 'application/pdf'           ? 'DOCUMENT'
            : 'IMAGE';

        return {
            url:         (f as any).key ?? f.path,   // S3 key or local path
            media_type:  mediaType,
            file_name:   f.originalname,
            file_size:   f.size,
            mime_type:   mimeType,
            uploaded_at: new Date()
        };
    });

    campaign.media.push(...mediaItems as any);
    return campaign.save();
}

export async function removeMedia(
    campaignId: string,
    brandId:    string,
    mediaId:    string
): Promise<void> {
    const campaign = await CampaignModel.findOne({ _id: campaignId, brand_id: brandId });
    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

    const before = campaign.media.length;
    campaign.media = campaign.media.filter(m => m._id?.toString() !== mediaId) as any;
    if (campaign.media.length === before) {
        throw new AppError('Media not found.', 404, 'MEDIA_NOT_FOUND');
    }
    await campaign.save();
    // TODO: call storageService.delete(key, 'campaign') after save
}

// ── Bids ──────────────────────────────────────

export interface ListBidsFilter { page: number; limit: number; status?: BidStatus; }

export async function listBids(
    campaignId: string,
    brandId:    string,
    filter:     ListBidsFilter
) {
    // Verify ownership
    const exists = await CampaignModel.exists({ _id: campaignId, brand_id: brandId });
    if (!exists) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

    // Aggregate to paginate sub-array
    const matchBid: Record<string, any> = {};
    if (filter.status) matchBid['bids.status'] = filter.status;

    const [result] = await CampaignModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(campaignId) } },
        { $unwind: '$bids' },
        ...(filter.status ? [{ $match: { 'bids.status': filter.status } }] : []),
        { $group: { _id: null, bids: { $push: '$bids' }, total: { $sum: 1 } } },
        { $project: {
            total: 1,
            bids: { $slice: ['$bids', (filter.page - 1) * filter.limit, filter.limit] }
        }}
    ]);

    const bids  = result?.bids  ?? [];
    const total = result?.total ?? 0;
    return { items: bids, pagination: buildPagination(total, filter.page, filter.limit) };
}

export async function updateBidStatus(
    campaignId: string,
    brandId:    string,
    bidId:      string,
    status:     BidStatus.ACCEPTED | BidStatus.REJECTED
): Promise<void> {
    const campaign = await CampaignModel.findOne({ _id: campaignId, brand_id: brandId });
    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

    const bid = campaign.bids.find(b => b._id?.toString() === bidId);
    if (!bid) throw new AppError('Bid not found.', 404, 'BID_NOT_FOUND');
    if (bid.status !== BidStatus.PENDING) {
        throw new AppError('Only pending bids can be updated.', 422, 'BID_NOT_PENDING');
    }

    bid.status = status;
    await campaign.save();
    // TODO: emit event → notify bidder
}

// ── Steps ─────────────────────────────────────

export async function updateStepStatus(
    campaignId: string,
    brandId:    string,
    stepId:     string,
    status:     StepStatus,
    reviewNote?: string
): Promise<void> {
    const campaign = await CampaignModel.findOne({ _id: campaignId, brand_id: brandId });
    if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

    const step = campaign.steps.find(s => s._id?.toString() === stepId);
    if (!step) throw new AppError('Step not found.', 404, 'STEP_NOT_FOUND');

    step.status = status;
    if (status === StepStatus.APPROVED || status === StepStatus.REJECTED) {
        step.reviewed_at = new Date();
        step.review_note = reviewNote;
    }
    if (status === StepStatus.SUBMITTED) {
        step.submitted_at = new Date();
    }

    await campaign.save();
}
