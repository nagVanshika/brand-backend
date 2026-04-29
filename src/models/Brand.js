const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  company_name: {
    type: String,
    required: true
  },
  registration_type: {
    type: String,
    enum: ['brand', 'brand_agency'],
    required: true
  },
  has_gst: {
    type: Boolean,
    default: false
  },
  has_cin: {
    type: Boolean,
    default: false
  },
  logo: {
    type: String
  },
  website: {
    type: String
  },
  industry: {
    type: String
  },
  vibe_tags: [{
    type: String
  }],
  team_members: [{
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'campaign_manager', 'viewer'],
      default: 'viewer'
    },
    permissions: [{
      type: String
    }], // Assigned by admin
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active'
    }
  }],
  wallet_balance: {
    type: Number,
    default: 0
  },
  escrow_balance: {
    type: Number,
    default: 0
  },
  brand_kyc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brand_kyc'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Brand', brandSchema);
