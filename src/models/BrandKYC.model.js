const mongoose = require('mongoose');

const kycStatusEnum = ['NOT_STARTED', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_INFO'];

const brandKycSchema = new mongoose.Schema({
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    unique: true,
    index: true
  },
  company_name: {
    type: String,
    required: true
  },
  // Documents (URLs and metadata)
  documents: {
    gst: {
      number: { type: String, sparse: true },
      file_url: { type: String },
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
    },
    cin: {
      number: { type: String, sparse: true },
      file_url: { type: String },
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
    },
    pan: {
      number: { type: String },
      file_url: { type: String },
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
    }
  },
  other_documents: [{
    document_name: { type: String },
    file_url: { type: String },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  }],
  // Billing Address
  billing_address: {
    address_line_1: { type: String },
    address_line_2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' }
  },
  // Review Status
  kyc_status: {
    type: String,
    enum: kycStatusEnum,
    default: 'NOT_STARTED',
    index: true
  },
  is_editable: {
    type: Boolean,
    default: true
  },
  remarks: {
    type: String
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewed_at: {
    type: Date
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Compound indexes for admin dashboard
brandKycSchema.index({ kyc_status: 1, created_at: 1 });

module.exports = mongoose.model('BrandKYC', brandKycSchema);
