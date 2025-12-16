import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { logger } from './utils/logger.js';

/**
 * Extract data from a CSV file
 * @param {string} filename - Name of CSV file in data/ directory
 * @returns {Array} - Array of row objects
 */
export function extractFromCSV(filename) {
    const filePath = path.join(process.cwd(), 'data', filename);

    logger.info(`Extracting data from CSV: ${filename}...`);

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');

        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        logger.stats.extracted += records.length;
        logger.success(`Extracted ${records.length} rows from ${filename}`);

        return records;

    } catch (error) {
        logger.error(`Failed to extract from ${filename}`, error);
        throw error;
    }
}

/**
 * Extract data from a JSON file
 * @param {string} filename - Name of JSON file in data/ directory
 * @returns {Array} - Array of row objects
 */
export function extractFromJSON(filename) {
    const filePath = path.join(process.cwd(), 'data', filename);

    logger.info(`Extracting data from JSON: ${filename}...`);

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Handle both array and object with data property
        const records = Array.isArray(data) ? data : (data.data || data.records || [data]);

        logger.stats.extracted += records.length;
        logger.success(`Extracted ${records.length} rows from ${filename}`);

        return records;

    } catch (error) {
        logger.error(`Failed to extract from ${filename}`, error);
        throw error;
    }
}

/**
 * Auto-detect file type and extract
 * @param {string} filename - Filename with extension
 * @returns {Array} - Array of row objects
 */
export function extractFromFile(filename) {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
        case '.csv':
            return extractFromCSV(filename);
        case '.json':
            return extractFromJSON(filename);
        default:
            throw new Error(`Unsupported file type: ${ext}`);
    }
}

/**
 * Extract all source data files
 * @returns {Object} - Object containing all extracted data
 */
export function extractAll() {
    logger.info('Starting extraction phase...');

    return {
        students: extractFromCSV('messy_students.csv'),
        enrollments: extractFromCSV('messy_enrollments.csv'),
        departments: extractFromCSV('departments.csv'),
        courses: extractFromCSV('courses.csv')
    };
}
