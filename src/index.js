const app = require('./app');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('./models/User');
require('./models/Brand');
require('./models/Campaign');

dotenv.config();

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/khikhi_brand';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });
