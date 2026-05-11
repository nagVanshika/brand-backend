const campaignService = require('../../services/campaign.service');
const { sendSuccess } = require('../../utils/response.util');

/**
 * Campaign Controller
 */
class CampaignController {
  async createCampaign(req, res, next) {
    try {
      const brandId = req.user.brand_id;
      const result = await campaignService.createCampaign(brandId, req.body);
      sendSuccess(res, result, 'Campaign created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async listCampaigns(req, res, next) {
    try {
      const brandId = req.user.brand_id;
      const { page, limit, status } = req.query;
      const result = await campaignService.listCampaigns(brandId, { page, limit, status });
      sendSuccess(res, result, 'Campaigns retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCampaign(req, res, next) {
    try {
      const brandId = req.user.brand_id;
      const result = await campaignService.getCampaign(req.params.id, brandId);
      sendSuccess(res, result, 'Campaign details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateCampaign(req, res, next) {
    try {
      const brandId = req.user.brand_id;
      const result = await campaignService.updateCampaign(req.params.id, brandId, req.body);
      sendSuccess(res, result, 'Campaign updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCampaign(req, res, next) {
    try {
      const brandId = req.user.brand_id;
      await campaignService.deleteCampaign(req.params.id, brandId);
      sendSuccess(res, null, 'Campaign closed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CampaignController();
