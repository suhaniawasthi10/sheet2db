-- =====================================================
-- seed.sql
-- Project: sheet-to-neonDB-etl
-- Purpose: Populate reference/master data + sample records
-- Run AFTER schema.sql
-- =====================================================

-- =====================================================
-- Insert Departments
-- =====================================================
INSERT INTO department (department_name, department_head)
VALUES
    ('Computer Science', 'Dr. Rajesh Kumar'),
    ('Electronics', 'Dr. Sunita Sharma'),
    ('Mechanical', 'Dr. Anil Verma'),
    ('Electrical Engineering', 'Dr. Priya Nair');

-- =====================================================
-- Insert Courses (using natural key course codes)
-- =====================================================
INSERT INTO course (course_id, course_name, department_id, course_credits)
VALUES
    -- Computer Science (department_id = 1)
    ('CS101', 'Introduction to Programming', 1, 4),
    ('CS201', 'Data Structures', 1, 4),
    ('CS301', 'Database Systems', 1, 3),

    -- Electronics (department_id = 2)
    ('EC101', 'Basic Electronics', 2, 4),
    ('EC201', 'Digital Circuits', 2, 3),

    -- Mechanical (department_id = 3)
    ('ME101', 'Engineering Mechanics', 3, 4),

    -- Electrical Engineering (department_id = 4)
    ('EE101', 'Electrical Circuits', 4, 4),
    ('EE201', 'Power Systems', 4, 3);

-- =====================================================
-- Insert Sample Students (Clean data - post ETL)
-- =====================================================
INSERT INTO student (student_first_name, student_last_name, student_email, student_date_of_birth, student_year, student_phone_number, department_id)
VALUES
    ('Rahul', 'Sharma', 'rahul.sharma@university.edu', '2004-05-15', 2, '+91-9876543210', 1),
    ('Priya', 'Patel', 'priya.patel@university.edu', '2003-08-22', 3, '+91-9876543211', 1),
    ('Amit', 'Kumar', 'amit.kumar@university.edu', '2005-02-10', 1, '+91-9876543212', 1),
    ('Sneha', 'Gupta', 'sneha.gupta@university.edu', '2004-11-30', 2, '+91-9876543213', 2),
    ('Vikram', 'Singh', 'vikram.singh@university.edu', '2002-01-18', 4, '+91-9876543214', 3),
    ('Ananya', 'Reddy', 'ananya.reddy@university.edu', '2004-07-25', 2, '+91-9876543215', 1),
    ('Karthik', 'Nair', 'karthik.nair@university.edu', '2003-09-12', 3, '+91-9876543216', 2),
    ('Divya', 'Menon', 'divya.menon@university.edu', '2005-04-08', 1, '+91-9876543217', 4),
    ('Rohan', 'Das', 'rohan.das@university.edu', '2004-06-20', 2, '+91-9876543218', 4),
    ('Neha', 'Joshi', 'neha.joshi@university.edu', '2003-12-05', 3, '+91-9876543219', 3);

-- =====================================================
-- Insert Sample Enrollments
-- =====================================================
INSERT INTO enrollment (student_id, course_id, grade, enrollment_date)
VALUES
    (1, 'CS101', 'A', '2024-01-15'),
    (1, 'CS201', 'B', '2024-01-15'),
    (2, 'CS301', 'A-', '2024-01-15'),
    (3, 'CS101', 'B', '2024-01-15'),
    (4, 'EC101', 'A', '2024-01-15'),
    (5, 'ME101', 'C', '2024-01-15'),
    (6, 'CS201', 'B', '2024-01-15'),
    (7, 'EC201', 'A-', '2024-01-15'),
    (8, 'EE101', 'B', '2024-01-15'),
    (9, 'EE201', 'A', '2024-01-15'),
    (10, 'ME101', 'A-', '2024-01-15');

-- =====================================================
-- End of seed.sql
-- =====================================================
