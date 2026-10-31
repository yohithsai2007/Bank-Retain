-- ======================================================================
-- BankRetain: Corporate Banking Customer Attrition Analytics & Retention
-- MySQL 8.0 Relational Database Schema
-- All tables use InnoDB storage engine with strict referential integrity
-- ======================================================================

CREATE DATABASE IF NOT EXISTS bankretain_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bankretain_db;

-- 1. System Users (Authentication & Authorization)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'relationship_manager', 'analytics_viewer') NOT NULL DEFAULT 'relationship_manager',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Relationship Managers
CREATE TABLE IF NOT EXISTS relationship_managers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  department VARCHAR(100) NOT NULL DEFAULT 'Commercial Banking',
  region ENUM('North America', 'EMEA', 'APAC', 'LATAM', 'National') NOT NULL DEFAULT 'National',
  active_accounts_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_rm_region (region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Corporate Customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(32) PRIMARY KEY,
  company_name VARCHAR(150) NOT NULL,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  industry ENUM('Manufacturing', 'Technology & Telecom', 'Healthcare & Pharma', 'Wholesale & Retail', 'Energy & Utilities', 'Logistics & Transportation', 'Financial Services', 'Construction & Real Estate', 'Hospitality & Leisure', 'Agriculture & Food') NOT NULL,
  business_segment ENUM('Enterprise', 'Mid-Corporate', 'Commercial', 'SME Corporate') NOT NULL,
  region ENUM('North America', 'EMEA', 'APAC', 'LATAM', 'National') NOT NULL,
  relationship_start_date DATE NOT NULL,
  rm_id INT NULL,
  account_status ENUM('Active', 'Under Review', 'Dormant', 'Archived') NOT NULL DEFAULT 'Active',
  product_count INT NOT NULL DEFAULT 1,
  annual_revenue DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  credit_rating VARCHAR(10) NOT NULL DEFAULT 'BBB',
  contact_person VARCHAR(100) NOT NULL,
  contact_email VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  is_synthetic_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rm_id) REFERENCES relationship_managers(id) ON DELETE SET NULL,
  INDEX idx_cust_industry (industry),
  INDEX idx_cust_segment (business_segment),
  INDEX idx_cust_region (region),
  INDEX idx_cust_rm (rm_id),
  INDEX idx_cust_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Monthly Transaction Records
