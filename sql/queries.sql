-- =====================================================
-- queries.sql
-- Project: sheet-to-neonDB-etl
-- Purpose: SQL queries for analysis, reporting, and data quality
-- =====================================================

-- =====================================================
-- SECTION 1: AGGREGATION QUERIES
-- =====================================================

-- Q1: Count students per department
SELECT 
    d.department_name,
    COUNT(s.student_id) as student_count
FROM department d
LEFT JOIN student s ON d.department_id = s.department_id
GROUP BY d.department_id, d.department_name
ORDER BY student_count DESC;

-- Q2: Average grade per course
-- Maps letter grades to GPA points: A=4.0, A-=3.7, B=3.0, B-=2.7, C=2.0, C-=1.7, D=1.0, F=0.0
SELECT 
    c.course_id,
    c.course_name,
    COUNT(e.enrollment_id) as total_enrollments,
    COUNT(e.grade) as graded_enrollments,
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
            ELSE NULL
        END
    ), 2) as average_gpa
FROM course c
LEFT JOIN enrollment e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
ORDER BY average_gpa DESC NULLS LAST;

-- Q3: Total enrollments per student
SELECT 
    s.student_id,
    s.student_first_name || ' ' || s.student_last_name as full_name,
    s.student_email,
    COUNT(e.enrollment_id) as total_courses
FROM student s
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY s.student_id, s.student_first_name, s.student_last_name, s.student_email
ORDER BY total_courses DESC;

-- Q4: Students per year
SELECT 
    student_year,
    COUNT(*) as student_count
FROM student
GROUP BY student_year
ORDER BY student_year;

-- Q5: Course popularity by department
SELECT 
    d.department_name,
    c.course_id,
    c.course_name,
    COUNT(e.enrollment_id) as enrollment_count
FROM department d
JOIN course c ON d.department_id = c.department_id
LEFT JOIN enrollment e ON c.course_id = e.course_id
GROUP BY d.department_name, c.course_id, c.course_name
ORDER BY d.department_name, enrollment_count DESC;

-- =====================================================
-- SECTION 2: JOIN-HEAVY QUERIES
-- =====================================================

-- Q6: Full student details with department
SELECT 
    s.student_id,
    s.student_first_name,
    s.student_last_name,
    s.student_email,
    s.student_year,
    s.student_phone_number,
    d.department_name
FROM student s
JOIN department d ON s.department_id = d.department_id
ORDER BY s.student_last_name, s.student_first_name;

-- Q7: Complete enrollment report (student + course + department)
SELECT 
    s.student_first_name || ' ' || s.student_last_name as student_name,
    s.student_email,
    s.student_year,
    d.department_name as student_department,
    c.course_id,
    c.course_name,
    cd.department_name as course_department,
    e.grade,
    e.enrollment_date
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course c ON e.course_id = c.course_id
JOIN department d ON s.department_id = d.department_id
JOIN department cd ON c.department_id = cd.department_id
ORDER BY s.student_last_name, c.course_id;

-- Q8: Students with their course count and average GPA
SELECT 
    s.student_id,
    s.student_first_name || ' ' || s.student_last_name as full_name,
    d.department_name,
    s.student_year,
    COUNT(e.enrollment_id) as courses_taken,
    COUNT(e.grade) as courses_graded,
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
    ), 2) as gpa
FROM student s
JOIN department d ON s.department_id = d.department_id
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY s.student_id, s.student_first_name, s.student_last_name, d.department_name, s.student_year
ORDER BY gpa DESC NULLS LAST;

-- Q9: Cross-department enrollments (students taking courses outside their department)
SELECT 
    s.student_first_name || ' ' || s.student_last_name as student_name,
    sd.department_name as student_department,
    c.course_id,
    c.course_name,
    cd.department_name as course_department
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course c ON e.course_id = c.course_id
JOIN department sd ON s.department_id = sd.department_id
JOIN department cd ON c.department_id = cd.department_id
WHERE s.department_id != c.department_id
ORDER BY s.student_last_name, c.course_id;

