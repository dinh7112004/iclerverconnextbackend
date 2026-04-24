const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    const res = await client.query('SELECT u.email FROM users u JOIN parents p ON u.id = p."userId" LIMIT 10');
    console.log('Parent Emails:');
    res.rows.forEach(row => console.log(row.email));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
