# BankRetain: Corporate Banking Customer Attrition Analytics and Retention Management System

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**BankRetain** is an enterprise-grade web application engineered for commercial and corporate banks. It detects corporate customer attrition early by monitoring:
- Month-over-month contraction in payment and transaction volumes
- Sustained capital drain and operating balance outflows
- Dormancy or declining utilization across credit lines, trade finance, and treasury products
- Increasing frequency and unresolved severity of customer operational complaints

BankRetain operates on **strictly transparent, deterministic, rule-based business logic** and conventional statistical inference (such as two-proportion Randomized Controlled Trial Z-tests). **It uses no black-box machine learning, trained models, Python scripts, or external AI APIs.**

---

## 1. Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18 (Vite), JavaScript (ES modules), Tailwind CSS, React Router v6, Recharts, Lucide React icons |
| **Backend** | Node.js 24, Express.js, `mysql2/promise`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken` |
| **Database** | MySQL 8.0 (InnoDB engine, strict foreign key constraints, indexes, 17 tables) |
| **Testing** | Node.js built-in test runner (`node --test`), 21 automated unit and integration tests |
| **Methodology** | Deterministic rule points, moving averages (SMA-3, SMA-6), intention-to-treat RCT A/B statistics |

---

## 2. Directory Structure

```text
bankretain/
│
├── client/                     # React Vite Frontend Application
│   ├── public/                 # Static web assets
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/         # Dark navy Sidebar, Top Navbar, AppLayout
│   │   ├── pages/              # All 10 functional enterprise pages + Login
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── CustomersPage.jsx
│   │   │   ├── CustomerDetailPage.jsx (9 Full Functional Tabs)
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── AlertsPage.jsx
│   │   │   ├── RiskPage.jsx
│   │   │   ├── RetentionPage.jsx
│   │   │   ├── CampaignsPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── DataManagementPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── services/           # Centralized API service client
│   │   ├── App.jsx             # React Router configuration
│   │   ├── main.jsx            # React root mount
│   │   └── index.css           # Tailwind base styles and custom scrollbars
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js          # Development proxy to backend on port 5000
│
├── server/                     # Node.js Express REST Backend Service
│   ├── config/
│   │   └── db.js               # MySQL2 connection pooling & parameterized queries
│   ├── controllers/            # Controller endpoints with safe error handling
│   ├── middleware/             # JWT authentication and Role-Based Access Control
│   ├── routes/
│   │   └── api.js              # Complete REST route mapping
│   ├── services/
│   │   ├── riskScoringService.js      # Deterministic 0-100 scoring engine
│   │   ├── alertService.js            # 10 Early Warning System rules
│   │   ├── recommendationService.js   # Retention recommendation generator
│   │   ├── campaignService.js         # RCT trial assignment & A/B statistics
│   │   └── analyticsService.js        # MoM changes & SMA-3/SMA-6 moving averages
│   ├── scripts/
│   │   ├── createDatabase.js          # Idempotent DB schema initialization
│   │   ├── seedDatabase.js            # 250 corporate customer synthetic generator
│   │   └── recalculateRisk.js         # Portfolio recalculation utility
│   ├── utils/
│   │   └── mathUtils.js               # Zero-safe math, SMAs, Z-scores, 95% CIs
│   ├── app.js                  # Express app setup with CORS and security
│   ├── server.js               # Server entry point on port 5000
│   └── package.json
│
├── database/
│   ├── schema.sql              # Clean MySQL 8.0 schema (17 InnoDB tables)
│   └── seed.sql
│
├── tests/                      # Automated Test Suite (21 test cases)
│   ├── analytics.test.js
│   └── api_and_rules.test.js
│
├── .env.example                # Template environment variables
├── .gitignore
└── README.md
```

---

## 3. Quick Start & Execution Guide (Windows PowerShell)

### Prerequisites
- **Node.js 24** installed locally (`node -v`).
- **MySQL 8.0** running locally on port **3306** (`MySQL80` Windows service).

---

### Step 1: Configure Environment Variables

1. Open your project root at `C:\Users\P Yohith Sai\.gemini\antigravity\scratch\bankretain`.
2. Inspect or update `.env` with your local MySQL password:

```ini
# Server Network Configuration
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=bankretain_db
DB_CONNECTION_LIMIT=10

# Security and JWT
JWT_SECRET=bankretain_corporate_jwt_secret_key_2026_enterprise_attrition
JWT_EXPIRES_IN=24h

