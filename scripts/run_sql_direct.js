/**
 * Task 7 - Load SQL files directly (for files with PL/pgSQL functions)
 * 
 * This script reads a SQL file and executes it directly without parsing
 * 
 * Run: node scripts/run_sql_direct.js sql/task7_procedures.sql
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

async function runSQLFile(filePath) {
    console.log(`\n📂 Loading: ${path.basename(filePath)}`);
    console.log('═'.repeat(50));

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Database connected');

        const sql = fs.readFileSync(filePath, 'utf8');

        // For files with functions, we need to execute the entire file at once
        // pg module handles $$...$$ properly when executed as a single statement

        // Split by function boundaries - CREATE OR REPLACE FUNCTION
        const functionBlocks = sql.split(/(?=CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|CREATE\s+MATERIALIZED\s+VIEW|DROP\s)/i);

        let successCount = 0;
        let errorCount = 0;

        for (const block of functionBlocks) {
            const trimmed = block.trim();
            if (!trimmed || trimmed.startsWith('--')) continue;

            // Find complete statements (including functions)
            // Look for the end of function definition
            try {
                await client.query(trimmed);
                successCount++;

                // Try to extract name for logging
                const funcMatch = trimmed.match(/FUNCTION\s+(\w+)/i);
                const viewMatch = trimmed.match(/VIEW\s+(\w+)/i);
                const name = funcMatch?.[1] || viewMatch?.[1] || 'statement';
                console.log(`  ✅ Created: ${name}`);
            } catch (err) {
                if (!err.message.includes('already exists') &&
                    !err.message.includes('does not exist')) {
                    errorCount++;
                    console.log(`  ⚠️ Error: ${err.message.substring(0, 60)}`);
                }
            }
        }

        console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} errors`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
        console.log('✅ Connection closed');
    }
}

// Get file path from command line args
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node scripts/run_sql_direct.js <path-to-sql-file>');
    console.log('Example: node scripts/run_sql_direct.js sql/task7_procedures.sql');
    process.exit(1);
}

const filePath = path.isAbsolute(args[0]) ? args[0] : path.join(process.cwd(), args[0]);

if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
}

runSQLFile(filePath).catch(console.error);
