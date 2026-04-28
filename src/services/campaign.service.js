const Campaign = require('../models/Campaign');
require('../models/Brand');

class CampaignService {
  async createCampaign(campaignData) {
    const campaign = new Campaign(campaignData);
    return await campaign.save();
  }

  async getCampaignsByBrand(brandId) {
    return await Campaign.find({ brandId }).sort({ createdAt: -1 }).lean();
  }

  async getCampaignById(id) {
    return await Campaign.findById(id).populate('brandId', 'name logo').lean();
  }

  async updateCampaign(id, updateData) {
    return await Campaign.findByIdAndUpdate(id, updateData, { new: true }).lean();
  }

  async deleteCampaign(id) {
    return await Campaign.findByIdAndDelete(id);
  }
}

module.exports = new CampaignService();
