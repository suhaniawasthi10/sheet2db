# Task 6: Google Apps Script Automation

## Overview

Fully automated student registration: Google Sheets → Apps Script → REST API → NeonDB

## Architecture

```
┌─────────────────┐    onEdit trigger    ┌─────────────────┐
│  Google Sheets  │ ──────────────────▶  │  Apps Script    │
│  (New Row Added)│                      │  (Validates)    │
└─────────────────┘                      └────────┬────────┘
                                                  │ HTTP POST
                                                  ▼
┌─────────────────┐    ngrok tunnel      ┌─────────────────┐
│    NeonDB       │ ◀────────────────    │  localhost:3000 │
│  (PostgreSQL)   │                      │  (Express API)  │
└─────────────────┘                      └─────────────────┘
```

## Setup Steps

1. **Start API**: `npm run start:api`
2. **Start ngrok**: `ngrok http 3000`
3. **Update Apps Script** with ngrok URL and API key
4. **Run `setupTriggers()`** once to create automation

## Google Sheet Headers

| firstName | lastName | email | dateOfBirth | year | phoneNumber | department | Status | Error |

## Features

- ✅ Real-time validation on edit
- ✅ API key authentication  
- ✅ Color-coded status (green=success, red=error)
- ✅ Daily error email report (11:59 PM)
- ✅ Duplicate email prevention

## Interview Explanation (2 min)

*"For Task 6, I implemented fully automated registration using Google Apps Script with installable triggers. When a new student row is added:*

1. *Apps Script validates the data (email, year 1-4, required fields)*
2. *Sends to my Express API via ngrok tunnel*
3. *API authenticates with API key, validates again, inserts into NeonDB*
4. *Sheet updates with green status and Student ID*

*For production, I'd deploy the API to Railway/Render with a permanent URL instead of ngrok.*

*The key features are real-time validation, API key security, color-coded feedback, and daily error emails."*

## Key Files

| File | Purpose |
|------|---------|
| `apps-script/Code.gs` | Google Apps Script (copy to Google) |
| `api/server.js` | Express API with authentication |
| `.env` | Contains `API_SECRET_KEY` |
