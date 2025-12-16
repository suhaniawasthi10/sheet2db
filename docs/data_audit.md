# Data Audit Report

## 1. Overview

This document audits the source data from Google Sheets/CSV files before migration to PostgreSQL/NeonDB.

**Data Sources:**
- `messy_students.csv` - Student registration data
- `messy_enrollments.csv` - Course enrollment records
- `departments.csv` - Department reference data
- `courses.csv` - Course catalog

---

## 2. Entity-Relationship Analysis

### Entities Identified

| Entity | Description | Primary Key |
|--------|-------------|-------------|
| **Department** | Academic departments | department_id (SERIAL) |
| **Student** | Registered students | student_id (SERIAL) |
| **Course** | Courses offered | course_id (SERIAL) |
| **Enrollment** | Student-Course relationship | enrollment_id (SERIAL) |

### Relationships

| From | To | Cardinality | Description |
|------|-----|-------------|-------------|
| Department | Student | 1:N | One department has many students |
| Department | Course | 1:N | One department offers many courses |
| Student | Enrollment | 1:N | One student has many enrollments |
| Course | Enrollment | 1:N | One course has many enrollments |

> **Note:** Student ↔ Course is a Many-to-Many (N:M) relationship implemented via the Enrollment junction table.

---

## 3. Schema Constraints

### Student Table
- `student_date_of_birth`: Must be at least 16 years old
- `student_year`: Must be between 1 and 4
- `student_email`: Must be unique
- `student_phone_number`: Required, validated format

### Course Table
- `course_credits`: Must be between 1 and 4

### Enrollment Table
- `grade`: Valid values: A, A-, B, B-, C, C-, D, F (Note: B+ is NOT valid)
- Unique constraint on (student_id, course_id) prevents duplicate enrollments

---

## 4. Data Quality Issues Found

### 4.1 Students Data (`messy_students.csv`)

| Row | Field | Issue Type | Description | Solution |
|-----|-------|------------|-------------|----------|
| 1, 4 | All | Duplicate | Rahul Sharma appears twice | Deduplicate on email |
| 2 | email | Case Issue | UPPERCASE email | LOWER() transform |
| 5 | email | Missing | Empty email field | Reject |
| 6 | year | Invalid Value | Year = 5 (max is 4) | Reject |
| 2, 7 | department | Inconsistent | "CS", "Comp Sci" | Standardize names |
| 8 | year | Wrong Type | "three" instead of 3 | Parse to integer |
| 9, 10 | department | Inconsistent | "electrical" vs "Electrical Engineering" | Standardize |
| 11 | department | Case Issue | "MECHANICAL" | Standardize case |
| 12 | email | Invalid Format | Missing .edu domain | Reject |
| 13 | department | Missing | Empty department | Reject |
| 16 | date_of_birth | Under 16 | DOB is 2015 (under 16) | Reject per constraint |
| 7 | date_of_birth | Wrong Format | "15/07/2004" (DD/MM/YYYY) | Parse to ISO |

### 4.2 Enrollments Data (`messy_enrollments.csv`)

| Row | Field | Issue Type | Description | Solution |
|-----|-------|------------|-------------|----------|
| 3 | enrollment_date | Format | "15/01/2024" (DD/MM/YYYY) | Standardize to ISO |
| 4 | enrollment_date | Format | "Jan 15, 2024" | Parse and convert |
| 12 | student_email | Invalid | Missing .edu domain | Match with students |
| 13 | student_email | Orphan | Student doesn't exist | Reject invalid ref |
| 14 | All | Duplicate | Same student, course | Deduplicate |
| 15 | course_id | Invalid Ref | Course 99 doesn't exist | Reject invalid ref |
| 16 | grade | Invalid | "B+" not in allowed grades | Reject |

---

## 5. Column Mapping (Source → Target)

### Students

| Source Column | Target Column | Transformation |
|---------------|---------------|----------------|
| student_id | - | Ignore (auto-generate) |
| first_name | student_first_name | TRIM() |
| last_name | student_last_name | TRIM() |
| email | student_email | LOWER(), TRIM(), validate format |
| date_of_birth | student_date_of_birth | Parse to DATE, validate 16+ years |
| year | student_year | Parse to INT, validate 1-4 |
| phone_number | student_phone_number | Normalize format |
| department | department_id | Map to departments table |

### Enrollments

| Source Column | Target Column | Transformation |
|---------------|---------------|----------------|
| enrollment_id | - | Ignore (auto-generate) |
| student_email | student_id | Lookup from students table |
| course_id | course_id | Parse to INT, validate exists |
| grade | grade | Validate A/A-/B/B-/C/C-/D/F |
| enrollment_date | enrollment_date | Parse to DATE (required) |

---

## 6. Summary Statistics

| Metric | Students | Enrollments |
|--------|----------|-------------|
| Total Rows | 16 | 16 |
| Duplicates | 1 | 1 |
| Missing Values | 2 | 0 |
| Invalid References | 1 | 3 |
| Format Issues | 3 | 2 |
| Invalid Grade | - | 1 |
| Under 16 | 1 | - |
| **Expected Clean Rows** | ~9 | ~10 |

---

## 7. Recommendations

1. **Implement validation in ETL pipeline** before loading
2. **Create lookup tables** for departments/courses first
3. **Use foreign keys** to enforce referential integrity
4. **Standardize naming conventions** (e.g., always "Computer Science", never "CS")
5. **Implement email validation** with regex pattern
6. **Use ISO 8601 date format** (YYYY-MM-DD) consistently
7. **Validate age constraint** (16+ years) before insertion
8. **Normalize phone numbers** to consistent format (+91-XXXXXXXXXX)
