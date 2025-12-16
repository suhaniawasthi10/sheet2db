/**
 * Task 7 ETL Pipeline - Main Entry Point
 * 
 * Loads public datasets (Chinook, World Happiness) and applies optimizations
 * 
 * Run: node etl/task7/index.js
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// Configuration
const CONFIG = {
    dataDir: path.join(__dirname, '../../data/task7'),
    sqlDir: path.join(__dirname, '../../sql'),
    files: {
        chinook: 'chinook.sql',
        happiness: 'happiness_index.sql',
        matViews: 'task7_materialized_views.sql',
        optimizations: 'task7_optimizations.sql',
        procedures: 'task7_procedures.sql'
    }
};

// Pool connection
let pool = null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(`  ${title}`, 'cyan');
    console.log('='.repeat(60));
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarn(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

/**
 * Initialize database connection
 */
async function initConnection() {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Test connection
    const client = await pool.connect();
    logInfo('Database connection established');
    client.release();
}

/**
 * Close database connection
 */
async function closeConnection() {
    if (pool) {
        await pool.end();
        logInfo('Database connection closed');
    }
}

/**
 * Execute SQL file with batch processing
 */
async function executeSQLFile(filePath, description) {
    const startTime = Date.now();
    logInfo(`Loading ${description}...`);

    try {
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute the SQL
        await pool.query(sql);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logSuccess(`${description} loaded in ${duration}s`);
        return true;
    } catch (error) {
        logError(`Failed to load ${description}: ${error.message}`);
        throw error;
    }
}

/**
 * Get table record counts
 */
async function getRecordCounts() {
    const tables = [
        { name: 'Artist', query: 'SELECT COUNT(*) FROM "Artist"' },
        { name: 'Album', query: 'SELECT COUNT(*) FROM "Album"' },
        { name: 'Track', query: 'SELECT COUNT(*) FROM "Track"' },
        { name: 'Customer', query: 'SELECT COUNT(*) FROM "Customer"' },
        { name: 'Invoice', query: 'SELECT COUNT(*) FROM "Invoice"' },
        { name: 'InvoiceLine', query: 'SELECT COUNT(*) FROM "InvoiceLine"' },
        { name: 'Genre', query: 'SELECT COUNT(*) FROM "Genre"' },
        { name: 'Happiness (2019)', query: 'SELECT COUNT(*) FROM "2019"' }
    ];

    const counts = {};

    for (const table of tables) {
        try {
            const result = await pool.query(table.query);
            counts[table.name] = parseInt(result.rows[0].count);
        } catch (e) {
            counts[table.name] = 'N/A';
        }
    }

    return counts;
}

/**
 * Run benchmark query and return execution time
 */
async function benchmarkQuery(name, sql) {
    const startTime = Date.now();

    try {
        const result = await pool.query(`EXPLAIN ANALYZE ${sql}`);
        const duration = Date.now() - startTime;

        // Extract execution time from EXPLAIN ANALYZE output
        const planRows = result.rows.map(r => r['QUERY PLAN']).join('\n');
        const execTimeMatch = planRows.match(/Execution Time: ([\d.]+) ms/);
        const execTime = execTimeMatch ? parseFloat(execTimeMatch[1]) : duration;

        return {
            name,
            executionTime: execTime,
            success: true
        };
    } catch (error) {
        return {
            name,
            executionTime: -1,
            success: false,
            error: error.message
        };
    }
}

/**
 * Run all benchmark queries
 */
