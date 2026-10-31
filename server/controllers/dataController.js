const db = require('../config/db');
const { calculateAndSaveCustomerRisk } = require('../services/riskScoringService');

/**
 * Preview raw CSV content and parse headers/rows
 */
async function previewCsv(req, res) {
  try {
    const { csvContent, importType } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid CSV content string is required.' });
    }

    const lines = csvContent.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV file must contain a header row and at least one data row.' });
    }

    // Parse simple CSV line with quote support
    function parseCsvLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    }

    const headers = parseCsvLine(lines[0]);
    const previewRows = lines.slice(1, Math.min(lines.length, 11)).map(parseCsvLine);
    const totalRows = lines.length - 1;

    res.json({
      success: true,
      headers,
      previewRows,
      totalRows,
      importType: importType || 'customers',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'CSV preview failed.', error: error.message });
  }
}

/**
 * Validate and execute transactional CSV import
 */
async function executeImport(req, res) {
  const conn = await db.getConnection();
  try {
    const { importType, rows, columnMapping } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      conn.release();
      return res.status(400).json({ success: false, message: 'No rows provided for import.' });
    }

    await conn.beginTransaction();

    let validCount = 0;
    const errors = [];
    const customerIdsToRecalculate = new Set();

    if (importType === 'customers') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const id = row.id || row.customer_id;
        const companyName = row.company_name || row.name;
        const regNumber = row.registration_number || `REG-${Date.now()}-${i}`;
        const industry = row.industry || 'Manufacturing';
        const segment = row.business_segment || 'Commercial';
        const region = row.region || 'National';
        const startDate = row.relationship_start_date || new Date().toISOString().split('T')[0];
        const revenue = parseFloat(row.annual_revenue || 0);

        if (!id || !companyName) {
          errors.push({ row: i + 1, error: 'Missing mandatory ID or company name.' });
          continue;
        }

        // Check duplicate registration
        const [existing] = await conn.query('SELECT id FROM customers WHERE id = ?', [id]);
        if (existing.length > 0) {
          errors.push({ row: i + 1, error: `Customer ID '${id}' already exists in database.` });
          continue;
        }

        await conn.query(
          `INSERT INTO customers 
           (id, company_name, registration_number, industry, business_segment, region,
            relationship_start_date, account_status, product_count, annual_revenue,
            contact_person, contact_email, contact_phone, is_synthetic_demonstration, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 1, ?, 'Primary Officer', 'officer@example.com', '+1-555-0199', FALSE, NOW())`,
          [id, companyName, regNumber, industry, segment, region, startDate, revenue]
        );
        validCount++;
        customerIdsToRecalculate.add(id);
      }
    } else if (importType === 'transactions') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const customerId = row.customer_id;
        const monthYear = row.month_year;
        const totalCount = parseInt(row.total_count, 10);
        const totalValue = parseFloat(row.total_value);

        if (!customerId || !monthYear || isNaN(totalCount) || isNaN(totalValue)) {
          errors.push({ row: i + 1, error: 'Invalid or missing customer_id, month_year, total_count, or total_value.' });
          continue;
        }

        // Validate customer reference
        const [custCheck] = await conn.query('SELECT id FROM customers WHERE id = ?', [customerId]);
        if (!custCheck.length) {
          errors.push({ row: i + 1, error: `Referenced customer '${customerId}' does not exist.` });
          continue;
        }

        const periodDate = `${monthYear}-01`;

        await conn.query(
          `INSERT INTO transaction_monthly 
           (customer_id, month_year, period_date, total_count, total_value,
            inbound_count, inbound_value, outbound_count, outbound_value,
            domestic_count, domestic_value, international_count, international_value, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
            total_count = VALUES(total_count),
            total_value = VALUES(total_value)`,
          [
            customerId, monthYear, periodDate, totalCount, totalValue,
            Math.floor(totalCount * 0.4), totalValue * 0.4,
            Math.floor(totalCount * 0.6), totalValue * 0.6,
            Math.floor(totalCount * 0.8), totalValue * 0.8,
            Math.floor(totalCount * 0.2), totalValue * 0.2,
          ]
        );
        validCount++;
        customerIdsToRecalculate.add(customerId);
      }
    } else if (importType === 'balances') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const customerId = row.customer_id;
        const monthYear = row.month_year;
        const closingBalance = parseFloat(row.closing_balance);

        if (!customerId || !monthYear || isNaN(closingBalance)) {
          errors.push({ row: i + 1, error: 'Invalid or missing customer_id, month_year, or closing_balance.' });
          continue;
        }

        const [custCheck] = await conn.query('SELECT id FROM customers WHERE id = ?', [customerId]);
        if (!custCheck.length) {
          errors.push({ row: i + 1, error: `Referenced customer '${customerId}' does not exist.` });
          continue;
        }

        const periodDate = `${monthYear}-01`;

        await conn.query(
          `INSERT INTO operating_balances 
           (customer_id, month_year, period_date, closing_balance, average_balance, min_balance, max_balance, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
            closing_balance = VALUES(closing_balance),
            average_balance = VALUES(average_balance)`,
          [customerId, monthYear, periodDate, closingBalance, closingBalance * 0.98, closingBalance * 0.8, closingBalance * 1.2]
        );
        validCount++;
        customerIdsToRecalculate.add(customerId);
      }
    } else if (importType === 'complaints') {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const customerId = row.customer_id;
        const category = row.category || 'Payment Processing';
        const severity = row.severity || 'Medium';
        const summary = row.summary || 'Operational inquiry logged';

        if (!customerId) {
          errors.push({ row: i + 1, error: 'Missing customer_id.' });
          continue;
        }

        const ticket = `TKT-${Date.now().toString(36).toUpperCase()}-${i}`;
        await conn.query(
          `INSERT INTO service_complaints
           (complaint_ticket, customer_id, category, severity, status, reported_date, summary, created_at)
           VALUES (?, ?, ?, ?, 'Open', NOW(), ?, NOW())`,
          [ticket, customerId, category, severity, summary]
        );
        validCount++;
        customerIdsToRecalculate.add(customerId);
      }
    } else {
      errors.push({ row: 0, error: `Unsupported import type: ${importType}` });
    }

    await conn.commit();
    conn.release();

    // Trigger asynchronous recalculation for affected customers
    for (const cId of customerIdsToRecalculate) {
      calculateAndSaveCustomerRisk(cId).catch(() => {});
    }

    res.json({
      success: true,
      message: `Data import complete. ${validCount} valid records saved.`,
      summary: {
        totalProcessed: rows.length,
        validCount,
        errorCount: errors.length,
        errors: errors.slice(0, 20), // Show up to first 20 errors
      },
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ success: false, message: 'Import transaction failed and was rolled back.', error: error.message });
  }
}

module.exports = {
  previewCsv,
  executeImport,
};
