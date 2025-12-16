-- =====================================================
-- optimization.sql
-- Project: sheet-to-neonDB-etl
-- Purpose: Query optimization techniques and index analysis
-- =====================================================

-- =====================================================
-- SECTION 1: Current Index Analysis
-- =====================================================

-- Show all indexes in the database
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Show index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =====================================================
-- SECTION 2: EXPLAIN ANALYZE Examples
-- =====================================================

-- Example 1: Query WITH index (fast)
-- This should use idx_student_email index
EXPLAIN ANALYZE
SELECT * FROM student 
WHERE student_email = 'john.doe@example.com';

-- Expected output shows: "Index Scan using idx_student_email"
-- Actual time: ~0.01-0.1ms

-- Example 2: Query with JOIN (uses indexes)
EXPLAIN ANALYZE
SELECT 
    s.student_first_name,
    s.student_last_name,
    d.department_name
FROM student s
JOIN department d ON s.department_id = d.department_id
WHERE s.student_email = 'john.doe@example.com';

-- Expected: Index Scan on student, then Index Scan or Seq Scan on department
-- Department table is small, so Seq Scan is fine

-- Example 3: Aggregation query
EXPLAIN ANALYZE
SELECT 
    d.department_name,
    COUNT(s.student_id) as student_count
FROM department d
LEFT JOIN student s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name;

-- Expected: Hash Join or Merge Join with GroupAggregate

-- Example 4: Complex JOIN query
EXPLAIN ANALYZE
SELECT 
    s.student_first_name || ' ' || s.student_last_name as student_name,
    c.course_name,
    e.grade
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course c ON e.course_id = c.course_id
WHERE s.student_year = 3;

-- Should use idx_enrollment_student and idx_enrollment_course

-- =====================================================
-- SECTION 3: Finding Missing Indexes
-- =====================================================

-- Find tables without indexes (excluding small lookup tables)
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
      SELECT tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find unused indexes (candidates for removal)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- SECTION 4: Query Performance Comparison
-- =====================================================

-- Slow query: Get all enrollments for a student (without preparation)
-- Run this to see baseline performance
EXPLAIN ANALYZE
SELECT 
    c.course_name,
    e.grade,
    e.enrollment_date
FROM enrollment e
JOIN course c ON e.course_id = c.course_id
WHERE e.student_id = 1;

-- Expected: Uses idx_enrollment_student (already exists)

-- Slow query: Find students by phone number pattern
-- This will do a Seq Scan (slow) because phone uses pattern matching
EXPLAIN ANALYZE
SELECT * FROM student 
WHERE student_phone_number LIKE '+91%';

-- Expected: Seq Scan on student (no index can help with LIKE patterns)

-- =====================================================
-- SECTION 5: Potential Index Additions
-- =====================================================

-- If you find you frequently filter by student_year, add this index:
-- CREATE INDEX idx_student_year ON student(student_year);

-- If you frequently filter enrollments by grade:
-- CREATE INDEX idx_enrollment_grade ON enrollment(grade) WHERE grade IS NOT NULL;

-- Composite index for common queries (student + course lookups):
-- Already exists as uq_student_course UNIQUE constraint

-- =====================================================
-- SECTION 6: Query Optimization Tips
-- =====================================================

-- TIP 1: Use LIMIT for pagination
-- Bad: Return all students (could be millions)
SELECT * FROM student;

-- Good: Return first page
SELECT * FROM student 
ORDER BY student_id 
LIMIT 20 OFFSET 0;

-- TIP 2: Use EXISTS instead of COUNT for existence checks
-- Bad: Count all for boolean check
SELECT COUNT(*) FROM enrollment WHERE student_id = 1;

-- Good: Use EXISTS (stops at first match)
SELECT EXISTS(SELECT 1 FROM enrollment WHERE student_id = 1);

-- TIP 3: Avoid SELECT * when you don't need all columns
-- Bad: Returns all columns (more data transfer)
SELECT * FROM student;

-- Good: Select only needed columns
SELECT student_id, student_email FROM student;

-- TIP 4: Use appropriate JOIN types
-- Bad: INNER JOIN when you need LEFT JOIN (loses unmatched records)
SELECT s.student_id, COUNT(e.enrollment_id)
FROM student s
INNER JOIN enrollment e ON s.student_id = e.student_id
GROUP BY s.student_id;

-- Good: LEFT JOIN to include students with 0 enrollments
SELECT s.student_id, COUNT(e.enrollment_id)
FROM student s
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY s.student_id;

-- =====================================================
-- SECTION 7: Database Statistics
-- =====================================================

-- Get table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Get row counts
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- =====================================================
-- SECTION 8: Maintenance Commands
-- =====================================================

-- Analyze tables to update statistics (helps query planner)
ANALYZE student;
ANALYZE enrollment;
ANALYZE course;
ANALYZE department;

-- Or analyze all tables at once
ANALYZE;

-- Vacuum to reclaim space (useful after large deletes)
-- VACUUM ANALYZE student;

-- =====================================================
-- End of optimization.sql
-- =====================================================
