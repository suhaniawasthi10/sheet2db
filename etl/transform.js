/**
 * Transform Module
 * Cleans, validates, and transforms extracted data
 */

import { logger } from './utils/logger.js';
import {
    isValidEmail,
    normalizeEmail,
    isValidYear,
    parseYear,
    standardizeDepartment,
    isValidGrade,
    parseDate,
    cleanString,
    isValidDateOfBirth,
    isValidPhoneNumber,
    normalizePhoneNumber,
    parseName
} from './utils/validators.js';

/**
 * Transform students data
 * - Remove duplicates (by email)
 * - Validate email format
 * - Normalize email case
 * - Validate year (1-4)
 * - Validate DOB (16+ years old)
 * - Validate phone number
 * - Standardize department names
 */
export function transformStudents(students, departmentMap) {
    logger.info('Transforming students data...');

    const transformed = [];
    const seenEmails = new Set();

    for (const student of students) {
        const rowId = student.student_id || 'unknown';

        // 1. Clean and normalize email (support both formats)
        const emailRaw = student.email || student.student_email;
        const email = normalizeEmail(emailRaw);

        // 2. Validate email
        if (!email || !isValidEmail(email)) {
            logger.warn(`Row ${rowId}: Invalid or missing email "${emailRaw}"`, student);
            continue;
        }

        // 3. Check for duplicates
        if (seenEmails.has(email)) {
            logger.warn(`Row ${rowId}: Duplicate email "${email}"`, student);
            continue;
        }
        seenEmails.add(email);

        // 4. Parse and validate year (support both formats)
        const yearRaw = student.year || student.student_year;
        const year = parseYear(yearRaw);
        if (!year || !isValidYear(year)) {
            logger.warn(`Row ${rowId}: Invalid year "${yearRaw}"`, student);
            continue;
        }

        // 5. Parse and validate date of birth (support both formats)
        const dobRaw = student.date_of_birth || student.dateOfBirth || student.student_date_of_birth;
        const dob = parseDate(dobRaw);
        if (!dob || !isValidDateOfBirth(dob)) {
            logger.warn(`Row ${rowId}: Invalid DOB or student under 16 "${dobRaw}"`, student);
            continue;
        }

        // 6. Validate and normalize phone number (support both formats)
        const phoneRaw = student.phone_number || student.phoneNumber || student.student_phone_number;
        const phone = normalizePhoneNumber(phoneRaw);
        if (!phone || !isValidPhoneNumber(phone)) {
            logger.warn(`Row ${rowId}: Invalid phone number "${phoneRaw}"`, student);
            continue;
        }

        // 7. Standardize department (support both formats)
        const departmentRaw = student.department || student.department_name;
        const department = standardizeDepartment(departmentRaw);
        if (!department) {
            logger.warn(`Row ${rowId}: Unknown department "${departmentRaw}"`, student);
            continue;
        }

        // 8. Look up department_id
        const departmentId = departmentMap[department];
        if (!departmentId) {
            logger.warn(`Row ${rowId}: Department "${department}" not in database`, student);
            continue;
        }

        // 9. Parse first and last name (support multiple formats)
        let firstName, lastName;
        if (student.first_name && student.last_name) {
            // CSV format: first_name, last_name
            firstName = cleanString(student.first_name);
            lastName = cleanString(student.last_name);
        } else if (student.firstName && student.lastName) {
            // Apps Script format: firstName, lastName
            firstName = cleanString(student.firstName);
            lastName = cleanString(student.lastName);
        } else if (student.name) {
            // Full name format: split into first/last
            const parsed = parseName(student.name);
            firstName = parsed.firstName;
            lastName = parsed.lastName;
        } else {
            logger.warn(`Row ${rowId}: Missing name`, student);
            continue;
        }

        if (!firstName) {
            logger.warn(`Row ${rowId}: Missing first name`, student);
            continue;
        }

        // All validations passed - add to transformed
        transformed.push({
            student_first_name: firstName,
            student_last_name: lastName || '',
            student_email: email,
            student_date_of_birth: dob,
            student_year: year,
            student_phone_number: phone,
            department_id: departmentId
        });
    }

    logger.stats.transformed += transformed.length;
    logger.success(`Transformed ${transformed.length} valid students (${students.length - transformed.length} skipped)`);

    return transformed;
}

/**
 * Transform enrollments data
 * - Validate student exists
 * - Validate course exists (VARCHAR course_code)
 * - Validate grade format (A, A-, B, B-, C, C-, D, F - note: B+ is NOT valid)
 * - Parse dates
 * - Remove duplicates (student + course)
 */
export function transformEnrollments(enrollments, studentMap, courseSet) {
    logger.info('Transforming enrollments data...');

    const transformed = [];
    const seenCombos = new Set();

    for (const enrollment of enrollments) {
        const rowId = enrollment.enrollment_id || 'unknown';

        // 1. Normalize email and look up student
        const email = normalizeEmail(enrollment.student_email);
        const studentId = studentMap[email];

        if (!studentId) {
            logger.warn(`Row ${rowId}: Student "${email}" not found`, enrollment);
            continue;
        }

        // 2. Validate course exists (VARCHAR course_code)
        const courseId = cleanString(enrollment.course_code);
        if (!courseId || !courseSet.has(courseId)) {
            logger.warn(`Row ${rowId}: Course "${courseId}" not found`, enrollment);
            continue;
        }

        // 3. Check for duplicate enrollment
        const combo = `${studentId}-${courseId}`;
        if (seenCombos.has(combo)) {
            logger.warn(`Row ${rowId}: Duplicate enrollment for student ${email} in course ${courseId}`, enrollment);
            continue;
        }
        seenCombos.add(combo);

        // 4. Validate grade (if provided) - must match schema constraint
        const grade = cleanString(enrollment.grade);
        if (grade && !isValidGrade(grade)) {
            logger.warn(`Row ${rowId}: Invalid grade "${grade}"`, enrollment);
            continue;
        }

        // 5. Parse enrollment date (required field)
        const enrollmentDate = parseDate(enrollment.enrollment_date);
        if (!enrollmentDate) {
            logger.warn(`Row ${rowId}: Invalid or missing enrollment date "${enrollment.enrollment_date}"`, enrollment);
            continue;
        }

        // All validations passed
        transformed.push({
            student_id: studentId,
            course_id: courseId,  // VARCHAR course code like 'CS101'
            grade: grade ? grade.toUpperCase() : null,
            enrollment_date: enrollmentDate
        });
    }

    logger.stats.transformed += transformed.length;
    logger.success(`Transformed ${transformed.length} valid enrollments (${enrollments.length - transformed.length} skipped)`);

    return transformed;
}
