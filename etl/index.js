/**
 * ETL Pipeline - Main Entry Point
 * 
 * This pipeline:
 * 1. EXTRACTS data from CSV files
 * 2. TRANSFORMS (cleans, validates, standardizes)
 * 3. LOADS into PostgreSQL/NeonDB
 * 
 * Run: node etl/index.js
 */

import 'dotenv/config';
import { extractAll } from './extract.js';
import { extractPendingRegistrations, validatePendingRegistrations } from './pending-registrations.js';
import { transformStudents, transformEnrollments } from './transform.js';
import {
    initConnection,
    closeConnection,
    getDepartmentMap,
    getStudentMap,
    getCourseSet,
    loadStudents,
    loadEnrollments,
    getRecordCounts
} from './load.js';
import { logger } from './utils/logger.js';

async function runETL() {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 ETL Pipeline Starting');
    console.log('='.repeat(50) + '\n');

    const startTime = Date.now();

    try {
        // =====================================================
        // Phase 1: EXTRACT
        // =====================================================
        logger.info('=== PHASE 1: EXTRACT ===');
        const rawData = extractAll();

        // =====================================================
        // Phase 2: Initialize DB Connection & Get Lookups
        // =====================================================
        logger.info('=== PHASE 2: CONNECT ===');
        initConnection(process.env.DATABASE_URL);

        // Get lookup tables from database
        const departmentMap = await getDepartmentMap();
        const courseSet = await getCourseSet();

        // =====================================================
        // Phase 3: TRANSFORM
        // =====================================================
        logger.info('=== PHASE 3: TRANSFORM ===');

        // Transform students (messy -> clean)
        const cleanStudents = transformStudents(rawData.students, departmentMap);

        // =====================================================
        // Phase 4: LOAD Students
        // =====================================================
        logger.info('=== PHASE 4: LOAD ===');
        await loadStudents(cleanStudents);

        // Now get student map for enrollment transformation
        const studentMap = await getStudentMap();

        // =====================================================
        // Phase 5: TRANSFORM & LOAD Enrollments
        // =====================================================
        const cleanEnrollments = transformEnrollments(
            rawData.enrollments,
            studentMap,
            courseSet
        );

        await loadEnrollments(cleanEnrollments);

        // =====================================================
        // Phase 6: Verify & Report
        // =====================================================
        logger.info('=== PHASE 5: VERIFY ===');
        const counts = await getRecordCounts();
        logger.success(`Final counts - Students: ${counts.students}, Enrollments: ${counts.enrollments}`);

    } catch (error) {
        logger.error('ETL Pipeline failed', error);
        throw error;

    } finally {
        await closeConnection();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️  Total execution time: ${duration}s`);

        // Print summary
        logger.summary();
    }
}

async function runPendingRegistrations() {
    console.log('\n' + '='.repeat(50));
    console.log('📤 Processing Pending Registrations from Apps Script');
    console.log('='.repeat(50) + '\n');

    const startTime = Date.now();

    try {
        // =====================================================
        // Phase 1: EXTRACT from JSON
        // =====================================================
        logger.info('=== PHASE 1: EXTRACT ===');
        const pendingStudents = await extractPendingRegistrations();

        // =====================================================
        // Phase 2: VALIDATE
        // =====================================================
        logger.info('=== PHASE 2: VALIDATE ===');
        const validation = validatePendingRegistrations(pendingStudents);

        if (validation.invalid.length > 0) {
            logger.warn(`Found ${validation.invalid.length} invalid entries:`);
            validation.invalid.forEach(inv => {
                logger.warn(`  Row ${inv.index}: ${inv.errors.join(', ')}`);
            });
        }

        logger.info(`✅ ${validation.valid.length} valid students ready for processing`);

        if (validation.valid.length === 0) {
            logger.warn('No valid students to process. Exiting.');
            return;
        }

        // =====================================================
        // Phase 3: Initialize DB Connection & Get Lookups
        // =====================================================
        logger.info('=== PHASE 3: CONNECT ===');
        initConnection(process.env.DATABASE_URL);

        const departmentMap = await getDepartmentMap();

        // =====================================================
        // Phase 4: TRANSFORM
        // =====================================================
        logger.info('=== PHASE 4: TRANSFORM ===');

        // Transform students (already clean from Apps Script validation)
        const cleanStudents = transformStudents(validation.valid, departmentMap);

        // =====================================================
        // Phase 5: LOAD
        // =====================================================
        logger.info('=== PHASE 5: LOAD ===');
        await loadStudents(cleanStudents);

        // =====================================================
        // Phase 6: Verify & Report
        // =====================================================
        logger.info('=== PHASE 6: VERIFY ===');
        const counts = await getRecordCounts();
        logger.success(`✅ Successfully registered ${validation.valid.length} students!`);
        logger.success(`📊 Total database counts - Students: ${counts.students}, Enrollments: ${counts.enrollments}`);

        console.log('\n' + '='.repeat(50));
        console.log('📋 NEXT STEPS:');
        console.log('='.repeat(50));
        console.log('1. Go back to Google Sheets');
        console.log('2. Menu: "📋 Student Registration (Option 1)"');
        console.log('3. Click: "🗑️ Clear Processed Rows"');
        console.log('4. This clears the "Pending Registration" sheet');
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        logger.error('Pending registrations processing failed', error);
        throw error;

    } finally {
        await closeConnection();

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️  Total execution time: ${duration}s`);

        // Print summary
        logger.summary();
    }
}

// Check command line arguments
const args = process.argv.slice(2);
const isPendingMode = args.includes('--pending');

// Run the appropriate pipeline
if (isPendingMode) {
    console.log('🔄 Mode: Pending Registrations (Apps Script → ETL)\n');
    runPendingRegistrations().catch(console.error);
} else {
    console.log('🔄 Mode: Standard ETL (CSV → DB)\n');
    runETL().catch(console.error);
}
