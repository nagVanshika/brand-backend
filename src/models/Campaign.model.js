const mongoose = require('mongoose');
const { Schema } = mongoose;

const CampaignStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  COMPLETED: 'COMPLETED'
};

const PayoutType = {
  CASH: 'cash',
  BARTER: 'barter'
};

const CampaignSchema = new Schema({
  brand_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Brand', 
    required: true, 
    index: true 
  },
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  requirements: [{ 
    type: String 
  }],
  
  // Payout Logic
  payout_type: {
    type: String,
    enum: Object.values(PayoutType),
    required: true,
    index: true
  },
  min_payout: { 
    type: Number, 
    min: 0
  },
  max_payout: { 
    type: Number, 
    min: 0
  },
  barter_description: {
    type: String
  },

  // Creator Requirements
  min_follower_count: { 
    type: Number, 
    default: 0 
  },
  platforms: [{ 
    type: String,
    enum: ['instagram', 'youtube', 'linkedin', 'facebook', 'twitter', 'tiktok']
  }],
  creators_required: { 
    type: Number, 
    default: 1 
  },

  start_date: { 
    type: Date, 
    required: true 
  },
  end_date: { 
    type: Date, 
    required: true 
  },
  status: {
    type: String,
    enum: Object.values(CampaignStatus),
    default: CampaignStatus.OPEN,
    index: true
  },
  
  // Sub-documents
  bids: [{
    bidder_id: { type: Schema.Types.ObjectId, required: true },
    bidder_type: { type: String, enum: ['CREATOR', 'AGENCY'], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'PENDING' },
    created_at: { type: Date, default: Date.now }
  }],
  steps: [{
    title: { type: String, required: true },
    description: { type: String },
    requires_approval: { type: Boolean, default: false },
    status: { type: String, default: 'PENDING' },
    due_date: { type: Date }
  }],
  media: [{
    url: { type: String, required: true },
    media_type: { type: String, required: true },
    file_name: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Compound indexes
CampaignSchema.index({ brand_id: 1, status: 1, created_at: -1 });
CampaignSchema.index({ 'bids.bidder_id': 1, 'bids.bidder_type': 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
