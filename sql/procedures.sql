-- =====================================================
-- procedures.sql
-- Project: sheet-to-neonDB-etl
-- Purpose: Stored procedures/functions for reusable operations
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_student_gpa(INT);
DROP FUNCTION IF EXISTS enroll_student(INT, VARCHAR, DATE);
DROP FUNCTION IF EXISTS get_course_average(VARCHAR);
DROP FUNCTION IF EXISTS get_department_stats(INT);
DROP FUNCTION IF EXISTS grade_to_points(VARCHAR);

-- =====================================================
-- FUNCTION 1: Convert grade letter to GPA points
-- =====================================================
CREATE OR REPLACE FUNCTION grade_to_points(grade_letter VARCHAR)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    RETURN CASE grade_letter
        WHEN 'A' THEN 4.00
        WHEN 'A-' THEN 3.70
        WHEN 'B' THEN 3.00
        WHEN 'B-' THEN 2.70
        WHEN 'C' THEN 2.00
        WHEN 'C-' THEN 1.70
        WHEN 'D' THEN 1.00
        WHEN 'F' THEN 0.00
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION grade_to_points IS 'Convert letter grade to GPA points';

-- =====================================================
-- FUNCTION 2: Calculate student GPA
-- Returns NULL if student has no graded courses
-- =====================================================
CREATE OR REPLACE FUNCTION get_student_gpa(p_student_id INT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_gpa DECIMAL(3,2);
BEGIN
    SELECT ROUND(AVG(grade_to_points(grade)), 2)
    INTO v_gpa
    FROM enrollment
    WHERE student_id = p_student_id
      AND grade IS NOT NULL;
    
    RETURN v_gpa;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_student_gpa IS 'Calculate GPA for a given student';

-- =====================================================
-- FUNCTION 3: Safe enrollment (with validation)
-- Returns enrollment_id on success, NULL on failure
-- =====================================================
CREATE OR REPLACE FUNCTION enroll_student(
    p_student_id INT,
    p_course_id VARCHAR,
    p_enrollment_date DATE DEFAULT CURRENT_DATE
)
RETURNS INT AS $$
DECLARE
    v_enrollment_id INT;
    v_student_exists BOOLEAN;
    v_course_exists BOOLEAN;
    v_already_enrolled BOOLEAN;
BEGIN
    -- Validate student exists
    SELECT EXISTS(SELECT 1 FROM student WHERE student_id = p_student_id)
    INTO v_student_exists;
    
    IF NOT v_student_exists THEN
        RAISE EXCEPTION 'Student ID % does not exist', p_student_id;
    END IF;
    
    -- Validate course exists
    SELECT EXISTS(SELECT 1 FROM course WHERE course_id = p_course_id)
    INTO v_course_exists;
    
    IF NOT v_course_exists THEN
        RAISE EXCEPTION 'Course ID % does not exist', p_course_id;
    END IF;
    
    -- Check if already enrolled
    SELECT EXISTS(
        SELECT 1 FROM enrollment 
        WHERE student_id = p_student_id 
          AND course_id = p_course_id
    ) INTO v_already_enrolled;
    
    IF v_already_enrolled THEN
        RAISE EXCEPTION 'Student % is already enrolled in course %', p_student_id, p_course_id;
    END IF;
    
    -- Insert enrollment
    INSERT INTO enrollment (student_id, course_id, enrollment_date)
    VALUES (p_student_id, p_course_id, p_enrollment_date)
    RETURNING enrollment_id INTO v_enrollment_id;
    
    RETURN v_enrollment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enroll_student IS 'Safely enroll a student in a course with validation';

-- =====================================================
-- FUNCTION 4: Get course average GPA
-- =====================================================
CREATE OR REPLACE FUNCTION get_course_average(p_course_id VARCHAR)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    v_avg_gpa DECIMAL(3,2);
BEGIN
    SELECT ROUND(AVG(grade_to_points(grade)), 2)
    INTO v_avg_gpa
    FROM enrollment
    WHERE course_id = p_course_id
      AND grade IS NOT NULL;
    
    RETURN v_avg_gpa;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_course_average IS 'Calculate average GPA for a course';

-- =====================================================
-- FUNCTION 5: Get department statistics
-- Returns a JSON object with department stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_department_stats(p_department_id INT)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'department_id', d.department_id,
        'department_name', d.department_name,
        'total_students', COUNT(DISTINCT s.student_id),
        'total_courses', COUNT(DISTINCT c.course_id),
        'total_enrollments', COUNT(e.enrollment_id),
        'average_gpa', ROUND(AVG(grade_to_points(e.grade)), 2),
        'students_per_year', (
            SELECT json_object_agg(student_year, cnt)
            FROM (
                SELECT student_year, COUNT(*) as cnt
                FROM student
                WHERE department_id = p_department_id
                GROUP BY student_year
            ) sub
        )
    )
    INTO v_stats
    FROM department d
    LEFT JOIN student s ON d.department_id = s.department_id
    LEFT JOIN course c ON d.department_id = c.department_id
    LEFT JOIN enrollment e ON s.student_id = e.student_id
    WHERE d.department_id = p_department_id
    GROUP BY d.department_id, d.department_name;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_department_stats IS 'Get comprehensive department statistics as JSON';

