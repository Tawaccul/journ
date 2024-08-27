const { Pool } = require('pg');

const pool = new Pool({
  user: 'tawacculgm',
  host: 'pg3.sweb.ru',
  database: 'tawacculgm',
  password: 'Journal2020',
  port: 5432,
});

async function checkConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
  } catch (err) {
    console.error('Error connecting to PostgreSQL database:', err.message);
    console.error('Error stack:', err.stack);
  }
}

checkConnection();

module.exports = pool;
