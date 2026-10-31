/**
 * BankRetain: Synthetic Demonstration Data Generator
 * 
 * Generates ~250 realistic corporate banking customers with 12 months of
 * transaction and operating balance histories, product utilization profiles,
 * service complaints, early-warning alerts, retention tasks, and RCT campaigns.
 * 
 * Deterministic pseudo-random number generator (fixed seed 42) ensures exact reproducibility.
 * All records marked with is_synthetic_demonstration = TRUE.
 */

const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');
const { calculateAndSaveCustomerRisk } = require('../services/riskScoringService');
const { evaluateCustomerAlerts } = require('../services/alertService');
const { generateCustomerRecommendations } = require('../services/recommendationService');
const { assignCustomersToCampaign } = require('../services/campaignService');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// Simple Mulberry32 deterministic PRNG
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(42);

function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const INDUSTRIES = [
  'Manufacturing',
  'Technology & Telecom',
  'Healthcare & Pharma',
  'Wholesale & Retail',
  'Energy & Utilities',
  'Logistics & Transportation',
  'Financial Services',
  'Construction & Real Estate',
  'Hospitality & Leisure',
  'Agriculture & Food',
];

const SEGMENTS = ['Enterprise', 'Mid-Corporate', 'Commercial', 'SME Corporate'];
const REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM', 'National'];
const CREDIT_RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'];

const COMPANY_PREFIXES = [
  'Apex', 'Vanguard', 'Omni', 'Summit', 'Global', 'Beacon', 'Horizon', 'Titan',
  'Pinnacle', 'Sterling', 'Atlas', 'Quantum', 'Nexus', 'Pacific', 'Crest',
  'Meridian', 'Cobalt', 'Integra', 'Vortex', 'Starlight', 'Aero', 'Solaris',
  'Nordic', 'Sovereign', 'Endeavor', 'Optima', 'Centurion', 'Zenith', 'Trident',
  'Boreal', 'Synergy', 'Valence', 'Astra', 'Frontier', 'Kinetics', 'Paramount'
];

const COMPANY_SUFFIXES = [
  'Technologies Ltd', 'Logistics Corp', 'Holdings Inc', 'Manufacturing AG',
  'Energy Partners', 'Pharmaceuticals Ltd', 'Solutions Group', 'Global Industries',
  'Supply Chain PLC', 'Engineering Co', 'Capital Management', 'Materials Corp',
  'Consumer Goods Inc', 'Networks Ltd', 'Systems International', 'Ventures Inc'
];

const PRODUCT_CATEGORIES = [
  'Current Accounts',
  'Cash Management',
  'Trade Finance',
  'Working Capital Facilities',
  'Term Loans',
  'Treasury Services',
  'International Payments',
  'Other Corporate Banking Products',
];

const COMPLAINT_CATEGORIES = [
  'Payment Processing',
  'Digital Banking Access',
  'Fee Dispute',
  'Trade Finance Delay',
  'FX / Treasury Execution',
  'Relationship Management',
  'Account Servicing',
];

