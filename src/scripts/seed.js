const mongoose = require('mongoose');
const Brand = require('../models/Brand');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/khikhi_brand');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Brand.deleteMany({});
    await User.deleteMany({});

    // 1. Create a Brand
    const brand = await Brand.create({
      name: 'Khi Khi Labs',
      gstNumber: '22AAAAA0000A1Z5',
      cinNumber: 'U00000MH0000PTC000000',
      industry: 'Technology',
      vibeTags: ['Minimalist', 'Tech-focused'],
      walletBalance: 5000000
    });

    // 2. Create an Admin User
    const user = await User.create({
      email: 'admin@khikhi.com',
      password: 'password123', // This will be hashed by the pre-save hook
      brandId: brand._id,
      role: 'Admin',
      isEmailVerified: true
    });

    console.log('Seeding complete!');
    console.log('--- TEST CREDENTIALS ---');
    console.log('Email: admin@khikhi.com');
    console.log('Password: password123');
    console.log('Brand ID:', brand._id);
    console.log('------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
