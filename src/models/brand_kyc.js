const mongoose = require('mongoose');

const kycStatusEnum = ['pending', 'verified', 'rejected'];

const brandKycSchema = new mongoose.Schema({
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    unique: true
  },
  company_name: {
    type: String
  },
  documents: {
    gst: {
      number: { type: String, unique: true, sparse: true },
      file_url: { type: String },
      status: { type: String, enum: kycStatusEnum, default: 'pending' }
    },
    cin: {
      number: { type: String, unique: true, sparse: true },
      file_url: { type: String },
      status: { type: String, enum: kycStatusEnum, default: 'pending' }
    },
    pan: {
      number: { type: String },
      file_url: { type: String },
      status: { type: String, enum: kycStatusEnum, default: 'pending' }
    }
  },
  other_documents: [{
    document_name: { type: String },
    file_url: { type: String },
    status: { type: String, enum: kycStatusEnum, default: 'pending' }
  }],
  billing_address: {
    address_line_1: { type: String },
    address_line_2: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' }
  },
  kyc_status: {
    type: String,
    enum: kycStatusEnum,
    default: 'pending'
  },
  remarks: {
    type: String
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('brand_kyc', brandKycSchema);
