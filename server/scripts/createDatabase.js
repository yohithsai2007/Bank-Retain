const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

async function initDatabase() {
  console.log('🚀 Starting BankRetain Database Initialization...');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'bankretain_db';

  console.log(`Connecting to MySQL server at ${host}:${port} as '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });
  } catch (err) {
    console.error('❌ Could not connect to MySQL server.');
    console.error(`Error details: ${err.message}`);
    console.error('\nPlease verify that:');
    console.error('1. MySQL 8.0 is running on port 3306.');
    console.error('2. Your DB_PASSWORD in .env matches your MySQL root password.');
    process.exit(1);
  }

  try {
    // 1. Create database if it does not exist
    console.log(`Creating database '${database}' if not exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    await connection.query(`USE \`${database}\``);
    console.log(`Using database '${database}'.`);

    // 2. Read schema.sql
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Executing database schema creation (17 tables)...');
    await connection.query(schemaSql);
    console.log('✅ Schema tables, indexes, and constraints verified.');

    // 3. Seed default scoring rules if empty
    const [ruleCount] = await connection.query('SELECT COUNT(*) AS count FROM scoring_rules');
    if (ruleCount[0].count === 0) {
      console.log('Inserting default transparent scoring rules...');
      const defaultRules = [
        ['RULE_TX_VOL_DECLINE', 'High Transaction Volume Decline', 'Triggered when month-over-month transaction volume declines by 25% or more.', 'Transactions', 30, 30, '>=', 25.0],
        ['RULE_BAL_DECLINE', 'High Operating Balance Decline', 'Triggered when operating balance declines by 20% or more compared to previous period.', 'Operating Balances', 25, 25, '>=', 20.0],
        ['RULE_COMPLAINTS_SEV', 'Repeated or Unresolved Service Complaints', 'Triggered when customer has unresolved critical complaints or multiple open service escalations.', 'Service Quality', 20, 20, '>=', 2.0],
        ['RULE_PROD_UTIL_DECLINE', 'Significant Product Utilization Decline', 'Triggered when credit/treasury facility utilization drops significantly or products become inactive.', 'Products', 15, 15, '>=', 20.0],
        ['RULE_SUSTAINED_PAYMENT_DECLINE', 'Sustained Payment Activity Decline', 'Triggered when payment activity has fallen below the 3-month moving average by 30% or sustained decline for 2+ months.', 'Activity Trends', 10, 10, '>=', 2.0],
      ];

      for (const r of defaultRules) {
        await connection.query(
          `INSERT INTO scoring_rules 
           (rule_code, rule_name, description, category, default_points, current_points, threshold_operator, threshold_value, is_active, scoring_version, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'v1.0', NOW())`,
          r
        );
      }
      console.log('✅ Default scoring rules seeded.');
    }

    // 4. Seed system users if empty
    const [userCount] = await connection.query('SELECT COUNT(*) AS count FROM users');
    if (userCount[0].count === 0) {
      console.log('Creating default system users...');
      const adminPass = await bcrypt.hash('Admin@123', 10);
      const rmPass = await bcrypt.hash('Rm@123', 10);
      const analystPass = await bcrypt.hash('Analyst@123', 10);

      await connection.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, status)
         VALUES 
          ('admin', 'admin@bankretain.internal', ?, 'Sarah Jenkins (Admin)', 'admin', 'active'),
          ('rm_sarah', 'marcus.v@bankretain.internal', ?, 'Marcus Vance (RM)', 'relationship_manager', 'active'),
          ('analyst_john', 'elena.r@bankretain.internal', ?, 'Elena Rostova (Analyst)', 'analytics_viewer', 'active')`,
        [adminPass, rmPass, analystPass]
      );
      console.log('✅ Default system users created.');
    }

    console.log('\n🎉 BankRetain Database Initialization Complete!');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
