const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = require('./app');
const db = require('./config/db');

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = app.listen(PORT, async () => {
  console.log('================================================================');
  console.log(`🏦  BankRetain Backend Service Active on http://localhost:${PORT}`);
  console.log(`📡  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('================================================================');

  // Verify database connectivity
  const dbStatus = await db.testConnection();
  if (dbStatus.success) {
    console.log(`✅  Connected to MySQL Database: ${db.dbConfig.database} @ ${db.dbConfig.host}:${db.dbConfig.port}`);
  } else {
    console.warn(`⚠️   MySQL Connection Note: ${dbStatus.error}`);
    console.warn('    To initialize database schema: npm run db:init');
    console.warn('    To seed demonstration data: npm run db:seed');
  }
});

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('Shutting down BankRetain server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down BankRetain server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
