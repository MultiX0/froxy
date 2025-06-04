const { Pool } = require('pg');
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, '../../.env') });


// Create PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || "postgres",
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10, // Maximum number of clients in the pool
    min: 2,
    idleTimeoutMillis: 60000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 1 second if connection could not be established
    acquireTimeoutMillis: 30000,
    statement_timeout: 30000,
    query_timeout: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

// Test the connection
pool.on('connect', (client) => {
    console.log('Connected to PostgreSQL database');
    
    // Set additional client-level timeouts
    client.query('SET statement_timeout = 30000'); // 30 seconds
    client.query('SET idle_in_transaction_session_timeout = 60000'); // 60 seconds
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:', err);
    console.log('Attempting to recover from database error...');
});

pool.on('acquire', () => {
    console.log('Client acquired from pool');
});

pool.on('release', () => {
    console.log('Client released back to pool');
});

// Helper function to execute queries
const query = async (text, params, retries = 3) => {
    const start = Date.now();
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Query attempt ${attempt}/${retries}`);
            const res = await pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query successfully', { 
                text: text.substring(0, 100) + '...', 
                duration, 
                rows: res.rowCount,
                attempt 
            });
            return res;
        } catch (error) {
            lastError = error;
            console.error(`Database query error (attempt ${attempt}/${retries}):`, {
                message: error.message,
                code: error.code,
                query: text.toString().substring(0, 100) + '...'
            });
            
            // If this isn't the last attempt, wait before retrying
            if (attempt < retries) {
                const waitTime = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
                console.log(`Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // For connection errors, try to recover the pool
            if (error.code === 'ECONNRESET' || error.message.includes('Connection terminated')) {
                console.log('Connection error detected, forcing pool refresh...');
                // Don't end the pool, just let it recover
            }
        }
    }
    
    throw lastError;
};

// Helper function to get a client from the pool for transactions
const getClient = async (timeout = 10000) => {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Client acquisition timeout')), timeout);
    });
    
    try {
        const client = await Promise.race([
            pool.connect(),
            timeoutPromise
        ]);
        return client;
    } catch (error) {
        console.error('Error acquiring client:', error);
        throw error;
    }
};

const healthCheck = async () => {
    try {
        const result = await query('SELECT NOW() as current_time', []);
        console.log('Database health check passed:', result.rows[0]);
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
};

const closePool = async () => {
    try {
        console.log('Closing database pool...');
        await pool.end();
        process.exit(-1);
    } catch (error) {
        console.error('Error closing pool:', error);
    }
};

process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);


module.exports = {
    pool,
    query,
    getClient,
    closePool,
    healthCheck
};