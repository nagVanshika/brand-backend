const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const campaignRoutes = require('./campaign.routes');

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);

module.exports = router;
