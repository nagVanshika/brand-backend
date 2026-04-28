const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Campaign Manager', 'Viewer'], default: 'Admin' },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  isEmailVerified: { type: Boolean, default: false },
  otp: {
    code: String,
    expiresAt: Date
  },
  lastLogin: Date
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
