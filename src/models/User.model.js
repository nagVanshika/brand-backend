const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    lowercase: true
  },
  role: { 
    type: String, 
    enum: ['admin', 'campaign_manager', 'viewer'], 
    default: 'admin' 
  },
  brand_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Brand',
    index: true
  },
  is_email_verified: { 
    type: Boolean, 
    default: false 
  },
  last_login: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active'
  }
}, { 
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  } 
});

// Compound index for brand-role lookups
userSchema.index({ brand_id: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
