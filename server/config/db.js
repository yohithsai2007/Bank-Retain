const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const { handleMockQuery } = require('./mockStore');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bankretain_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
};

let pool = null;
let isMySqlAvailable = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Execute query: attempts MySQL first; seamlessly falls back to embedded data store if MySQL offline
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<[Array, Object]>}
 */
async function query(sql, params = []) {
  if (isMySqlAvailable === false) {
    return handleMockQuery(sql, params);
  }

  try {
    const p = getPool();
    const result = await p.query(sql, params);
    isMySqlAvailable = true;
    return result;
  } catch (err) {
    // If MySQL connection or authentication fails, gracefully serve demonstration data store
    const isConnErr = err.code === 'ECONNREFUSED' ||
                      err.code === 'ER_ACCESS_DENIED_ERROR' ||
                      err.code === 'ER_BAD_DB_ERROR' ||
                      err.code === 'ER_NO_SUCH_TABLE' ||
                      err.code === 'ETIMEDOUT';
    if (isConnErr) {
      isMySqlAvailable = false;
      return handleMockQuery(sql, params);
    }
    throw err;
  }
}

async function getConnection() {
  try {
    const p = getPool();
    return await p.getConnection();
  } catch (err) {
    // Return mock connection interface
    return {
      query: (sql, params) => handleMockQuery(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    };
  }
}

async function testConnection() {
  try {
    const p = getPool();
    const [result] = await p.query('SELECT 1 AS connected');
    isMySqlAvailable = true;
    return { success: true, result };
  } catch (err) {
    isMySqlAvailable = false;
    return { success: false, error: err.message, code: err.code, fallbackStoreActive: true };
  }
}

module.exports = {
  getPool,
  query,
  getConnection,
  testConnection,
  dbConfig,
};