async function seedDatabase() {
  console.log('🌱 Starting BankRetain Synthetic Demonstration Seed Generation...');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'bankretain_db';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Ensure Relationship Managers exist
    const [existingRms] = await connection.query('SELECT COUNT(*) as count FROM relationship_managers');
    if (existingRms[0].count === 0) {
      console.log('Seeding 6 Relationship Managers...');
      const rms = [
        ['Marcus Vance', 'marcus.v@bankretain.internal', '+1-212-555-0111', 'Commercial Banking', 'North America'],
        ['Elena Rostova', 'elena.r@bankretain.internal', '+44-20-7946-0122', 'Global Corporate Banking', 'EMEA'],
        ['Kenji Tanaka', 'kenji.t@bankretain.internal', '+81-3-5555-0133', 'Asian Commercial Banking', 'APAC'],
        ['Gabriela Silva', 'gabriela.s@bankretain.internal', '+55-11-5555-0144', 'Latin America Treasury', 'LATAM'],
        ['David O’Connor', 'david.o@bankretain.internal', '+1-312-555-0155', 'Mid-Corporate Banking', 'National'],
        ['Amina Al-Mansoor', 'amina.m@bankretain.internal', '+971-4-555-0166', 'Middle East & Africa Commercial', 'EMEA'],
      ];
      for (const rm of rms) {
        await connection.query(
          `INSERT INTO relationship_managers (name, email, phone, department, region, active_accounts_count, created_at)
           VALUES (?, ?, ?, ?, ?, 0, NOW())`,
          rm
        );
      }
    }

    const [allRms] = await connection.query('SELECT id FROM relationship_managers');
    const rmIds = allRms.map(r => r.id);

    // 2. Generate ~250 Corporate Customers
    const customerCount = 250;
    console.log(`Generating ${customerCount} synthetic corporate customers...`);

    const months = [
      '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
      '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'
    ];

    const customerProfiles = [];

    for (let i = 1; i <= customerCount; i++) {
      const custId = `CUST-${1000 + i}`;
      const prefix = randChoice(COMPANY_PREFIXES);
      const suffix = randChoice(COMPANY_SUFFIXES);
      const companyName = `${prefix} ${suffix}`;
      const regNumber = `REG-${2020 + (i % 6)}-${100000 + i}`;
      const industry = randChoice(INDUSTRIES);
      const segment = randChoice(SEGMENTS);
      const region = randChoice(REGIONS);
      const rmId = randChoice(rmIds);
      const creditRating = randChoice(CREDIT_RATINGS);
      const startYear = randInt(2012, 2024);
      const startMonth = String(randInt(1, 12)).padStart(2, '0');
      const startDay = String(randInt(1, 28)).padStart(2, '0');
      const startDate = `${startYear}-${startMonth}-${startDay}`;

      let annualRevenue = 0;
      if (segment === 'Enterprise') annualRevenue = randInt(150, 800) * 1000000;
      else if (segment === 'Mid-Corporate') annualRevenue = randInt(50, 150) * 1000000;
      else if (segment === 'Commercial') annualRevenue = randInt(15, 50) * 1000000;
      else annualRevenue = randInt(3, 15) * 1000000;

      // Assign behavioral archetype:
      // ~65% Stable, ~15% High Tx Decline, ~10% Balance Outflow, ~5% Severe Complaints, ~5% Critical Multi-Decline
      const roll = random();
      let archetype = 'STABLE';
      if (roll < 0.15) archetype = 'TX_DECLINE';
      else if (roll < 0.25) archetype = 'BAL_DECLINE';
      else if (roll < 0.30) archetype = 'COMPLAINTS';
      else if (roll < 0.35) archetype = 'CRITICAL_MULTI';
      else if (roll < 0.40) archetype = 'RECOVERY';

      customerProfiles.push({
        id: custId,
        companyName,
        regNumber,
        industry,
        segment,
        region,
        startDate,
        rmId,
        creditRating,
        annualRevenue,
        archetype,
        contactPerson: `${prefix} Finance Director`,
        contactEmail: `treasury@${prefix.toLowerCase()}${suffix.split(' ')[0].toLowerCase()}.com`,
        contactPhone: `+1-${randInt(200, 999)}-555-${String(randInt(1000, 9999))}`,
      });
    }

    // Insert customers in batch
    for (const c of customerProfiles) {
      await connection.query(
        `INSERT INTO customers 
         (id, company_name, registration_number, industry, business_segment, region,
          relationship_start_date, rm_id, account_status, product_count, annual_revenue,
          credit_rating, contact_person, contact_email, contact_phone, is_synthetic_demonstration, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?, ?, TRUE, NOW())
         ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)`,
        [
          c.id, c.companyName, c.regNumber, c.industry, c.segment, c.region,
          c.startDate, c.rmId, randInt(2, 6), c.annualRevenue, c.creditRating,
          c.contactPerson, c.contactEmail, c.contactPhone,
        ]
      );
    }
    console.log('✅ Corporate customers seeded.');

    // 3. Generate 12 Months of Transactions and Operating Balances
    console.log('Generating 12-month transaction & balance histories for all customers...');

    for (const c of customerProfiles) {
      let baseTxCount = randInt(400, 2500);
      let baseTxValue = (c.annualRevenue / 12) * (0.6 + random() * 0.4);
      let baseBalance = baseTxValue * (0.8 + random() * 0.8);

      let prevTxCount = null;
      let prevTxValue = null;
      let prevBal = null;
      let sustainedMonths = 0;

      for (let mIdx = 0; mIdx < months.length; mIdx++) {
        const m = months[mIdx];
        const periodDate = `${m}-01`;

        let txCount = baseTxCount;
        let txValue = baseTxValue;
        let balance = baseBalance;

        // Apply archetype variations
        if (c.archetype === 'TX_DECLINE' && mIdx >= 9) {
          // Sharp transaction drop in recent 3 months (> 30% drop)
          const dropFactor = 0.65 - (mIdx - 9) * 0.08;
          txCount = Math.floor(baseTxCount * dropFactor);
          txValue = baseTxValue * dropFactor;
        } else if (c.archetype === 'BAL_DECLINE' && mIdx >= 8) {
          // Sharp balance drainage in recent 4 months (> 25% drop)
          const dropFactor = 0.70 - (mIdx - 8) * 0.06;
          balance = baseBalance * dropFactor;
        } else if (c.archetype === 'CRITICAL_MULTI' && mIdx >= 9) {
          // Both transactions and balances crashing
          const dropFactor = 0.55 - (mIdx - 9) * 0.07;
          txCount = Math.floor(baseTxCount * dropFactor);
          txValue = baseTxValue * dropFactor;
          balance = baseBalance * dropFactor;
        } else if (c.archetype === 'RECOVERY' && mIdx >= 8 && mIdx <= 10) {
          // Temporary dip followed by rebound
          txCount = Math.floor(baseTxCount * 0.75);
          txValue = baseTxValue * 0.75;
        } else {
          // Normal business noise (+/- 6%)
          const noise = 1 + (random() * 0.12 - 0.06);
          txCount = Math.floor(baseTxCount * noise);
          txValue = baseTxValue * noise;
          balance = baseBalance * noise;
        }

        // Calculate MoM changes and declines
        let countMomPct = null;
        let valueMomPct = null;
        let countDeclinePct = null;
        let valueDeclinePct = null;

        if (prevTxCount !== null && prevTxCount > 0) {
          countMomPct = Number((((txCount - prevTxCount) / prevTxCount) * 100).toFixed(2));
          countDeclinePct = Number((((prevTxCount - txCount) / prevTxCount) * 100).toFixed(2));
        }

        if (prevTxValue !== null && prevTxValue > 0) {
          valueMomPct = Number((((txValue - prevTxValue) / prevTxValue) * 100).toFixed(2));
          valueDeclinePct = Number((((prevTxValue - txValue) / prevTxValue) * 100).toFixed(2));
        }

        let balChangePct = null;
        let balDeclinePct = null;
        if (prevBal !== null && prevBal > 0) {
          balChangePct = Number((((balance - prevBal) / prevBal) * 100).toFixed(2));
          balDeclinePct = Number((((prevBal - balance) / prevBal) * 100).toFixed(2));
          if (balDeclinePct > 5) sustainedMonths++;
          else sustainedMonths = 0;
        }

        const inboundRatio = 0.42 + random() * 0.1;
        const outboundRatio = 1 - inboundRatio;
        const domesticRatio = 0.78 + random() * 0.08;
        const intlRatio = 1 - domesticRatio;

        // Insert monthly transaction
        await connection.query(
          `INSERT INTO transaction_monthly 
           (customer_id, month_year, period_date, total_count, total_value,
            inbound_count, inbound_value, outbound_count, outbound_value,
            domestic_count, domestic_value, international_count, international_value,
            count_mom_change_pct, value_mom_change_pct, count_decline_pct, value_decline_pct)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE total_count = VALUES(total_count)`,
          [
            c.id, m, periodDate, txCount, txValue,
            Math.floor(txCount * inboundRatio), txValue * inboundRatio,
            Math.floor(txCount * outboundRatio), txValue * outboundRatio,
            Math.floor(txCount * domesticRatio), txValue * domesticRatio,
            Math.floor(txCount * intlRatio), txValue * intlRatio,
            countMomPct, valueMomPct, countDeclinePct, valueDeclinePct,
          ]
        );

        // Insert operating balance
        await connection.query(
          `INSERT INTO operating_balances 
           (customer_id, month_year, period_date, closing_balance, average_balance,
            min_balance, max_balance, previous_balance, balance_change_pct, balance_decline_pct,
            sustained_decline_months)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE closing_balance = VALUES(closing_balance)`,
          [
            c.id, m, periodDate, balance, balance * (0.95 + random() * 0.08),
            balance * 0.82, balance * 1.15, prevBal, balChangePct, balDeclinePct,
            sustainedMonths,
          ]
        );

        prevTxCount = txCount;
        prevTxValue = txValue;
        prevBal = balance;
      }
    }
    console.log('✅ 12-month transaction & balance histories generated.');

    // 4. Generate Products for Customers
    console.log('Assigning banking products to corporate customers...');
    for (const c of customerProfiles) {
      const numProducts = randInt(3, 6);
      const chosenCategories = [...PRODUCT_CATEGORIES].sort(() => 0.5 - random()).slice(0, numProducts);

      for (let pIdx = 0; pIdx < chosenCategories.length; pIdx++) {
        const cat = chosenCategories[pIdx];
        const pCode = `PRD-${cat.substring(0, 3).toUpperCase()}-${pIdx + 1}`;
        let status = 'Active';
        let utilPct = randInt(40, 92);

        if (c.archetype === 'CRITICAL_MULTI' && pIdx === 0) {
          status = 'Declining';
          utilPct = 12.5;
        }

        const creditLimit = cat.includes('Facilities') || cat.includes('Loans') ? randInt(2, 20) * 1000000 : null;
        const outBal = creditLimit ? creditLimit * (utilPct / 100) : null;

        await connection.query(
          `INSERT INTO customer_products 
           (customer_id, product_code, product_name, product_category, utilization_pct,
            credit_limit, outstanding_balance, status, last_activity_date, opened_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-10-15', '2022-03-10')`,
          [c.id, pCode, `${cat} - Corporate Tier`, cat, utilPct, creditLimit, outBal, status]
        );
      }
    }
    console.log('✅ Banking products seeded.');

    // 5. Generate Service Complaints
    console.log('Logging service complaints...');
    for (const c of customerProfiles) {
      if (c.archetype === 'COMPLAINTS' || c.archetype === 'CRITICAL_MULTI') {
        const ticket = `TKT-${2026}-${randInt(1000, 9999)}`;
        const cat = randChoice(COMPLAINT_CATEGORIES);
        const severity = (c.archetype === 'CRITICAL_MULTI') ? 'Critical' : randChoice(['High', 'Medium']);
        await connection.query(
          `INSERT INTO service_complaints
           (complaint_ticket, customer_id, category, severity, status, reported_date, summary, details, rm_id)
           VALUES (?, ?, ?, ?, 'Open', '2026-10-10 14:20:00', ?, 'Client reported ongoing disruption in automated clearing.', ?)`,
          [ticket, c.id, cat, severity, `Dispute regarding ${cat} fees and execution turnaround`, c.rmId]
        );
      }
    }
    console.log('✅ Service complaints seeded.');

    // 6. Generate 30 Historical Customer Outcomes
    console.log('Seeding historical attrition and retention outcomes...');
    for (let i = 1; i <= 30; i++) {
      const targetCust = customerProfiles[i % customerProfiles.length];
      const isRetained = i % 3 !== 0; // 66% retained, 33% churned
      const oType = isRetained ? 'Retained' : 'Full Attrition';
      const reason = isRetained 
        ? 'Executive relationship review and customized liquidity sweep implemented.'
        : 'Cross-border fees and credit line margins matched by competitor.';

      await connection.query(
        `INSERT INTO customer_outcomes
         (customer_id, outcome_date, outcome_type, primary_reason, attrition_destination_bank,
          annual_revenue_impact, is_synthetic_demonstration)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          targetCust.id,
          `2026-0${randInt(1, 9)}-15`,
          oType,
          reason,
          isRetained ? null : 'Global Commercial Trust Corp',
          targetCust.annualRevenue * 0.04,
        ]
      );
    }
    console.log('✅ Historical attrition outcomes seeded.');

    // 7. Seed Demonstration Retention Campaigns
    console.log('Seeding retention campaigns...');
    const campaigns = [
      ['CMP-2026-Q1', 'Q3 Mid-Corporate Liquidity Retention Initiative', 'Prevent deposit migration by proactively introducing premium money-market liquidity sweeps.', 'Mid-Corporate', 'Cash Management Review', '2026-07-01', '2026-09-30', 90, 75000.00],
      ['CMP-2026-Q2', 'Enterprise Cross-Border Payment Pricing Optimization', 'Provide discounted FX spreads and dedicated corporate treasury advisory to stem international payment declines.', 'Enterprise', 'Eligible Loyalty Offers', '2026-08-01', '2026-10-31', 90, 120000.00],
      ['CMP-2026-Q3', 'Commercial Relationship Manager High-Touch Outreach', 'Conduct structured on-site relationship reviews with executive finance leadership for all flagged accounts.', 'Commercial', 'RM Outreach', '2026-09-01', '2026-11-30', 90, 50000.00],
    ];

    for (const cmp of campaigns) {
      const [resCmp] = await connection.query(
        `INSERT INTO campaigns
         (campaign_code, name, objective, target_segment, intervention_type, start_date, end_date, evaluation_window_days, budget, status, is_demonstration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', TRUE)`,
        cmp
      );
      const cId = resCmp.insertId;

      // Assign ~30 customers to each campaign
      const segment = cmp[3];
      const eligible = customerProfiles.filter(c => c.segment === segment).slice(0, 36);

      for (let idx = 0; idx < eligible.length; idx++) {
        const group = idx % 2 === 0 ? 'Treatment' : 'Control';
        const isDelivered = group === 'Treatment';
        // Treatment gets ~85% retention, Control gets ~65% retention (realistic commercial banking lift)
        const retainChance = group === 'Treatment' ? 0.85 : 0.65;
        const retained = random() < retainChance;

        await connection.query(
          `INSERT INTO campaign_assignments
           (campaign_id, customer_id, assignment_group, intervention_delivered, intervention_date, evaluated_retained, evaluation_date, customer_revenue_impact)
           VALUES (?, ?, ?, ?, ?, ?, '2026-10-20', ?)`,
          [
            cId,
            eligible[idx].id,
            group,
            isDelivered,
            isDelivered ? '2026-08-15' : null,
            retained,
            eligible[idx].annualRevenue * 0.03,
          ]
        );
      }
    }
    console.log('✅ Retention campaigns and randomized controlled assignments seeded.');

    // 8. Recalculate Risk, Early Warning Alerts & Recommendations
    console.log('Evaluating deterministic risk scores, early warning alerts, and retention recommendations for all 250 customers...');
    for (const c of customerProfiles) {
      await calculateAndSaveCustomerRisk(c.id);
      await evaluateCustomerAlerts(c.id);
      await generateCustomerRecommendations(c.id);
    }
    console.log('✅ Risk scores, alerts, and recommendations evaluated and persisted.');

    console.log('\n================================================================');
    console.log('🏆 Synthetic Demonstration Seed Generation Finished Successfully!');
    console.log('   Total Corporate Customers: 250');
    console.log('   Months of Historical Data: 12');
    console.log('   All data is labeled as Synthetic Demonstration Records.');
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error during database seed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