-- =====================================================
-- FUNCTION 6: Update student grade
-- Updates grade for an enrollment
-- =====================================================
CREATE OR REPLACE FUNCTION update_student_grade(
    p_student_id INT,
    p_course_id VARCHAR,
    p_grade VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_enrollment_exists BOOLEAN;
    v_valid_grade BOOLEAN;
BEGIN
    -- Validate grade
    v_valid_grade := p_grade IN ('A', 'A-', 'B', 'B-', 'C', 'C-', 'D', 'F');
    
    IF NOT v_valid_grade THEN
        RAISE EXCEPTION 'Invalid grade: %. Must be one of: A, A-, B, B-, C, C-, D, F', p_grade;
    END IF;
    
    -- Check if enrollment exists
    SELECT EXISTS(
        SELECT 1 FROM enrollment
        WHERE student_id = p_student_id
          AND course_id = p_course_id
    ) INTO v_enrollment_exists;
    
    IF NOT v_enrollment_exists THEN
        RAISE EXCEPTION 'Enrollment not found for student % in course %', p_student_id, p_course_id;
    END IF;
    
    -- Update grade
    UPDATE enrollment
    SET grade = p_grade
    WHERE student_id = p_student_id
      AND course_id = p_course_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_student_grade IS 'Update grade for a student enrollment with validation';

-- =====================================================
-- FUNCTION 7: Get students needing grades
-- Returns table of enrollments without grades
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_grades()
RETURNS TABLE(
    enrollment_id INT,
    student_name TEXT,
    student_email VARCHAR,
    course_id VARCHAR,
    course_name VARCHAR,
    enrollment_date DATE,
    days_since_enrollment INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.enrollment_id,
        s.student_first_name || ' ' || s.student_last_name,
        s.student_email,
        c.course_id,
        c.course_name,
        e.enrollment_date,
        CURRENT_DATE - e.enrollment_date
    FROM enrollment e
    JOIN student s ON e.student_id = s.student_id
    JOIN course c ON e.course_id = c.course_id
    WHERE e.grade IS NULL
    ORDER BY e.enrollment_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_pending_grades IS 'Get all enrollments that need grades assigned';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Get a student's GPA
-- SELECT get_student_gpa(1);

-- Example 2: Enroll a student in a course
-- SELECT enroll_student(1, 'CS101', '2024-01-15');

-- Example 3: Get course average
-- SELECT get_course_average('CS101');

-- Example 4: Get department stats
-- SELECT get_department_stats(1);

-- Example 5: Convert grade to points
-- SELECT grade_to_points('A-');  -- Returns 3.70

-- Example 6: Update a grade
-- SELECT update_student_grade(1, 'CS101', 'A');

-- Example 7: Get all pending grades
-- SELECT * FROM get_pending_grades();

-- =====================================================
-- End of procedures.sql
-- =====================================================