CREATE TABLE IF NOT EXISTS transaction_monthly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  period_date DATE NOT NULL,
  total_count INT NOT NULL DEFAULT 0,
  total_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  inbound_count INT NOT NULL DEFAULT 0,
  inbound_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  outbound_count INT NOT NULL DEFAULT 0,
  outbound_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  domestic_count INT NOT NULL DEFAULT 0,
  domestic_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  international_count INT NOT NULL DEFAULT 0,
  international_value DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  count_mom_change_pct DECIMAL(8,2) NULL,
  value_mom_change_pct DECIMAL(8,2) NULL,
  count_decline_pct DECIMAL(8,2) NULL,
  value_decline_pct DECIMAL(8,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE KEY uk_cust_tx_month (customer_id, month_year),
  INDEX idx_tx_period (period_date),
  INDEX idx_tx_cust (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Operating Balances (Monthly / Period snapshots)
CREATE TABLE IF NOT EXISTS operating_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL,
  month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  period_date DATE NOT NULL,
  closing_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  average_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  min_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  max_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  previous_balance DECIMAL(18,2) NULL,
  balance_change_pct DECIMAL(8,2) NULL,
  balance_decline_pct DECIMAL(8,2) NULL,
  sma_3_month DECIMAL(18,2) NULL,
  sma_6_month DECIMAL(18,2) NULL,
  sma_3_deviation_pct DECIMAL(8,2) NULL,
  sustained_decline_months INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE KEY uk_cust_bal_month (customer_id, month_year),
  INDEX idx_bal_period (period_date),
  INDEX idx_bal_cust (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Customer Banking Products & Utilization
CREATE TABLE IF NOT EXISTS customer_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL,
  product_code VARCHAR(32) NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  product_category ENUM('Current Accounts', 'Cash Management', 'Trade Finance', 'Working Capital Facilities', 'Term Loans', 'Treasury Services', 'International Payments', 'Other Corporate Banking Products') NOT NULL,
  utilization_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  credit_limit DECIMAL(18,2) NULL,
  outstanding_balance DECIMAL(18,2) NULL,
  status ENUM('Active', 'Inactive', 'Declining', 'Pending Cancellation') NOT NULL DEFAULT 'Active',
  last_activity_date DATE NOT NULL,
  opened_date DATE NOT NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_prod_cust (customer_id),
  INDEX idx_prod_category (product_category),
  INDEX idx_prod_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Service Complaints
CREATE TABLE IF NOT EXISTS service_complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_ticket VARCHAR(32) NOT NULL UNIQUE,
  customer_id VARCHAR(32) NOT NULL,
  category ENUM('Payment Processing', 'Digital Banking Access', 'Fee Dispute', 'Trade Finance Delay', 'FX / Treasury Execution', 'Relationship Management', 'Account Servicing') NOT NULL,
  severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  status ENUM('Open', 'Under Investigation', 'Escalated', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
  reported_date DATETIME NOT NULL,
  resolution_date DATETIME NULL,
  resolution_time_hours INT NULL,
  summary VARCHAR(255) NOT NULL,
  details TEXT NULL,
  root_cause TEXT NULL,
  rm_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (rm_id) REFERENCES relationship_managers(id) ON DELETE SET NULL,
  INDEX idx_comp_cust (customer_id),
  INDEX idx_comp_status (status),
  INDEX idx_comp_severity (severity),
  INDEX idx_comp_reported (reported_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Rule-Based Scoring Configuration
CREATE TABLE IF NOT EXISTS scoring_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(50) NOT NULL UNIQUE,
  rule_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  default_points INT NOT NULL,
  current_points INT NOT NULL,
  threshold_operator ENUM('>', '>=', '<', '<=', '=') NOT NULL DEFAULT '>=',
  threshold_value DECIMAL(10,2) NOT NULL,
  secondary_threshold DECIMAL(10,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  scoring_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Risk Assessments (Historical Header)
CREATE TABLE IF NOT EXISTS risk_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL,
  assessment_date DATETIME NOT NULL,
  scoring_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  risk_score INT NOT NULL,
  risk_category ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
  score_change_from_previous INT NOT NULL DEFAULT 0,
  score_change_reason TEXT NULL,
  previous_score INT NULL,
  is_latest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_ra_cust (customer_id),
  INDEX idx_ra_category (risk_category),
  INDEX idx_ra_latest (is_latest),
  INDEX idx_ra_date (assessment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Risk Assessment Explanation Details (Rule by Rule)
CREATE TABLE IF NOT EXISTS risk_assessment_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  indicator_name VARCHAR(150) NOT NULL,
  observed_value VARCHAR(100) NOT NULL,
  baseline_value VARCHAR(100) NOT NULL,
  threshold_applied VARCHAR(100) NOT NULL,
  points_contributed INT NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL,
  is_triggered BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (assessment_id) REFERENCES risk_assessments(id) ON DELETE CASCADE,
  INDEX idx_rad_assessment (assessment_id),
  INDEX idx_rad_rule (rule_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Early Warning Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alert_uid VARCHAR(32) NOT NULL UNIQUE,
  customer_id VARCHAR(32) NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  triggered_rule_code VARCHAR(50) NOT NULL,
  observed_value VARCHAR(100) NOT NULL,
  historical_baseline VARCHAR(100) NOT NULL,
  threshold VARCHAR(100) NOT NULL,
  severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  detection_date DATETIME NOT NULL,
  rm_id INT NULL,
  status ENUM('Active', 'Acknowledged', 'Under Review', 'Resolved', 'Dismissed') NOT NULL DEFAULT 'Active',
  dismissal_reason TEXT NULL,
  resolution_notes TEXT NULL,
  recommended_next_step TEXT NOT NULL,
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_count INT NOT NULL DEFAULT 0,
  last_evaluated_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (rm_id) REFERENCES relationship_managers(id) ON DELETE SET NULL,
  INDEX idx_alerts_cust (customer_id),
  INDEX idx_alerts_status (status),
  INDEX idx_alerts_severity (severity),
  INDEX idx_alerts_rule (triggered_rule_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Retention Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rec_uid VARCHAR(32) NOT NULL UNIQUE,
  customer_id VARCHAR(32) NOT NULL,
  recommendation_category VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  supporting_warning_indicators JSON NULL,
  priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  rm_id INT NULL,
  created_date DATETIME NOT NULL,
  due_date DATE NULL,
  status ENUM('Pending', 'Accepted', 'In Progress', 'Completed', 'Rejected', 'Deferred') NOT NULL DEFAULT 'Pending',
  rejection_reason TEXT NULL,
  completion_notes TEXT NULL,
  outcome VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (rm_id) REFERENCES relationship_managers(id) ON DELETE SET NULL,
  INDEX idx_rec_cust (customer_id),
  INDEX idx_rec_status (status),
  INDEX idx_rec_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Retention Management Follow-Up Tasks
CREATE TABLE IF NOT EXISTS retention_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_uid VARCHAR(32) NOT NULL UNIQUE,
  customer_id VARCHAR(32) NOT NULL,
  recommendation_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  assigned_rm_id INT NULL,
  due_date DATE NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  status ENUM('Open', 'In Progress', 'Completed', 'Cancelled', 'Overdue') NOT NULL DEFAULT 'Open',
  customer_feedback TEXT NULL,
  completed_interventions TEXT NULL,
  recorded_outcome ENUM('Improved transaction activity', 'Improved operating balances', 'Resolved complaints', 'Improved product utilization', 'No material improvement', 'Actual attrition', 'Pending evaluation') NOT NULL DEFAULT 'Pending evaluation',
  outcome_evaluation_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (recommendation_id) REFERENCES recommendations(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_rm_id) REFERENCES relationship_managers(id) ON DELETE SET NULL,
  INDEX idx_task_cust (customer_id),
  INDEX idx_task_rm (assigned_rm_id),
  INDEX idx_task_status (status),
  INDEX idx_task_due (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Customer Historical Attrition & Retention Outcomes
CREATE TABLE IF NOT EXISTS customer_outcomes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(32) NOT NULL,
  outcome_date DATE NOT NULL,
  outcome_type ENUM('Retained', 'Partial Attrition', 'Full Attrition', 'Product Attrition', 'Recovered Activity') NOT NULL,
  primary_reason VARCHAR(255) NOT NULL,
  attrition_destination_bank VARCHAR(100) NULL,
  retained_balance_pct DECIMAL(5,2) NULL,
  annual_revenue_impact DECIMAL(18,2) NULL,
  notes TEXT NULL,
  is_synthetic_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_outcomes_cust (customer_id),
  INDEX idx_outcomes_type (outcome_type),
  INDEX idx_outcomes_date (outcome_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Retention Campaigns (Randomized Controlled Trials / Programs)
CREATE TABLE IF NOT EXISTS campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  objective TEXT NOT NULL,
  target_segment VARCHAR(100) NOT NULL,
  eligibility_rules JSON NULL,
  intervention_type ENUM('RM Outreach', 'Service Issue Resolution', 'Cash Management Review', 'Digital Banking Assistance', 'Product Suitability Review', 'Eligible Loyalty Offers') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  evaluation_window_days INT NOT NULL DEFAULT 90,
  budget DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status ENUM('Draft', 'Active', 'Completed', 'Archived') NOT NULL DEFAULT 'Active',
  is_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_camp_status (status),
  INDEX idx_camp_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Campaign Customer Assignments & RCT Statistics
CREATE TABLE IF NOT EXISTS campaign_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT NOT NULL,
  customer_id VARCHAR(32) NOT NULL,
  assignment_group ENUM('Treatment', 'Control') NOT NULL,
  intervention_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  intervention_date DATE NULL,
  evaluated_retained BOOLEAN NULL,
  evaluation_date DATE NULL,
  customer_revenue_impact DECIMAL(18,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE KEY uk_camp_cust (campaign_id, customer_id),
  INDEX idx_ca_camp (campaign_id),
  INDEX idx_ca_group (assignment_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
