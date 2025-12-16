# Sheet2DB 📊➡️🗄️

Automated student registration pipeline: Google Sheets → NeonDB

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-blue)
![Google Apps Script](https://img.shields.io/badge/Google-Apps%20Script-orange)

## Overview

A complete backend solution for automating student data management:
- **ETL Pipeline**: Extract from CSV, transform (clean/validate), load to PostgreSQL
- **REST API**: Express server for real-time student registration
- **Google Apps Script**: Auto-register students when rows are added to Google Sheets

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
│  (PostgreSQL)   │                      │  (localhost)    │
└─────────────────┘                      └─────────────────┘
```

## Features

-  Real-time validation on Google Sheet edit
-  API key authentication
-  Color-coded status (green=success, red=error)
-  Daily error email notifications
-  Duplicate email prevention
-  Data cleaning (normalize emails, parse dates, standardize departments)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```
DATABASE_URL=postgresql://user:pass@host/db
API_SECRET_KEY=your_generated_key
```

### 3. Initialize Database
```bash
npm run init:db
```

### 4. Run ETL Pipeline (CSV → DB)
```bash
npm run etl
```

### 5. Start API Server
```bash
npm run start:api
```

## Google Sheets Automation

### Setup
1. Start API: `npm run start:api`
2. Start ngrok: `ngrok http 3000`
3. Copy `apps-script/Code.gs` to Google Apps Script
4. Update CONFIG with ngrok URL and API key
5. Run `setupTriggers()` once

### Sheet Headers
| firstName | lastName | email | dateOfBirth | year | phoneNumber | department | Status | Error |

## Project Structure

```
sheet2db/
├── api/
│   └── server.js          # Express API with auth
├── apps-script/
│   └── Code.gs            # Google Apps Script
├── data/
│   ├── messy_students.csv # Sample messy data
│   └── messy_enrollments.csv
├── docs/
│   └── task6-interview-script.md
├── etl/
│   ├── index.js           # Main pipeline
│   ├── extract.js         # CSV/JSON extraction
│   ├── transform.js       # Data cleaning
│   ├── load.js            # DB insertion
│   └── utils/
│       ├── validators.js  # Validation functions
│       └── logger.js      # Logging utility
├── scripts/
│   ├── init_db.js         # Schema initialization
│   └── test_connection.js # DB connectivity test
└── sql/
    ├── schema.sql         # Table definitions
    ├── seed.sql           # Sample data
    ├── queries.sql        # Analytics queries
    ├── views.sql          # Reusable views
    ├── procedures.sql     # Stored functions
    └── optimization.sql   # Performance tips
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:api` | Start REST API server |
| `npm run etl` | Run ETL pipeline (CSV → DB) |
| `npm run etl -- --pending` | Process Apps Script JSON export |
| `npm run init:db` | Initialize database schema |
| `npm run test:db` | Test database connection |
| `npm run test:sql` | Run SQL test queries |

## Database Schema

- **department**: id, name, head
- **student**: id, first_name, last_name, email, dob, year, phone, department_id
- **course**: id (varchar), name, department_id, credits
- **enrollment**: id, student_id, course_id, grade, enrollment_date

### Constraints
- Students must be ≥16 years old
- Year must be 1-4
- Grades: A, A-, B, B-, C, C-, D, F
- Email must be unique

## Tech Stack

- **Runtime**: Node.js 18+
- **Database**: PostgreSQL (NeonDB)
- **API**: Express.js
- **Automation**: Google Apps Script
- **Tunnel**: ngrok (for local development)

## License

MIT
