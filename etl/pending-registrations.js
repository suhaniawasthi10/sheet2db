/**
 * ETL Extract Module: Pending Registrations
 * Reads validated student data from Apps Script JSON export
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract pending registrations from JSON file
 * @returns {Promise<Array>} Array of student objects
 */
export async function extractPendingRegistrations() {
    const filePath = path.join(__dirname, '../data/pending-registrations.json');

    console.log('📥 Extracting pending registrations from:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        console.log('\n💡 Instructions:');
        console.log('1. Open Google Sheets with your student data');
        console.log('2. Click "📋 Student Registration (Option 1)" menu');
        console.log('3. Click "📤 Export Pending as JSON"');
        console.log('4. Copy the JSON and save as: data/pending-registrations.json');
        console.log('5. Run: npm run etl -- --pending\n');
        throw new Error('pending-registrations.json not found');
    }

    // Read and parse JSON
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.students || !Array.isArray(data.students)) {
        throw new Error('Invalid JSON format: "students" array not found');
    }

    console.log(`✅ Found ${data.students.length} pending registrations`);
    console.log(`📅 Exported at: ${data.exportedAt}`);

    return data.students;
}

/**
 * Validate pending registration data
 * @param {Array} students - Array of student objects
 * @returns {Object} Validation result with valid/invalid students
 */
export function validatePendingRegistrations(students) {
    const valid = [];
    const invalid = [];

    students.forEach((student, index) => {
        const errors = [];

        // Required fields
        if (!student.firstName) errors.push('Missing firstName');
        if (!student.lastName) errors.push('Missing lastName');
        if (!student.email) errors.push('Missing email');
        if (!student.year) errors.push('Missing year');
        if (!student.department) errors.push('Missing department');

        // Email format
        if (student.email && !student.email.includes('@')) {
            errors.push('Invalid email format');
        }

        // Year range
        if (student.year && (student.year < 1 || student.year > 4)) {
            errors.push('Year must be between 1 and 4');
        }

        if (errors.length === 0) {
            valid.push(student);
        } else {
            invalid.push({
                index: index + 1,
                student,
                errors
            });
        }
    });

    return { valid, invalid };
}
