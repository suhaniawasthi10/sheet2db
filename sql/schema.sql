-- =====================================================
-- schema.sql
-- Project: sheet-to-neonDB-etl
-- Database: PostgreSQL (NeonDB)
-- Purpose: Define normalized schema with constraints
-- =====================================================

-- Drop tables if they exist (safe re-run during development)
DROP TABLE IF EXISTS enrollment CASCADE;
DROP TABLE IF EXISTS course CASCADE;
DROP TABLE IF EXISTS student CASCADE;
DROP TABLE IF EXISTS department CASCADE;

-- =====================================================
-- Department Table
-- =====================================================
CREATE TABLE department (
    department_id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_head VARCHAR(100)
);

-- =====================================================
-- Student Table
-- Constraint: DOB ensures minimum enrollment age of 16 years
-- =====================================================
CREATE TABLE student (
    student_id SERIAL PRIMARY KEY,
    student_first_name VARCHAR(100) NOT NULL,
    student_last_name VARCHAR(100) NOT NULL,
    student_email VARCHAR(255) NOT NULL UNIQUE,
    student_date_of_birth DATE NOT NULL
        CHECK (student_date_of_birth <= CURRENT_DATE - INTERVAL '16 years'),
    student_year INTEGER NOT NULL
        CHECK (student_year BETWEEN 1 AND 4),
    student_phone_number VARCHAR(20) NOT NULL
        CHECK (student_phone_number ~ '^[0-9+ -]{7,20}$'),
    department_id INTEGER NOT NULL,

    CONSTRAINT fk_student_department
        FOREIGN KEY (department_id)
        REFERENCES department(department_id)
        ON DELETE RESTRICT
);

-- =====================================================
-- Course Table
-- Using natural key (course_id as VARCHAR) for simplicity
-- =====================================================
CREATE TABLE course (
    course_id VARCHAR(10) PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    department_id INTEGER NOT NULL,
    course_credits INTEGER NOT NULL
        CHECK (course_credits BETWEEN 1 AND 4),

    CONSTRAINT fk_course_department
        FOREIGN KEY (department_id)
        REFERENCES department(department_id)
        ON DELETE RESTRICT
);

-- =====================================================
-- Enrollment Table
-- =====================================================
CREATE TABLE enrollment (
    enrollment_id SERIAL PRIMARY KEY,
    enrollment_date DATE NOT NULL,
    student_id INTEGER NOT NULL,
    course_id VARCHAR(10) NOT NULL,
    grade VARCHAR(2)
        CHECK (grade IN ('A','A-','B','B-','C','C-','D','F')),

    CONSTRAINT fk_enrollment_student
        FOREIGN KEY (student_id)
        REFERENCES student(student_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_enrollment_course
        FOREIGN KEY (course_id)
        REFERENCES course(course_id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_student_course
        UNIQUE (student_id, course_id)
);

-- =====================================================
-- Indexes for Performance Optimization
-- =====================================================
CREATE INDEX idx_student_department ON student(department_id);
CREATE INDEX idx_student_email ON student(student_email);
CREATE INDEX idx_course_department ON course(department_id);
CREATE INDEX idx_enrollment_student ON enrollment(student_id);
CREATE INDEX idx_enrollment_course ON enrollment(course_id);

-- =====================================================
-- End of schema.sql
-- =====================================================
