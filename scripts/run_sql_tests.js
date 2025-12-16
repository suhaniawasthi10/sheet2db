/**
 * Run SQL Queries Script
 * Executes queries and displays results for testing
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSQL(filename) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Executing: ${filename}`);
    console.log('='.repeat(60));

    const sql = fs.readFileSync(`sql/${filename}`, 'utf8');

    try {
        const result = await pool.query(sql);

        if (result.rows && result.rows.length > 0) {
            console.log(`✅ Success! ${result.rows.length} rows returned`);
            console.table(result.rows.slice(0, 10)); // Show first 10 rows
        } else {
            console.log('✅ Success! No rows returned');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function runQuery(name, sql) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 ${name}`);
    console.log('='.repeat(60));

    try {
        const result = await pool.query(sql);

        if (result.rows && result.rows.length > 0) {
            console.log(`\n✅ ${result.rows.length} rows returned\n`);
            console.table(result.rows.slice(0, 10));
        } else {
            console.log('\n✅ Query executed successfully. No rows returned.\n');
        }

        return result;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

async function main() {
    console.log('\n🚀 SQL Testing Script\n');

    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Database connected\n');

        // 1. Create views
        console.log('\n📋 STEP 1: Creating Views...');
        await runSQL('views.sql');

        // 2. Create procedures
        console.log('\n⚙️  STEP 2: Creating Stored Procedures...');
        await runSQL('procedures.sql');

        // 3. Run sample queries
        console.log('\n\n📊 STEP 3: Running Sample Queries...\n');

        // Sample 1: Students per department
        await runQuery(
            'Q1: Students per Department',
            `SELECT 
                d.department_name,
                COUNT(s.student_id) as student_count
            FROM department d
            LEFT JOIN student s ON d.department_id = s.department_id
            GROUP BY d.department_id, d.department_name
            ORDER BY student_count DESC`
        );

        // Sample 2: Use a view
        await runQuery(
            'Using View: vw_student_gpa (Top 5)',
            `SELECT * FROM vw_student_gpa 
             ORDER BY gpa DESC NULLS LAST 
             LIMIT 5`
        );

        // Sample 3: Use a stored function
        await runQuery(
            'Using Function: Get Student GPA',
            `SELECT student_id, get_student_gpa(student_id) as gpa
             FROM student
             LIMIT 5`
        );

        // Sample 4: Enrollments without grades
        await runQuery(
            'Q: Enrollments Without Grades',
            `SELECT 
                s.student_first_name || ' ' || s.student_last_name as student,
                c.course_name,
                e.enrollment_date
             FROM enrollment e
             JOIN student s ON e.student_id = s.student_id
             JOIN course c ON e.course_id = c.course_id
             WHERE e.grade IS NULL`
        );

        // Sample 5: Database statistics
        await runQuery(
            'Database Statistics',
            `SELECT 
                tablename,
                pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
             FROM pg_tables
             WHERE schemaname = 'public'
             ORDER BY pg_total_relation_size('public.'||tablename) DESC`
        );

        console.log('\n\n✅ All tests completed!\n');

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await pool.end();
        console.log('👋 Database connection closed\n');
    }
}

main().catch(console.error);
