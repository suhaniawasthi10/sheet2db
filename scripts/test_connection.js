import 'dotenv/config';

// 'pg' is the PostgreSQL client library for Node.js
// We use Pool instead of Client because:
// - Pool manages MULTIPLE connections (like a "pool" of workers)
// - When your app gets many requests, Pool reuses connections efficiently
// - Client is just ONE connection - if it's busy, other requests wait
import pg from 'pg';
const { Pool } = pg;

// STEP 3: Create the Connection Pool
const pool = new Pool({
    // connectionString: The full URL containing host, user, password, database
    // Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    connectionString: process.env.DATABASE_URL,

    // ssl: Required for NeonDB (and most cloud databases)
    // rejectUnauthorized: false allows self-signed certificates
    // In production, you'd configure this more securely
    ssl: {
        rejectUnauthorized: false
    }
});


// STEP 4: Test the Connection
// We run a simple query that returns the current timestamp
// If this works, we know:
// 1. Network connection to NeonDB is working
// 2. Credentials are correct
// 3. Database exists and is accessible

async function testConnection() {
    try {
        // pool.query() sends SQL to the database and waits for response
        const result = await pool.query('SELECT NOW() as current_time');
        // result.rows is an array of row objects
        // result.rows[0] is the first (and only) row
        console.log('✅ Connected to PostgreSQL/NeonDB successfully!');
        console.log('📅 Server time:', result.rows[0].current_time);

    } catch (error) {
        console.error('❌ Connection failed!');
        console.error('Error:', error.message);
        console.error('Full error:', error);
        console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
        console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30) + '...');

    } finally {
        // ALWAYS close the pool when done
        // This releases all connections back to NeonDB
        // If you don't do this, the script hangs forever
        await pool.end();
        console.log('🔌 Connection pool closed.');
    }
}

testConnection();
