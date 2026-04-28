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

const BidSchema = new Schema(
  {
    bidderId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'bids.bidderType'
    },
    bidderType: {
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
  { timestamps: true, _id: true }
);

const CampaignStepSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    requiresApproval: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(StepStatus),
      default: StepStatus.PENDING
    },
    dueDate: { type: Date },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewNote: { type: String }
  },
  { _id: true }
);

const CampaignMediaSchema = new Schema(
  {
    url: { type: String, required: true },
    mediaType: {
      type: String,
      enum: Object.values(MediaType),
      required: true
    },
    fileName: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const CampaignSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    minBid: { type: Number, min: 0 },
    maxBid: { type: Number, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.OPEN
    },
    rosterSelection: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bids: { type: [BidSchema], default: [] },
    steps: { type: [CampaignStepSchema], default: [] },
    media: { type: [CampaignMediaSchema], default: [] }
  },
  { timestamps: true }
);

CampaignSchema.index({ 'bids.bidderId': 1, 'bids.bidderType': 1 });
CampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
module.exports.CampaignStatus = CampaignStatus;
module.exports.BidderType = BidderType;
module.exports.BidStatus = BidStatus;
module.exports.StepStatus = StepStatus;
module.exports.MediaType = MediaType;
