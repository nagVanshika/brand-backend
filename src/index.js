const app = require('./app');
const connectDB = require('./config/db.config');
const env = require('./config/env.config');
const pino = require('pino')();

// Initialize Models (Ensures schemas are registered)
require('./models/User.model');
require('./models/Brand.model');
require('./models/BrandKYC.model');
require('./models/Campaign.model');
require('./models/Admin.model');
require('./models/CampaignRoster.model');

// Connect to Database
connectDB().then(() => {
  app.listen(env.PORT, () => {
    pino.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
});
