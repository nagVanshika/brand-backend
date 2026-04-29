const mongoose = require('mongoose');
const { Schema } = mongoose;

const CampaignStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  COMPLETED: 'COMPLETED'
};

const BidderType = {
  CREATOR: 'CREATOR',
  AGENCY: 'AGENCY'
};

const BidStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN'
};

const StepStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED'
};

const MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  OTHER: 'OTHER'
};

const PayoutType = {
  CASH: 'cash',
  BARTER: 'barter'
};

const BidSchema = new Schema(
  {
    bidder_id: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'bids.bidder_type'
    },
    bidder_type: {
      type: String,
      enum: Object.values(BidderType),
      required: true
    },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String },
    status: {
      type: String,
      enum: Object.values(BidStatus),
      default: BidStatus.PENDING
    }
  },
  { 
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: 'updated_at' 
    }, 
    _id: true 
  }
);

const CampaignStepSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    requires_approval: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(StepStatus),
      default: StepStatus.PENDING
    },
    due_date: { type: Date },
    submitted_at: { type: Date },
    reviewed_at: { type: Date },
    review_note: { type: String }
  },
  { _id: true }
);

const CampaignMediaSchema = new Schema(
  {
    url: { type: String, required: true },
    media_type: {
      type: String,
      enum: Object.values(MediaType),
      required: true
    },
    file_name: { type: String },
    file_size: { type: Number },
    mime_type: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  },
  { _id: true }
);

const CampaignSchema = new Schema(
  {
    brand_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Brand', 
      required: true, 
      index: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    
    // Payout Logic
    payout_type: {
      type: String,
      enum: Object.values(PayoutType),
      required: true
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
    min_follower_count: { type: Number, default: 0 },
    platforms: [{ 
      type: String,
      enum: ['instagram', 'youtube', 'linkedin', 'facebook', 'twitter', 'tiktok']
    }],
    creators_required: { type: Number, default: 1 },

    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.OPEN
    },
    
    bids: { type: [BidSchema], default: [] },
    steps: { type: [CampaignStepSchema], default: [] },
    media: { type: [CampaignMediaSchema], default: [] }
  },
  { 
    timestamps: true 
  }
);

CampaignSchema.index({ 'bids.bidder_id': 1, 'bids.bidder_type': 1 });
CampaignSchema.index({ status: 1, start_date: 1, end_date: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
module.exports.CampaignStatus = CampaignStatus;
module.exports.BidderType = BidderType;
module.exports.BidStatus = BidStatus;
module.exports.StepStatus = StepStatus;
module.exports.MediaType = MediaType;
module.exports.PayoutType = PayoutType;
