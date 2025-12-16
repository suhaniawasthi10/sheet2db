/**
 * Logger Utility
 * Tracks ETL pipeline execution with timestamps and categories
 */

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

class Logger {
    constructor() {
        this.logs = [];
        this.stats = {
            extracted: 0,
            transformed: 0,
            loaded: 0,
            skipped: 0,
            errors: []
        };
    }

    timestamp() {
        return new Date().toISOString();
    }

    info(message) {
        const log = `${colors.cyan}[INFO]${colors.reset} ${this.timestamp()} - ${message}`;
        console.log(log);
        this.logs.push({ level: 'INFO', message, time: this.timestamp() });
    }

    success(message) {
        const log = `${colors.green}[SUCCESS]${colors.reset} ${this.timestamp()} - ${message}`;
        console.log(log);
        this.logs.push({ level: 'SUCCESS', message, time: this.timestamp() });
    }

    warn(message, row = null) {
        const log = `${colors.yellow}[WARN]${colors.reset} ${this.timestamp()} - ${message}`;
        console.log(log);
        this.logs.push({ level: 'WARN', message, row, time: this.timestamp() });
        this.stats.skipped++;
    }

    error(message, error = null) {
        const log = `${colors.red}[ERROR]${colors.reset} ${this.timestamp()} - ${message}`;
        console.log(log);
        if (error) console.error(error);
        this.logs.push({ level: 'ERROR', message, time: this.timestamp() });
        this.stats.errors.push({ message, error: error?.message });
    }

    // Print final summary
    summary() {
        console.log('\n' + '='.repeat(50));
        console.log(`${colors.cyan}ETL Pipeline Summary${colors.reset}`);
        console.log('='.repeat(50));
        console.log(`  Extracted:   ${this.stats.extracted} rows`);
        console.log(`  Transformed: ${this.stats.transformed} rows`);
        console.log(`  Loaded:      ${this.stats.loaded} rows`);
        console.log(`  ${colors.yellow}Skipped:     ${this.stats.skipped} rows${colors.reset}`);
        console.log(`  ${colors.red}Errors:      ${this.stats.errors.length}${colors.reset}`);
        console.log('='.repeat(50) + '\n');
    }

    // Get logs for saving to file
    getLogs() {
        return this.logs;
    }

    getStats() {
        return this.stats;
    }
}

// Export singleton instance
export const logger = new Logger();
