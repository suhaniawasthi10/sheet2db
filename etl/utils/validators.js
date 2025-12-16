/**
 * Validators Utility
 * Functions to validate and clean data
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone number regex (matches schema CHECK constraint)
const PHONE_REGEX = /^[0-9+ -]{7,20}$/;

/**
 * Validate email format
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
}

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmail(email) {
    if (!email) return null;
    return email.toLowerCase().trim();
}

/**
 * Validate year is integer between 1-4
 */
export function isValidYear(year) {
    const parsed = parseInt(year, 10);
    return !isNaN(parsed) && parsed >= 1 && parsed <= 4;
}

/**
 * Parse year to integer
 * Handles: "1", 1, "one", "first", etc.
 */
export function parseYear(year) {
    // Direct number
    if (typeof year === 'number') return year;

    // String number
    const parsed = parseInt(year, 10);
    if (!isNaN(parsed)) return parsed;

    // Word to number mapping
    const wordMap = {
        'one': 1, 'first': 1, '1st': 1,
        'two': 2, 'second': 2, '2nd': 2,
        'three': 3, 'third': 3, '3rd': 3,
        'four': 4, 'fourth': 4, '4th': 4
    };

    const lower = String(year).toLowerCase().trim();
    return wordMap[lower] || null;
}

/**
 * Department name mapping (messy → clean)
 * Maps various representations to canonical names
 */
const DEPARTMENT_MAP = {
    // Computer Science variations
    'computer science': 'Computer Science',
    'cs': 'Computer Science',
    'comp sci': 'Computer Science',
    'comp. sci.': 'Computer Science',
    'cse': 'Computer Science',

    // Electronics variations
    'electronics': 'Electronics',
    'ece': 'Electronics',
    'ec': 'Electronics',

    // Mechanical variations
    'mechanical': 'Mechanical',
    'mech': 'Mechanical',
    'me': 'Mechanical',

    // Electrical variations
    'electrical engineering': 'Electrical Engineering',
    'electrical': 'Electrical Engineering',
    'ee': 'Electrical Engineering',
    'eee': 'Electrical Engineering'
};

/**
 * Standardize department name
 */
export function standardizeDepartment(dept) {
    if (!dept || typeof dept !== 'string') return null;

    const normalized = dept.toLowerCase().trim();
    return DEPARTMENT_MAP[normalized] || null;
}

/**
 * Validate grade format (matches schema CHECK constraint)
 * Valid grades: A, A-, B, B-, C, C-, D, F
 * Note: Plus grades (B+, C+, etc.) are intentionally NOT valid
 */
export function isValidGrade(grade) {
    if (!grade) return true; // Grade can be null (not yet graded)
    const validGrades = ['A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'F'];
    return validGrades.includes(grade.toUpperCase().trim());
}

/**
 * Parse date to ISO format (YYYY-MM-DD)
 * Handles: "2024-01-15", "15/01/2024", "Jan 15, 2024", etc.
 */
export function parseDate(dateStr) {
    if (!dateStr) return null;

    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.split('T')[0];
    }

    // DD/MM/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try parsing with Date object
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return null;
}

/**
 * Validate date of birth (must be at least 16 years old)
 * Matches schema CHECK: student_date_of_birth <= CURRENT_DATE - INTERVAL '16 years'
 */
export function isValidDateOfBirth(dob) {
    if (!dob) return false;

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) return false;

    const today = new Date();
    const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());

    return dobDate <= minDate;
}

/**
 * Validate phone number format
 * Matches schema CHECK: student_phone_number ~ '^[0-9+ -]{7,20}$'
 */
export function isValidPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    return PHONE_REGEX.test(phone.trim());
}

/**
 * Normalize phone number (remove extra characters, ensure format)
 */
export function normalizePhoneNumber(phone) {
    if (!phone) return null;
    // Keep only digits, +, spaces, and dashes
    const cleaned = phone.replace(/[^\d+\- ]/g, '').trim();

    // If just 10 digits, add +91- prefix
    const digitsOnly = cleaned.replace(/[^\d]/g, '');
    if (digitsOnly.length === 10) {
        return `+91-${digitsOnly}`;
    }

    return cleaned;
}

/**
 * Trim and clean string
 */
export function cleanString(str) {
    if (!str || typeof str !== 'string') return null;
    return str.trim();
}

/**
 * Parse name into first and last name
 */
export function parseName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return { firstName: null, lastName: null };
    }

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }

    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
}
