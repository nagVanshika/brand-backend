const Campaign = require('../models/Campaign.model');
const AppError = require('../utils/AppError');

class CampaignService {
  /**
   * Create a new campaign
   */
  async createCampaign(brandId, payload) {
    const data = {
      ...payload,
      brand_id: brandId
    };
    
    return await Campaign.create(data);
  }

  /**
   * List campaigns for a brand with pagination
   */
  async listCampaigns(brandId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const filter = { brand_id: brandId };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Campaign.find(filter, 'title status start_date end_date payout_type')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Campaign.countDocuments(filter)
    ]);

    return {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single campaign by ID
   */
  async getCampaign(id, brandId) {
    const campaign = await Campaign.findOne({ _id: id, brand_id: brandId })
      .populate('brand_id', 'name logo')
      .lean();

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }

    return campaign;
  }

  /**
   * Update campaign (only if OPEN)
   */
  async updateCampaign(id, brandId, payload) {
    const campaign = await Campaign.findOne({ _id: id, brand_id: brandId });

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }

    if (campaign.status !== 'OPEN') {
      throw new AppError('Only OPEN campaigns can be updated', 422, 'CAMPAIGN_CLOSED');
    }

    return await Campaign.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).lean();
  }

  /**
   * Soft delete campaign
   */
  async deleteCampaign(id, brandId) {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, brand_id: brandId },
      { status: 'CLOSED' },
      { new: true }
    );

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }

    return campaign;
  }
}

module.exports = new CampaignService();
