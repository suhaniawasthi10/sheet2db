# Sheet2DB 

Automated student registration pipeline: Google Sheets → NeonDB

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-blue)
![Google Apps Script](https://img.shields.io/badge/Google-Apps%20Script-orange)

## Overview

A complete backend solution for automating student data management:
- **ETL Pipeline**: Extract from CSV, transform (clean/validate), load to PostgreSQL
- **REST API**: Express server for real-time student registration
- **Google Apps Script**: Auto-register students when rows are added to Google Sheets
- **Public Datasets**: Practice queries & optimizations with Chinook and World Happiness datasets

## Architecture

```
┌─────────────────┐    onEdit trigger    ┌─────────────────┐
│  Google Sheets  │ ──────────────────▶  │  Apps Script    │
│  (New Row Added)│                      │  (Validates)    │
└─────────────────┘                      └────────┬────────┘
                                                  │ HTTP POST
                                                  ▼
┌─────────────────┐                      ┌─────────────────┐
│    NeonDB       │ ◀────────────────    │  Express API    │
│  (PostgreSQL)   │                      │  (Port 3000)    │
└─────────────────┘                      └─────────────────┘
```

## Features

- ✅ Real-time validation on Google Sheet edit
- ✅ API key authentication
- ✅ Color-coded status (green=success, red=error)
- ✅ Daily error email notifications
- ✅ Duplicate email prevention
- ✅ Data cleaning (normalize emails, parse dates, standardize departments)
- ✅ Materialized views for analytics
- ✅ Stored procedures for complex queries
- ✅ Incremental ETL with sync tracking

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **PostgreSQL database** - Free tier available at [NeonDB](https://neon.tech/)
- **Google Account** for Google Sheets & Apps Script
- **ngrok account** (free) for local development tunneling ([Sign up](https://ngrok.com/))
- **Git** (optional) for version control

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
API_SECRET_KEY=your_secure_random_key_here
```

**How to get your credentials:**

- **DATABASE_URL**: 
  1. Create a free account at [NeonDB](https://neon.tech/)
  2. Create a new project
  3. Copy the connection string from the dashboard
  
- **API_SECRET_KEY**: Generate a secure random key:
  ```bash
  # On macOS/Linux
  openssl rand -hex 32
  
  # Or use Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. Initialize Database
```bash
npm run init:db
```

This will create all necessary tables, views, and constraints.

### 4. Run ETL Pipeline (CSV → DB)
```bash
npm run etl
```

Loads sample data from `data/messy_students.csv` and `data/messy_enrollments.csv`.

### 5. Start API Server
```bash
npm run start:api
```

API will be available at `http://localhost:3000`

## Google Sheets Automation

### Setup Instructions

1. **Start the API server**:
   ```bash
   npm run start:api
   ```

2. **Start ngrok tunnel** (in a new terminal):
   ```bash
   ngrok http 3000
   ```
   Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)

3. **Configure Google Apps Script**:
   - Open your Google Sheet
   - Go to Extensions → Apps Script
   - Copy the contents of `apps-script/Code.gs`
   - Update the `CONFIG` object:
     ```javascript
     const CONFIG = {
       API_BASE_URL: 'https://your-ngrok-url.ngrok.io',  // Your ngrok URL
       API_KEY: 'your_api_secret_key',                    // From .env file
       // ... other settings
     };
     ```

4. **Set up triggers**:
   - In Apps Script editor, run the `setupTriggers()` function once
   - Authorize the script when prompted

5. **Test the automation**:
   - Add a new row to your Google Sheet
   - The Status column should turn green with "✓ Registered" if successful

### Required Sheet Headers

Your Google Sheet must have these exact column headers:

| firstName | lastName | email | dateOfBirth | year | phoneNumber | department | Status | Error |

## API Endpoints

### `POST /api/register`

Register a new student.

**Headers:**
```
x-api-key: your_api_secret_key
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "dateOfBirth": "2005-03-15",
  "year": 2,
  "phoneNumber": "+1234567890",
  "department": "Computer Science"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Student registered successfully",
  "studentId": 123
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Email already exists"
}
```

## Project Structure

```
sheet2db/
├── api/
│   └── server.js                # Express API with authentication
├── apps-script/
│   └── Code.gs                  # Google Apps Script automation
├── data/
│   ├── messy_students.csv       # Sample student data
│   ├── messy_enrollments.csv    # Sample enrollment data
│   ├── chinook_*.csv            # Chinook dataset (Task 7)
│   └── world_happiness_*.csv    # World Happiness dataset (Task 7)
├── docs/
│   ├── task6-interview-script.md           # Google Apps Script demo guide
│   ├── final-presentation.md               # Complete project documentation
│   ├── data_audit.md                       # Data quality analysis
│   └── sql_guide.md                        # SQL best practices
├── etl/
│   ├── index.js                 # Main ETL pipeline orchestrator
│   ├── extract.js               # Data extraction (CSV/JSON)
│   ├── transform.js             # Data cleaning & validation
│   ├── load.js                  # Database insertion
│   ├── pending-registrations.js # Process Apps Script exports
│   ├── task7/
│   │   ├── index.js             # Task 7 ETL pipeline
│   │   └── incremental.js       # Incremental sync demo
│   └── utils/
│       ├── validators.js        # Validation helper functions
│       └── logger.js            # Logging utility
├── scripts/
│   ├── init_db.js               # Initialize database schema
│   ├── test_connection.js       # Test DB connectivity
│   ├── run_sql_tests.js         # Execute SQL test queries
│   ├── run_sql_direct.js        # Run raw SQL files
│   ├── load_task7_data.js       # Load public datasets
│   ├── load_task7_datasets.sh   # Shell script for dataset loading
│   ├── verify_task7.js          # Verify Task 7 implementation
│   └── test_api_registration.sh # Test API endpoints
└── sql/
    ├── schema.sql                      # Table definitions & constraints
    ├── seed.sql                        # Sample seed data
    ├── queries.sql                     # Analytics queries (Task 3)
    ├── views.sql                       # Reusable views (Task 4)
    ├── procedures.sql                  # Stored procedures (Task 5)
    ├── optimization.sql                # Indexing & optimization tips
    ├── task7_materialized_views.sql    # Materialized views for datasets
    ├── task7_optimizations.sql         # Performance benchmarks
    └── task7_procedures.sql            # Dataset-specific procedures
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:api` | Start REST API server on port 3000 |
| `npm run dev` | Start API in development mode with auto-reload |
| `npm run etl` | Run main ETL pipeline (students & enrollments) |
| `npm run etl -- --pending` | Process pending registrations from Apps Script |
| `npm run init:db` | Initialize database schema & tables |
| `npm run test:db` | Test database connection |
| `npm run test:sql` | Run SQL test queries |
| `npm run task7:load` | Load Chinook & World Happiness datasets |
| `npm run task7:etl` | Run Task 7 ETL pipeline |
| `npm run task7:incremental` | Test incremental sync with upserts |

## Database Schema

### Core Tables

- **department**: `id`, `name`, `head`
- **student**: `id`, `first_name`, `last_name`, `email`, `dob`, `year`, `phone`, `department_id`
- **course**: `id` (varchar), `name`, `department_id`, `credits`
- **enrollment**: `id`, `student_id`, `course_id`, `grade`, `enrollment_date`

### Task 7 Tables

- **artist**, **album**, **track**, **genre**, **customer**, **invoice**, **invoice_line** (Chinook)
- **country_happiness** (World Happiness Report)
- **etl_sync_log** (incremental ETL tracking)

### Constraints & Validations

- Students must be ≥16 years old
- Year must be between 1-4
- Valid grades: A, A-, B, B-, C, C-, D, F
- Email must be unique
- Phone numbers validated (10+ digits)
- Department must exist in department table (foreign key)

## Troubleshooting

### Common Issues

#### 1. **Database Connection Fails**

```
Error: connect ECONNREFUSED
```

**Solution:**
- Verify your `DATABASE_URL` in `.env` is correct
- Check if your IP is whitelisted in NeonDB dashboard
- Ensure you're using SSL mode: `?sslmode=require`
- Test connection: `npm run test:db`

#### 2. **Apps Script: "Unauthorized" Error**

**Solution:**
- Verify `API_KEY` in Apps Script CONFIG matches your `.env` file
- Check that the API server is running (`npm run start:api`)
- Ensure ngrok tunnel is active and URL is correct

#### 3. **Apps Script: Triggers Not Firing**

**Solution:**
- Run `setupTriggers()` function in Apps Script editor
- Check Apps Script project triggers (clock icon in sidebar)
- Delete old triggers and recreate
- Ensure you've authorized the script

#### 4. **ngrok Warning Page**

When using ngrok free tier, you may encounter a warning page.

**Solution:**
- Apps Script automatically handles this (see `bypassNgrokWarning()` function)
- For manual testing, append `/skip-browser-warning` to ngrok URL

#### 5. **Duplicate Email Error**

```
Error: Email already exists
```

**Solution:**
- Email uniqueness is enforced by database constraint
- Check if student already exists: `SELECT * FROM student WHERE email = 'email@example.com'`
- This is expected behavior to prevent duplicates

#### 6. **Student Age Validation Fails**

```
Error: Student must be at least 16 years old
```

**Solution:**
- Verify `dateOfBirth` is in correct format: `YYYY-MM-DD`
- Check that student is actually ≥16 years old
- Validation happens both client-side (Apps Script) and server-side (API)

#### 7. **Port 3000 Already in Use**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in api/server.js
```

## Tech Stack

- **Runtime**: Node.js 18+
- **Database**: PostgreSQL 14+ (hosted on NeonDB)
- **API Framework**: Express.js 5.x
- **CSV Parsing**: csv-parse
- **Database Client**: node-postgres (pg)
- **Automation**: Google Apps Script
- **Development Tunnel**: ngrok
- **Environment Config**: dotenv

---

## Task 7: Public Dataset Practice & Optimizations

### Datasets Loaded

| Dataset | Records | Description |
|---------|---------|-------------|
| **Chinook** | 3,503 tracks, 275 artists, 347 albums | Digital media store database |
| **World Happiness** | 156 countries | 2019 World Happiness Report metrics |

### Features Implemented

- **Materialized Views**: 
  - `mv_artist_sales_summary` - Artist revenue analytics
  - `mv_genre_popularity` - Genre sales rankings
  - `mv_customer_lifetime_value` - Customer value metrics
  - `mv_happiness_by_region` - Regional happiness aggregations

- **Stored Procedures**:
  - `get_top_artists(limit)` - Top selling artists
  - `get_genre_report()` - Comprehensive genre statistics
  - `compare_countries(country1, country2)` - Country happiness comparison
  - `get_customer_purchase_history(customer_id)` - Detailed purchase records
  - `get_album_details(album_id)` - Album information with tracks
  - `search_tracks(query)` - Full-text track search

- **Incremental ETL**:
  - `etl_sync_log` table for tracking last sync times
  - Upsert patterns using `ON CONFLICT` clauses
  - Delta detection for efficient updates

### Commands

```bash
# Load public datasets (Chinook + World Happiness)
npm run task7:load

# Run Task 7 ETL pipeline
npm run task7:etl

# Test incremental ingestion with upserts
npm run task7:incremental

# Verify implementation
node scripts/verify_task7.js

# Run SQL procedures directly
node scripts/run_sql_direct.js sql/task7_procedures.sql
```

### SQL Files

- [`sql/task7_materialized_views.sql`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/sql/task7_materialized_views.sql) - 4 materialized views + refresh functions
- [`sql/task7_optimizations.sql`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/sql/task7_optimizations.sql) - Strategic indexes & performance benchmarks
- [`sql/task7_procedures.sql`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/sql/task7_procedures.sql) - 6 stored procedures for data retrieval

---

## Documentation

For detailed documentation, see:

- [`docs/final-presentation.md`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/docs/final-presentation.md) - Complete project walkthrough
- [`docs/task6-interview-script.md`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/docs/task6-interview-script.md) - Google Apps Script demo guide
- [`docs/sql_guide.md`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/docs/sql_guide.md) - SQL best practices
- [`docs/data_audit.md`](file:///Users/suhaniawasthi/Desktop/backend/sheet2DB/docs/data_audit.md) - Data quality analysis

---

