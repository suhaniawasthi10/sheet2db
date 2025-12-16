/**
 * Load Module
 * Inserts transformed data into PostgreSQL/NeonDB
 */

import pg from 'pg';
import { logger } from './utils/logger.js';

const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection pool
 */
export function initConnection(connectionString) {
    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    logger.info('Database connection pool initialized');
}

/**
 * Close database connection
 */
export async function closeConnection() {
    if (pool) {
        await pool.end();
        logger.info('Database connection closed');
    }
}

/**
 * Get department mapping (name -> id)
 */
export async function getDepartmentMap() {
    const result = await pool.query('SELECT department_id, department_name FROM department');
    const map = {};
    for (const row of result.rows) {
        map[row.department_name] = row.department_id;
    }
    logger.info(`Loaded ${Object.keys(map).length} departments from database`);
    return map;
}

/**
 * Get student mapping (email -> id)
 */
export async function getStudentMap() {
    const result = await pool.query('SELECT student_id, student_email FROM student');
    const map = {};
    for (const row of result.rows) {
        map[row.student_email] = row.student_id;
    }
    return map;
}

/**
 * Get course set (valid course IDs - VARCHAR codes like 'CS101')
 */
export async function getCourseSet() {
    const result = await pool.query('SELECT course_id FROM course');
    return new Set(result.rows.map(row => row.course_id));
}

/**
 * Load students into database
 * Uses INSERT ... ON CONFLICT to handle duplicates gracefully
 */
export async function loadStudents(students) {
    logger.info(`Loading ${students.length} students into database...`);

    let loaded = 0;

    for (const student of students) {
        try {
            await pool.query(`
                INSERT INTO student (
                    student_first_name,
                    student_last_name,
                    student_email,
                    student_date_of_birth,
                    student_year,
                    student_phone_number,
                    department_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (student_email) DO UPDATE SET
                    student_first_name = EXCLUDED.student_first_name,
                    student_last_name = EXCLUDED.student_last_name,
                    student_date_of_birth = EXCLUDED.student_date_of_birth,
                    student_year = EXCLUDED.student_year,
                    student_phone_number = EXCLUDED.student_phone_number,
                    department_id = EXCLUDED.department_id
            `, [
                student.student_first_name,
                student.student_last_name,
                student.student_email,
                student.student_date_of_birth,
                student.student_year,
                student.student_phone_number,
                student.department_id
            ]);
            loaded++;
        } catch (error) {
            logger.error(`Failed to insert student ${student.student_email}`, error);
        }
    }

    logger.stats.loaded += loaded;
    logger.success(`Loaded ${loaded} students`);
    return loaded;
}

/**
 * Load enrollments into database
 * course_id is VARCHAR (e.g., 'CS101')
 */
export async function loadEnrollments(enrollments) {
    logger.info(`Loading ${enrollments.length} enrollments into database...`);

    let loaded = 0;

    for (const enrollment of enrollments) {
        try {
            await pool.query(`
                INSERT INTO enrollment (student_id, course_id, grade, enrollment_date)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (student_id, course_id) DO UPDATE SET
                    grade = EXCLUDED.grade,
                    enrollment_date = EXCLUDED.enrollment_date
            `, [
                enrollment.student_id,
                enrollment.course_id,  // VARCHAR like 'CS101'
                enrollment.grade,
                enrollment.enrollment_date
            ]);
            loaded++;
        } catch (error) {
            logger.error(`Failed to insert enrollment`, error);
        }
    }

    logger.stats.loaded += loaded;
    logger.success(`Loaded ${loaded} enrollments`);
    return loaded;
}

/**
 * Get current record counts
 */
export async function getRecordCounts() {
    const students = await pool.query('SELECT COUNT(*) FROM student');
    const enrollments = await pool.query('SELECT COUNT(*) FROM enrollment');

    return {
        students: parseInt(students.rows[0].count),
        enrollments: parseInt(enrollments.rows[0].count)
    };
}
