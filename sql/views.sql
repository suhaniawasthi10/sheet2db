-- =====================================================
-- views.sql
-- Project: sheet-to-neonDB-etl
-- Purpose: Create views for common queries and reporting
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS vw_student_details CASCADE;
DROP VIEW IF EXISTS vw_enrollment_report CASCADE;
DROP VIEW IF EXISTS vw_student_gpa CASCADE;
DROP VIEW IF EXISTS vw_course_statistics CASCADE;
DROP VIEW IF EXISTS vw_department_summary CASCADE;

-- =====================================================
-- VIEW 1: Student Details
-- Combines student and department information
-- =====================================================
CREATE VIEW vw_student_details AS
SELECT 
    s.student_id,
    s.student_first_name,
    s.student_last_name,
    s.student_first_name || ' ' || s.student_last_name as full_name,
    s.student_email,
    s.student_date_of_birth,
    DATE_PART('year', AGE(s.student_date_of_birth)) as age,
    s.student_year,
    s.student_phone_number,
    s.department_id,
    d.department_name,
    d.department_head
FROM student s
JOIN department d ON s.department_id = d.department_id;

COMMENT ON VIEW vw_student_details IS 'Complete student information with department details';

-- =====================================================
-- VIEW 2: Enrollment Report
-- Full enrollment details with student and course info
-- =====================================================
CREATE VIEW vw_enrollment_report AS
SELECT 
    e.enrollment_id,
    e.enrollment_date,
    s.student_id,
    s.student_first_name || ' ' || s.student_last_name as student_name,
    s.student_email,
    s.student_year,
    sd.department_name as student_department,
    c.course_id,
    c.course_name,
    c.course_credits,
    cd.department_name as course_department,
    e.grade,
    CASE e.grade
        WHEN 'A' THEN 4.0
        WHEN 'A-' THEN 3.7
        WHEN 'B' THEN 3.0
        WHEN 'B-' THEN 2.7
        WHEN 'C' THEN 2.0
        WHEN 'C-' THEN 1.7
        WHEN 'D' THEN 1.0
        WHEN 'F' THEN 0.0
        ELSE NULL
    END as grade_points
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course c ON e.course_id = c.course_id
JOIN department sd ON s.department_id = sd.department_id
JOIN department cd ON c.department_id = cd.department_id;

COMMENT ON VIEW vw_enrollment_report IS 'Comprehensive enrollment report with all related details';

-- =====================================================
-- VIEW 3: Student GPA
-- Calculate GPA for each student
-- =====================================================
CREATE VIEW vw_student_gpa AS
SELECT 
    s.student_id,
    s.student_first_name || ' ' || s.student_last_name as full_name,
    s.student_email,
    d.department_name,
    s.student_year,
    COUNT(e.enrollment_id) as total_courses,
    COUNT(e.grade) as graded_courses,
    COUNT(e.enrollment_id) - COUNT(e.grade) as pending_grades,
    ROUND(AVG(
        CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END
    ), 2) as gpa,
    CASE 
        WHEN AVG(CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END) >= 3.5 THEN 'Excellent'
        WHEN AVG(CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END) >= 3.0 THEN 'Good'
        WHEN AVG(CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END) >= 2.0 THEN 'Average'
        WHEN AVG(CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END) IS NOT NULL THEN 'Below Average'
        ELSE 'No Grades'
    END as performance_level
FROM student s
JOIN department d ON s.department_id = d.department_id
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY s.student_id, s.student_first_name, s.student_last_name, s.student_email, d.department_name, s.student_year;

COMMENT ON VIEW vw_student_gpa IS 'Student GPA calculations and performance levels';

-- =====================================================
-- VIEW 4: Course Statistics
-- Statistics for each course
-- =====================================================
CREATE VIEW vw_course_statistics AS
SELECT 
    c.course_id,
    c.course_name,
    c.course_credits,
    d.department_name,
    COUNT(e.enrollment_id) as total_enrollments,
    COUNT(e.grade) as graded_enrollments,
    COUNT(e.enrollment_id) - COUNT(e.grade) as pending_grades,
    ROUND(AVG(
        CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END
    ), 2) as average_gpa,
    COUNT(CASE WHEN e.grade IN ('A', 'A-') THEN 1 END) as a_grades,
    COUNT(CASE WHEN e.grade IN ('B', 'B-') THEN 1 END) as b_grades,
    COUNT(CASE WHEN e.grade IN ('C', 'C-') THEN 1 END) as c_grades,
    COUNT(CASE WHEN e.grade = 'D' THEN 1 END) as d_grades,
    COUNT(CASE WHEN e.grade = 'F' THEN 1 END) as f_grades
FROM course c
JOIN department d ON c.department_id = d.department_id
LEFT JOIN enrollment e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name, c.course_credits, d.department_name;

COMMENT ON VIEW vw_course_statistics IS 'Course enrollment and grade statistics';

-- =====================================================
-- VIEW 5: Department Summary
-- High-level department statistics
-- =====================================================
CREATE VIEW vw_department_summary AS
SELECT 
    d.department_id,
    d.department_name,
    d.department_head,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT c.course_id) as total_courses,
    COUNT(e.enrollment_id) as total_enrollments,
    ROUND(AVG(
        CASE e.grade
            WHEN 'A' THEN 4.0
            WHEN 'A-' THEN 3.7
            WHEN 'B' THEN 3.0
            WHEN 'B-' THEN 2.7
            WHEN 'C' THEN 2.0
            WHEN 'C-' THEN 1.7
            WHEN 'D' THEN 1.0
            WHEN 'F' THEN 0.0
        END
    ), 2) as department_gpa,
    ROUND(COUNT(DISTINCT s.student_id)::NUMERIC / NULLIF(COUNT(DISTINCT c.course_id), 0), 1) as students_per_course
FROM department d
LEFT JOIN student s ON d.department_id = s.department_id
LEFT JOIN course c ON d.department_id = c.department_id
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY d.department_id, d.department_name, d.department_head;

COMMENT ON VIEW vw_department_summary IS 'High-level department statistics and metrics';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Get all students with department names
-- SELECT * FROM vw_student_details ORDER BY full_name;

-- Example 2: Get full enrollment report
-- SELECT * FROM vw_enrollment_report WHERE student_year = 3;

-- Example 3: Get student GPAs sorted by performance
-- SELECT * FROM vw_student_gpa ORDER BY gpa DESC NULLS LAST;

-- Example 4: Get course statistics
-- SELECT * FROM vw_course_statistics ORDER BY average_gpa DESC;

-- Example 5: Get department summary
-- SELECT * FROM vw_department_summary ORDER BY department_gpa DESC;

-- =====================================================
-- End of views.sql
-- =====================================================
