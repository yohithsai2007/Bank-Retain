const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });
dotenv.config();

async function check() {
  const customPassword = process.argv[2];
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = customPassword !== undefined ? customPassword : (process.env.DB_PASSWORD || '');

  try {
    const conn = await mysql.createConnection({ host, port, user, password });
    console.log('SUCCESS');

    // If a custom password was passed and works, update .env automatically
    if (customPassword !== undefined && fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('DB_PASSWORD=')) {
        content = content.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${customPassword}`);
      } else {
        content += `\nDB_PASSWORD=${customPassword}`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
      console.log('ENV_UPDATED');
    }

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.log('FAILED:' + err.message);
    process.exit(1);
  }
}

check();
