const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  logo: { type: String },
  website: { type: String },
  industry: { type: String },
  gstNumber: { type: String, required: true, unique: true },
  cinNumber: { type: String, required: true, unique: true },
  billingAddress: { type: String },
  vibeTags: [{ type: String }],
  teamMembers: [{
    email: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Campaign Manager', 'Viewer'], default: 'Viewer' },
    status: { type: String, enum: ['Active', 'Disabled'], default: 'Active' }
  }],
  walletBalance: { type: Number, default: 0 },
  escrowBalance: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Brand', brandSchema);
