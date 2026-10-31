const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const db = require('../config/db');
const { calculateAndSaveCustomerRisk } = require('../services/riskScoringService');
const { evaluateCustomerAlerts } = require('../services/alertService');
const { generateCustomerRecommendations } = require('../services/recommendationService');

async function recalculateAll() {
  console.log('🔄 Starting Full Portfolio Risk & Early Warning Recalculation...');
  try {
    const [customers] = await db.query(
      `SELECT id, company_name FROM customers WHERE account_status != 'Archived'`
    );

    console.log(`Found ${customers.length} active corporate customers.`);
    let count = 0;

    for (const c of customers) {
      await calculateAndSaveCustomerRisk(c.id);
      await evaluateCustomerAlerts(c.id);
      await generateCustomerRecommendations(c.id);
      count++;
      if (count % 25 === 0) {
        console.log(`Processed ${count}/${customers.length} customers...`);
      }
    }

    console.log(`✅ Successfully updated risk evaluations and alerts for ${count} customers.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Recalculation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  recalculateAll();
}

module.exports = recalculateAll;
