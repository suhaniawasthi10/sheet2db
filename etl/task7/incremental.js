/**
 * Task 7 - Incremental Ingestion Module
 * 
 * Demonstrates incremental data loading with change tracking
 * 
 * Run: node etl/task7/incremental.js
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection
 */
async function initConnection() {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Database connected');
}

/**
 * Close database connection
 */
async function closeConnection() {
    if (pool) {
        await pool.end();
        console.log('✅ Database connection closed');
    }
}

/**
 * Create sync tracking table if not exists
 */
async function ensureSyncTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS etl_sync_log (
            sync_id SERIAL PRIMARY KEY,
            table_name VARCHAR(100) NOT NULL,
            sync_type VARCHAR(20) NOT NULL,
            records_processed INT DEFAULT 0,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            status VARCHAR(20) DEFAULT 'running',
            error_message TEXT
        )
    `);
    console.log('✅ Sync tracking table ready');
}

/**
 * Log sync start
 */
async function logSyncStart(tableName, syncType) {
    const result = await pool.query(`
        INSERT INTO etl_sync_log (table_name, sync_type)
        VALUES ($1, $2)
        RETURNING sync_id
    `, [tableName, syncType]);
    return result.rows[0].sync_id;
}

/**
 * Log sync completion
 */
async function logSyncComplete(syncId, recordsProcessed, status = 'success', errorMessage = null) {
    await pool.query(`
        UPDATE etl_sync_log
        SET completed_at = CURRENT_TIMESTAMP,
            records_processed = $2,
            status = $3,
            error_message = $4
        WHERE sync_id = $1
    `, [syncId, recordsProcessed, status, errorMessage]);
}

/**
 * Get last successful sync time for a table
 */
async function getLastSyncTime(tableName) {
    const result = await pool.query(`
        SELECT MAX(completed_at) as last_sync
        FROM etl_sync_log
        WHERE table_name = $1 AND status = 'success'
    `, [tableName]);
    return result.rows[0]?.last_sync || null;
}

/**
 * Upsert happiness data (incremental)
 * Demonstrates ON CONFLICT DO UPDATE pattern
 */
async function upsertHappinessData(records) {
    const syncId = await logSyncStart('2019', 'incremental');
    let processed = 0;

    try {
        for (const record of records) {
            await pool.query(`
                INSERT INTO "2019" (
                    overall_rank, country_or_region, score,
                    gdp_per_capita, social_support, healthy_life_expectancy,
                    freedom_to_make_life_choices, generosity, perceptions_of_corruption
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (overall_rank) DO UPDATE SET
                    country_or_region = EXCLUDED.country_or_region,
                    score = EXCLUDED.score,
                    gdp_per_capita = EXCLUDED.gdp_per_capita,
                    social_support = EXCLUDED.social_support,
                    healthy_life_expectancy = EXCLUDED.healthy_life_expectancy,
                    freedom_to_make_life_choices = EXCLUDED.freedom_to_make_life_choices,
                    generosity = EXCLUDED.generosity,
                    perceptions_of_corruption = EXCLUDED.perceptions_of_corruption
            `, [
                record.rank,
                record.country,
                record.score,
                record.gdp,
                record.socialSupport,
                record.lifeExpectancy,
                record.freedom,
                record.generosity,
                record.corruption
            ]);
            processed++;
        }

        await logSyncComplete(syncId, processed, 'success');
        console.log(`✅ Upserted ${processed} happiness records`);
        return processed;
    } catch (error) {
        await logSyncComplete(syncId, processed, 'failed', error.message);
        throw error;
    }
}

/**
 * Batch insert using COPY-like approach
 * More efficient for bulk inserts
 */
async function batchInsert(tableName, columns, values) {
    const syncId = await logSyncStart(tableName, 'batch');

    try {
        // Build multi-row INSERT
        const placeholders = values.map((_, i) => {
            const offset = i * columns.length;
            return `(${columns.map((_, j) => `$${offset + j + 1}`).join(', ')})`;
        }).join(', ');

        const flatValues = values.flat();

        const sql = `
            INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
            VALUES ${placeholders}
            ON CONFLICT DO NOTHING
        `;

        const result = await pool.query(sql, flatValues);
        await logSyncComplete(syncId, result.rowCount, 'success');

        console.log(`✅ Batch inserted ${result.rowCount} records into ${tableName}`);
        return result.rowCount;
    } catch (error) {
        await logSyncComplete(syncId, 0, 'failed', error.message);
        throw error;
    }
}

/**
 * Refresh materialized views after data changes
 */
async function refreshMatViews() {
    console.log('\n🔄 Refreshing materialized views...');

    const views = [
        'mv_artist_sales_summary',
        'mv_genre_popularity',
        'mv_customer_lifetime_value'
    ];

    for (const view of views) {
        try {
            await pool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
            console.log(`  ✅ Refreshed ${view}`);
        } catch (error) {
            console.log(`  ⚠️  Could not refresh ${view}: ${error.message}`);
        }
    }
}

/**
 * Get sync history
 */
async function getSyncHistory(limit = 10) {
    const result = await pool.query(`
        SELECT 
            table_name,
            sync_type,
            records_processed,
            started_at,
            completed_at,
            status,
            EXTRACT(EPOCH FROM (completed_at - started_at))::NUMERIC(10,2) as duration_seconds
        FROM etl_sync_log
        ORDER BY started_at DESC
        LIMIT $1
    `, [limit]);

    return result.rows;
}

/**
 * Demo incremental ingestion
 */
async function runDemo() {
    console.log('\n' + '='.repeat(50));
    console.log('  TASK 7: INCREMENTAL INGESTION DEMO');
    console.log('='.repeat(50) + '\n');

    try {
        await initConnection();
        await ensureSyncTable();

        // Demo: Upsert sample happiness data
        const sampleData = [
            { rank: 200, country: 'TestLand', score: 5.5, gdp: 1.0, socialSupport: 1.2, lifeExpectancy: 0.8, freedom: 0.5, generosity: 0.2, corruption: 0.1 },
            { rank: 201, country: 'DemoNation', score: 6.0, gdp: 1.1, socialSupport: 1.3, lifeExpectancy: 0.9, freedom: 0.6, generosity: 0.3, corruption: 0.2 }
        ];

        console.log('📤 Upserting sample happiness data...');
        await upsertHappinessData(sampleData);

        // Refresh views
        await refreshMatViews();

        // Show sync history
        console.log('\n📋 Sync History:');
        const history = await getSyncHistory(5);
        console.table(history);

        // Cleanup demo data
        console.log('\n🧹 Cleaning up demo data...');
        await pool.query(`DELETE FROM "2019" WHERE overall_rank >= 200`);
        console.log('✅ Demo data removed');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    } finally {
        await closeConnection();
    }
}

// Run demo if executed directly
runDemo().catch(console.error);

// Export functions for use in other modules
export {
    initConnection,
    closeConnection,
    ensureSyncTable,
    upsertHappinessData,
    batchInsert,
    refreshMatViews,
    getSyncHistory,
    getLastSyncTime
};
