import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the pool connection from the compiled dist folder
import pool from '../dist/configuration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const schemaPath = path.join(__dirname, '../db.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await pool.query(sql);

    console.log('Schema applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exit(1);
  }
}

run();
