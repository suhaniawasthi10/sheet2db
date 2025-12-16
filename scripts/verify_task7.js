/**
 * Task 7 - Verification Queries
 * 
 * Tests stored procedures and materialized views
 * 
 * Run: node scripts/verify_task7.js
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function verify() {
    console.log('\n' + '═'.repeat(60));
    console.log('  TASK 7: VERIFICATION QUERIES');
    console.log('═'.repeat(60) + '\n');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Test 1: Materialized View - Top Artists by Revenue
        console.log('📊 TEST 1: Materialized View - Artist Sales Summary');
        console.log('-'.repeat(50));
        try {
            const result = await pool.query(`
                SELECT artist_name, total_albums, total_tracks, 
                       ROUND(total_revenue::numeric, 2) as revenue
                FROM mv_artist_sales_summary 
                ORDER BY total_revenue DESC 
                LIMIT 5
            `);
            console.table(result.rows);
        } catch (e) {
            console.log('⚠️ Could not query mv_artist_sales_summary');
        }

        // Test 2: Stored Procedure - Top Artists
        console.log('\n📊 TEST 2: Stored Procedure - get_top_artists(5)');
        console.log('-'.repeat(50));
        try {
            const result = await pool.query('SELECT * FROM get_top_artists(5)');
            console.table(result.rows.map(r => ({
                artist: r.artist_name?.substring(0, 25) || 'N/A',
                albums: r.total_albums,
                tracks: r.total_tracks,
                revenue: parseFloat(r.total_revenue || 0).toFixed(2)
            })));
        } catch (e) {
            console.log('⚠️ Error:', e.message);
        }

        // Test 3: Genre Report
        console.log('\n📊 TEST 3: Stored Procedure - get_genre_report()');
        console.log('-'.repeat(50));
        try {
            const result = await pool.query('SELECT * FROM get_genre_report() LIMIT 5');
            console.table(result.rows.map(r => ({
                genre: r.genre_name?.substring(0, 15) || 'N/A',
                tracks: r.track_count,
                albums: r.album_count,
                revenue: parseFloat(r.total_revenue || 0).toFixed(2)
            })));
        } catch (e) {
            console.log('⚠️ Error:', e.message);
        }

        // Test 4: Happiness Threshold
        console.log('\n📊 TEST 4: Stored Procedure - get_happiness_by_threshold(7.0)');
        console.log('-'.repeat(50));
        try {
            const result = await pool.query('SELECT * FROM get_happiness_by_threshold(7.0)');
            console.table(result.rows.map(r => ({
                rank: r.rank,
                country: r.country,
                score: parseFloat(r.happiness_score || 0).toFixed(2)
            })));
        } catch (e) {
            console.log('⚠️ Error:', e.message);
        }

        // Test 5: Compare Countries
        console.log('\n📊 TEST 5: Stored Procedure - compare_countries()');
        console.log('-'.repeat(50));
        try {
            const result = await pool.query(`SELECT * FROM compare_countries('India', 'Finland')`);
            console.table(result.rows.map(r => ({
                metric: r.metric,
                india: parseFloat(r.country1_value || 0).toFixed(2),
                finland: parseFloat(r.country2_value || 0).toFixed(2),
                diff: parseFloat(r.difference || 0).toFixed(2)
            })));
        } catch (e) {
            console.log('⚠️ Error:', e.message);
        }

        // Test 6: Monthly Revenue
        console.log('\n📊 TEST 6: Stored Procedure - get_monthly_revenue_report(2009)');
        console.log('-'.repeat(50));
        try {
            const result = await pool.query('SELECT * FROM get_monthly_revenue_report(2009)');
            console.table(result.rows.map(r => ({
                month: r.month_name?.trim() || 'N/A',
                orders: r.order_count,
                revenue: parseFloat(r.total_revenue || 0).toFixed(2)
            })));
        } catch (e) {
            console.log('⚠️ Error:', e.message);
        }

        // Summary
        console.log('\n' + '═'.repeat(60));
        console.log('  ✅ VERIFICATION COMPLETE');
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verify().catch(console.error);
