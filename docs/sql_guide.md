# SQL Development & Optimization - Guide

## 📁 Files Created

### 1. **queries.sql** - 17 Business Queries

**Aggregations:**
- Q1: Students per department
- Q2: Average grade per course (with GPA calculation)
- Q3: Enrollments per student
- Q4: Students per year
- Q5: Course popularity by department

**JOINs:**
- Q6: Student details with department
- Q7: Complete enrollment report (4-way JOIN)
- Q8: Students with course count and GPA
- Q9: Cross-department enrollments

**Data Quality:**
- Q10: Detect duplicate emails (should be 0)
- Q11: Students without enrollments
- Q12: Enrollments without grades
- Q13: Students under 16 (should be 0)
- Q14: Invalid grades (should be 0)

**Advanced Reports:**
- Q15: Department report card
- Q16: Top performers (GPA >= 3.5)
- Q17: Grade distribution per course

---

### 2. **views.sql** - 5 Reusable Views

| View | Purpose |
|------|---------|
| `vw_student_details` | Student + department info (pre-joined) |
| `vw_enrollment_report` | Full enrollment with all details |
| `vw_student_gpa` | GPA calculations + performance levels |
| `vw_course_statistics` | Course enrollment and grade stats |
| `vw_department_summary` | High-level department metrics |

**Usage Example:**
```sql
-- Instead of complex JOIN:
SELECT * FROM vw_student_gpa WHERE gpa >= 3.5;
```

---

### 3. **procedures.sql** - 7 Stored Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `grade_to_points(grade)` | DECIMAL | Convert A-F to 0.0-4.0 |
| `get_student_gpa(student_id)` | DECIMAL | Calculate student GPA |
| `enroll_student(...)` | INT | Safely enroll with validation |
| `get_course_average(course_id)` | DECIMAL | Get course avg GPA |
| `get_department_stats(dept_id)` | JSON | Department stats as JSON |
| `update_student_grade(...)` | BOOLEAN | Update grade with validation |
| `get_pending_grades()` | TABLE | Enrollments needing grades |

**Usage Example:**
```sql
SELECT get_student_gpa(1);  -- Returns 3.45
SELECT enroll_student(5, 'CS201', '2024-01-15');
```

---

### 4. **optimization.sql** - Performance Analysis

**What it covers:**
- Index usage analysis
- EXPLAIN ANALYZE examples (see query execution plans)
- Finding missing/unused indexes
- Query optimization tips
- Database statistics queries
- Maintenance commands (ANALYZE, VACUUM)

**Key Optimization Tips:**
1. ✅ Use `LIMIT` for pagination
2. ✅ Use `EXISTS` instead of `COUNT` for boolean checks
3. ✅ Select only needed columns (not `SELECT *`)
4. ✅ Use appropriate JOIN types (LEFT vs INNER)

---

## 🎯 Key Concepts

### Views vs Tables
- **Table:** Stores actual data on disk
- **View:** Virtual table, stores only the query
- **Benefit:** Write complex query once, reuse forever

### Indexes
- **Purpose:** Speed up SELECT queries
- **Trade-off:** Slower INSERT/UPDATE, uses disk space
- **Your indexes:** email, department_id, student_id,course_id

### Stored Procedures
- **Purpose:** Reusable database functions
- **Benefits:** 
  - Runs IN database (fast)
  - Consistent logic across apps
  - Can validate data before changes

### EXPLAIN ANALYZE
Shows how PostgreSQL executes your query:
- **Index Scan:** Fast (uses index)
- **Seq Scan:** Slow (checks every row)
- **Execution time:** Actual milliseconds

---

## ✅ Next Steps

1. **Run ETL** to populate database
2. **Execute** `views.sql` and `procedures.sql`
3. **Test queries** from `queries.sql`
4. **Run** EXPLAIN ANALYZE examples
5. **Screenshot** results for documentation
