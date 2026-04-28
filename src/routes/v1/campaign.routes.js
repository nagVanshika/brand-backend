const express = require('express');
const router = express.Router();
const campaignController = require('../../controllers/campaign.controller');
const { verifyToken } = require('../../middleware/auth');

router.post('/', verifyToken, campaignController.createCampaign);
router.get('/', verifyToken, campaignController.getMyCampaigns);
router.get('/:id', verifyToken, campaignController.getCampaignDetails);

module.exports = router;
