/**
 * Initialize Database
 * Runs schema.sql and seed.sql against NeonDB
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSQLFile(filename) {
    const filePath = path.join(__dirname, '..', 'sql', filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`\n📄 Running ${filename}...`);
    await pool.query(sql);
    console.log(`✅ ${filename} executed successfully`);
}

async function initializeDatabase() {
    try {
        console.log('🚀 Starting database initialization...\n');

        // Run schema first (creates tables)
        await runSQLFile('schema.sql');

        // Run seed (populates data)
        await runSQLFile('seed.sql');

        // Verify data
        console.log('\n📊 Verification:');

        const depts = await pool.query('SELECT COUNT(*) FROM department');
        console.log(`   Departments: ${depts.rows[0].count}`);

        const courses = await pool.query('SELECT COUNT(*) FROM course');
        console.log(`   Courses: ${courses.rows[0].count}`);

        const students = await pool.query('SELECT COUNT(*) FROM student');
        console.log(`   Students: ${students.rows[0].count}`);

        const enrollments = await pool.query('SELECT COUNT(*) FROM enrollment');
        console.log(`   Enrollments: ${enrollments.rows[0].count}`);

        console.log('\n✅ Database initialized successfully!');

    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

initializeDatabase();