# Demonstration Settings
SYNTHETIC_DATA_RANDOM_SEED=42
ENABLE_AUDIT_LOGGING=true
```

*(If your MySQL root user does not have a password, leave `DB_PASSWORD=` blank).*

---

### Step 2: Initialize Database Schema

Run the database setup script to create `bankretain_db` and all 17 relational tables:

```powershell
cd "C:\Users\P Yohith Sai\.gemini\antigravity\scratch\bankretain\server"
npm.cmd run db:init
```

---

### Step 3: Seed Synthetic Demonstration Data

Seed 250 realistic corporate accounts with 12 months of transactions, operating balances, banking facilities, complaints, early-warning alerts, and RCT campaigns:

```powershell
npm.cmd run db:seed
```

> **Note on Demonstration Data:**
> All generated records are clearly flagged with `is_synthetic_demonstration = TRUE`. The generator uses a fixed random seed (42) via a deterministic Mulberry32 PRNG to ensure reproducibility.

---

### Step 4: Run Automated Tests

Execute the 21 automated test cases covering percentage changes, zero-denominator safeguards, moving averages, risk score capping, explainability, and two-proportion Z-tests:

```powershell
cd "C:\Users\P Yohith Sai\.gemini\antigravity\scratch\bankretain"
node --test tests/*.test.js
```

---

### Step 5: Start the Backend Server

Start the Express backend on port **5000**:

```powershell
cd "C:\Users\P Yohith Sai\.gemini\antigravity\scratch\bankretain\server"
npm.cmd start
```

Verify backend health in your browser or curl:
- **Health Check Endpoint:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Step 6: Start the React Frontend

Open a second PowerShell window and start the Vite frontend development server:

```powershell
cd "C:\Users\P Yohith Sai\.gemini\antigravity\scratch\bankretain\client"
npm.cmd run dev
```

Open your browser to:
- **Web Application URL:** [http://localhost:3000](http://localhost:3000)

---

## 4. Default Demonstration Login Accounts

For local demonstration and evaluation, three standard roles with pre-configured credentials are ready to use:

| Role | Username | Password | Access Capabilities |
|---|---|---|---|
| **Executive Administrator** | `admin` | `Admin@123` | Full access: configure scoring rules, audit logs, archive accounts |
| **Relationship Manager** | `rm_sarah` | `Rm@123` | RM view: follow-up tasks, acknowledge alerts, customer actions |
| **Analytics Viewer** | `analyst_john` | `Analyst@123` | Read-only analytics: reports, dashboard metrics, RCT statistics |

*(The login screen also provides quick one-click role switch buttons for seamless demonstration).*

---

## 5. Key System Capabilities

### 1. Executive Dashboard (`/`)
- Dynamic filter bar: Date range, Industry, Business Segment, Relationship Manager, Risk Category, Region.
- 8 Primary KPI cards + 3 historical/campaign KPI cards computed in real time.
- 7 Recharts visualizations:
  1. Customer risk distribution (doughnut)
  2. Monthly transaction volume trend (line)
  3. Operating balance trends (line)
  4. High-risk customers by industry (bar)
  5. Early warning indicator distribution (bar)
  6. Retention task status distribution (doughnut)
  7. Historical customer attrition trend (line)
- High-risk customer table with search, sorting, and pagination.

### 2. Corporate Customer Directory (`/customers`)
- Search, filter by industry, segment, region, risk score.
- Functional modal to register new corporate clients or edit existing client details.
- Archive client relationships with audit logging.

### 3. Customer Detailed Portfolio Profile (`/customers/:id`)
9 Full Functional Tabs:
1. **Overview:** Company info, RM, duration (`X yrs Y mos`), active warnings, pending retention recommendations.
2. **Transactions:** 12-month table with inbound/outbound, domestic/cross-border, MoM % change, decline %, and volume trend chart.
3. **Operating Balances:** 12-month table with closing balance, average balance, 3-month SMA, 6-month SMA, % decline, sustained decline periods, and balance trend line chart.
4. **Product Utilization:** Product portfolio (current accounts, cash management, trade finance, working capital facilities, term loans, treasury services, international payments) with utilization % bars, credit limits, and activity dates.
5. **Complaints:** Service complaints table with category, reported date, severity, status, and resolution turnaround times.
6. **Risk Analysis:** Rule-by-rule explainable table showing observed value, baseline, threshold, points contributed, and explanation. Score history trajectory chart.
7. **Early Warnings:** Active alerts with Acknowledge, Assign to RM, Resolve, and Dismiss False Warning (with mandatory rationale).
8. **Retention Actions:** Follow-up tasks, status updates, outcome recording (`Improved transaction activity`, `Improved operating balances`, `Resolved complaints`, `No material improvement`, `Actual attrition`).
9. **Activity Timeline:** Chronological timeline generated from real transaction drops, balance warnings, complaints, risk recalculations, and task completions.

### 4. Early Warning System (`/alerts`)
- 10 automated rules covering volume contraction, balance drainage, payment frequency drops, product dormancy, complaint escalation, and multi-period persistence.
- Duplicate prevention: repeated scans update timestamps rather than generating duplicate active alerts.
- Alert escalation flag when conditions persist or compound.

### 5. Attrition Risk Analysis & Explainability (`/risk`)
- Transparent rule-based scoring (0–100 scale).
- Batch recalculation button to re-evaluate the entire corporate portfolio.
- Explainability modal showing exactly which rules triggered and why.

### 6. Retention Management (`/retention`)
- Prominent banner highlighting overdue tasks.
- Filter by Relationship Manager and priority.
- Status updates and customer outcome tracking.

### 7. Campaign Analytics (RCT / A/B Testing) (`/campaigns`)
- Randomized 50/50 split between Treatment and Control groups.
- Rigorous statistical evaluation:
  - Absolute retention lift: `Treatment Rate - Control Rate`
  - Relative retention lift
  - Two-proportion Z-score and p-value
  - 95% Confidence Interval for retention lift
  - Cost per incremental retained customer

### 8. Reports & CSV Exports (`/reports`)
- Instant previews and one-click CSV download across 10 report types.

### 9. Data Management & CSV Import Workflow (`/data`)
- 8-step pipeline: upload/paste CSV, preview headers and rows, schema validation, duplicate checking, and transactional database commit.
- One-click template loaders for quick testing.

### 10. System Settings & Scoring Weights (`/settings`)
- Configurable rule points and thresholds (e.g. adjust transaction decline threshold or weight).
- Policy audit trail tracking every modification with timestamps and user IDs.

---

## 6. Safety, Security, and Mathematical Guarantees

1. **Zero Division Safety:** When previous period volume or balance is zero, decline percentages are displayed as unavailable (`null`) and low-activity rules are evaluated instead.
2. **Deterministic & Explainable:** Risk scores represent points accumulated under policy rules, **not** machine learning probabilities.
3. **Data Integrity:** Parameterized SQL statements used throughout via `mysql2/promise` to prevent SQL injection.
4. **Credential Isolation:** Passwords hashed with bcrypt; credentials isolated in `.env` and never transmitted to the frontend.