async function runBenchmarks() {
    logSection('BENCHMARK RESULTS');

    const benchmarks = [
        {
            name: 'Artist Revenue Query (Direct)',
            sql: `SELECT a."Name", COUNT(DISTINCT al."AlbumId") AS albums, 
                  SUM(il."Quantity" * il."UnitPrice") AS revenue
                  FROM "Artist" a
                  JOIN "Album" al ON a."ArtistId" = al."ArtistId"
                  JOIN "Track" t ON al."AlbumId" = t."AlbumId"
                  JOIN "InvoiceLine" il ON t."TrackId" = il."TrackId"
                  GROUP BY a."ArtistId", a."Name"
                  ORDER BY revenue DESC LIMIT 10`
        },
        {
            name: 'Materialized View Query',
            sql: `SELECT * FROM mv_artist_sales_summary ORDER BY total_revenue DESC LIMIT 10`
        },
        {
            name: 'Customer Analysis by Country',
            sql: `SELECT c."Country", COUNT(DISTINCT c."CustomerId"), SUM(i."Total")
                  FROM "Customer" c JOIN "Invoice" i ON c."CustomerId" = i."CustomerId"
                  GROUP BY c."Country" ORDER BY SUM(i."Total") DESC`
        },
        {
            name: 'Genre Performance Query',
            sql: `SELECT g."Name", COUNT(t."TrackId") FROM "Genre" g
                  JOIN "Track" t ON g."GenreId" = t."GenreId"
                  GROUP BY g."GenreId", g."Name"`
        },
        {
            name: 'Happiness Score Filter',
            sql: `SELECT * FROM "2019" WHERE score > 6.0 ORDER BY score DESC`
        }
    ];

    console.log('\n' + '-'.repeat(50));
    console.log('| Query Name                       | Time (ms)  |');
    console.log('-'.repeat(50));

    for (const bench of benchmarks) {
        const result = await benchmarkQuery(bench.name, bench.sql);
        if (result.success) {
            const padName = bench.name.padEnd(32).substring(0, 32);
            const padTime = result.executionTime.toFixed(2).padStart(8);
            console.log(`| ${padName} | ${padTime} ms |`);
        } else {
            const padName = bench.name.padEnd(32).substring(0, 32);
            console.log(`| ${padName} | SKIPPED    |`);
        }
    }

    console.log('-'.repeat(50));
}

/**
 * Main ETL Pipeline
 */
async function runETL() {
    console.log('\n' + '═'.repeat(60));
    log('  TASK 7: PUBLIC DATASET ETL PIPELINE', 'bright');
    console.log('═'.repeat(60) + '\n');

    const startTime = Date.now();

    try {
        // Phase 1: Connect
        logSection('PHASE 1: CONNECT');
        await initConnection();

        // Phase 2: Load Chinook Dataset
        logSection('PHASE 2: LOAD CHINOOK DATASET');
        await executeSQLFile(
            path.join(CONFIG.dataDir, CONFIG.files.chinook),
            'Chinook Database (artists, albums, tracks, invoices)'
        );

        // Phase 3: Load Happiness Dataset
        logSection('PHASE 3: LOAD HAPPINESS DATASET');
        await executeSQLFile(
            path.join(CONFIG.dataDir, CONFIG.files.happiness),
            'World Happiness Index (156 countries)'
        );

        // Phase 4: Apply Optimizations
        logSection('PHASE 4: APPLY OPTIMIZATIONS');

        // Load indexes
        try {
            await executeSQLFile(
                path.join(CONFIG.sqlDir, CONFIG.files.optimizations),
                'Strategic Indexes'
            );
        } catch (e) {
            logWarn('Some optimization queries are for demo only (EXPLAIN ANALYZE)');
        }

        // Load stored procedures
        await executeSQLFile(
            path.join(CONFIG.sqlDir, CONFIG.files.procedures),
            'Stored Procedures'
        );

        // Load materialized views
        await executeSQLFile(
            path.join(CONFIG.sqlDir, CONFIG.files.matViews),
            'Materialized Views'
        );

        // Phase 5: Verify Data
        logSection('PHASE 5: VERIFY DATA');
        const counts = await getRecordCounts();

        console.log('\n📊 Record Counts:');
        console.log('-'.repeat(35));
        for (const [table, count] of Object.entries(counts)) {
            console.log(`  ${table.padEnd(20)} ${String(count).padStart(10)}`);
        }
        console.log('-'.repeat(35));

        // Phase 6: Run Benchmarks
        await runBenchmarks();

        // Summary
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

        logSection('✅ ETL COMPLETE');
        console.log(`\n⏱️  Total execution time: ${totalDuration}s`);
        console.log('\nNext steps:');
        console.log('  1. Run queries against materialized views');
        console.log('  2. Test stored procedures');
        console.log('  3. Compare query performance before/after indexes');

    } catch (error) {
        logError(`ETL Pipeline failed: ${error.message}`);
        console.error(error);
        throw error;
    } finally {
        await closeConnection();
    }
}

// Run the pipeline
runETL().catch(console.error);
