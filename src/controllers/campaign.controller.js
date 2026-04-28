const campaignService = require('../services/campaign.service');

const createCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.createCampaign({
      ...req.body,
      brandId: req.user?.brandId
    });
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getMyCampaigns = async (req, res, next) => {
  try {
    const campaigns = await campaignService.getCampaignsByBrand(req.user.brandId);
    res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    next(error);
  }
};

const getCampaignDetails = async (req, res, next) => {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCampaign,
  getMyCampaigns,
  getCampaignDetails
};
