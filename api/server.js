/**
 * Auto-Registration API Server
 * Accepts student data from Google Apps Script and inserts into NeonDB
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import {
    isValidEmail,
    normalizeEmail,
    isValidYear,
    parseYear,
    standardizeDepartment,
    parseDate,
    isValidDateOfBirth,
    isValidPhoneNumber,
    normalizePhoneNumber,
    cleanString
} from '../etl/utils/validators.js';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors()); // Allow requests from Google Apps Script
app.use(express.json());

// API Key Authentication Middleware
const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] ||
        req.headers['authorization']?.replace('Bearer ', '');

    if (!process.env.API_SECRET_KEY) {
        console.warn('⚠️  API_SECRET_KEY not set in environment');
        return next(); // Allow if no key configured (dev mode)
    }

    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
        console.log('❌ Unauthorized request - invalid API key');
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Invalid API key'
        });
    }

    console.log('✅ API key verified');
    next();
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * POST /api/students
 * Register a new student from Google Sheets
 * 
 * Body: {
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   dateOfBirth: string (YYYY-MM-DD or DD/MM/YYYY),
 *   year: number | string,
 *   phoneNumber: string,
 *   department: string
 * }
 */
app.post('/api/students', authenticateAPIKey, async (req, res) => {
    console.log('📥 Received registration request:', req.body);

    const {
        firstName,
        lastName,
        email,
        dateOfBirth,
        year,
        phoneNumber,
        department
    } = req.body;

    const errors = [];

    // 1. Validate first name
    const cleanFirstName = cleanString(firstName);
    if (!cleanFirstName) {
        errors.push('First name is required');
    }

    // 2. Validate last name
    const cleanLastName = cleanString(lastName);
    if (!cleanLastName) {
        errors.push('Last name is required');
    }

    // 3. Validate and normalize email
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        errors.push('Invalid email format');
    }

    // 4. Validate and parse date of birth
    const parsedDOB = parseDate(dateOfBirth);
    if (!parsedDOB || !isValidDateOfBirth(parsedDOB)) {
        errors.push('Invalid date of birth or student under 16 years old');
    }

    // 5. Validate and parse year
    const parsedYear = parseYear(year);
    if (!parsedYear || !isValidYear(parsedYear)) {
        errors.push('Year must be between 1 and 4');
    }

    // 6. Validate and normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone || !isValidPhoneNumber(normalizedPhone)) {
        errors.push('Invalid phone number format');
    }

    // 7. Validate and standardize department
    const standardizedDept = standardizeDepartment(department);
    if (!standardizedDept) {
        errors.push(`Unknown department: ${department}`);
    }

    // If validation errors, return 400
    if (errors.length > 0) {
        console.log('❌ Validation failed:', errors);
        return res.status(400).json({
            success: false,
            errors: errors
        });
    }

    try {
        // Get department_id
        const deptResult = await pool.query(
            'SELECT department_id FROM department WHERE department_name = $1',
            [standardizedDept]
        );

        if (deptResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                errors: [`Department "${standardizedDept}" not found in database`]
            });
        }

        const departmentId = deptResult.rows[0].department_id;

        // Check if email already exists
        const existingStudent = await pool.query(
            'SELECT student_id FROM student WHERE student_email = $1',
            [normalizedEmail]
        );

        if (existingStudent.rows.length > 0) {
            return res.status(409).json({
                success: false,
                errors: ['Student with this email already exists']
            });
        }

        // Insert student
        const result = await pool.query(
            `INSERT INTO student (
                student_first_name,
                student_last_name,
                student_email,
                student_date_of_birth,
                student_year,
                student_phone_number,
                department_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING student_id, student_email`,
            [
                cleanFirstName,
                cleanLastName,
                normalizedEmail,
                parsedDOB,
                parsedYear,
                normalizedPhone,
                departmentId
            ]
        );

        console.log('✅ Student registered:', result.rows[0]);

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            data: {
                studentId: result.rows[0].student_id,
                email: result.rows[0].student_email
            }
        });

    } catch (error) {
        console.error('❌ Database error:', error);

        res.status(500).json({
            success: false,
            errors: ['Internal server error: ' + error.message]
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Auto-Registration API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`📮 Register student: POST http://localhost:${PORT}/api/students`);
    console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await pool.end();
    process.exit(0);
});