-- =====================================================
-- SECTION 3: DATA QUALITY & VALIDATION QUERIES
-- =====================================================

-- Q10: Detect duplicate emails (should return 0 rows due to UNIQUE constraint)
SELECT 
    student_email,
    COUNT(*) as duplicate_count
FROM student
GROUP BY student_email
HAVING COUNT(*) > 1;

-- Q11: Students without any enrollments
SELECT 
    s.student_id,
    s.student_first_name || ' ' || s.student_last_name as full_name,
    s.student_email,
    d.department_name
FROM student s
JOIN department d ON s.department_id = d.department_id
LEFT JOIN enrollment e ON s.student_id = e.student_id
WHERE e.enrollment_id IS NULL
ORDER BY s.student_last_name;

-- Q12: Enrollments without grades (incomplete/pending)
SELECT 
    s.student_first_name || ' ' || s.student_last_name as student_name,
    c.course_id,
    c.course_name,
    e.enrollment_date
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course c ON e.course_id = c.course_id
WHERE e.grade IS NULL
ORDER BY e.enrollment_date DESC;

-- Q13: Students under 16 years old (should be 0 due to CHECK constraint)
SELECT 
    student_id,
    student_first_name,
    student_last_name,
    student_date_of_birth,
    DATE_PART('year', AGE(student_date_of_birth)) as age
FROM student
WHERE student_date_of_birth > CURRENT_DATE - INTERVAL '16 years';

-- Q14: Invalid grades (should be 0 due to CHECK constraint)
SELECT 
    e.enrollment_id,
    s.student_email,
    c.course_id,
    e.grade
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course c ON e.course_id = c.course_id
WHERE e.grade NOT IN ('A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'F')
  AND e.grade IS NOT NULL;

-- =====================================================
-- SECTION 4: ADVANCED REPORTING QUERIES
-- =====================================================

-- Q15: Department report card (comprehensive stats)
SELECT 
    d.department_name,
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
    ), 2) as department_avg_gpa
FROM department d
LEFT JOIN student s ON d.department_id = s.department_id
LEFT JOIN course c ON d.department_id = c.department_id
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY d.department_id, d.department_name
ORDER BY department_avg_gpa DESC NULLS LAST;

-- Q16: Top performing students (GPA >= 3.5)
SELECT 
    s.student_id,
    s.student_first_name || ' ' || s.student_last_name as full_name,
    s.student_email,
    d.department_name,
    s.student_year,
    COUNT(e.grade) as courses_completed,
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
    ), 2) as gpa
FROM student s
JOIN department d ON s.department_id = d.department_id
LEFT JOIN enrollment e ON s.student_id = e.student_id
GROUP BY s.student_id, s.student_first_name, s.student_last_name, s.student_email, d.department_name, s.student_year
HAVING AVG(
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
) >= 3.5
ORDER BY gpa DESC;

-- Q17: Grade distribution per course
SELECT 
    c.course_id,
    c.course_name,
    COUNT(CASE WHEN e.grade = 'A' THEN 1 END) as grade_A,
    COUNT(CASE WHEN e.grade = 'A-' THEN 1 END) as grade_A_minus,
    COUNT(CASE WHEN e.grade = 'B' THEN 1 END) as grade_B,
    COUNT(CASE WHEN e.grade = 'B-' THEN 1 END) as grade_B_minus,
    COUNT(CASE WHEN e.grade = 'C' THEN 1 END) as grade_C,
    COUNT(CASE WHEN e.grade = 'C-' THEN 1 END) as grade_C_minus,
    COUNT(CASE WHEN e.grade = 'D' THEN 1 END) as grade_D,
    COUNT(CASE WHEN e.grade = 'F' THEN 1 END) as grade_F,
    COUNT(CASE WHEN e.grade IS NULL THEN 1 END) as not_graded
FROM course c
LEFT JOIN enrollment e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name
ORDER BY c.course_id;

-- =====================================================
-- End of queries.sql
-- =====================================================
