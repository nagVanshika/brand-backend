const mongoose = require('mongoose');
const { Schema } = mongoose;

const campaignRosterSchema = new Schema(
  {
    campaign_id: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    agency_id: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true
    },
    roster_selection: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed'],
      default: 'active'
    },
    remarks: { type: String }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CampaignRoster', campaignRosterSchema);
