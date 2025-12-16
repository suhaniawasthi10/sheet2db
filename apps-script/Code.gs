/* ================= CONFIG ================= */

const CONFIG = {
  API_BASE_URL: 'https://shieldlessly-demagogic-beverly.ngrok-free.dev/api',
  API_SECRET_KEY: '7f7b957af1498af49aad80994c1ddc1a909cbb7c41cfca63338a3baa6febe5d5',
  SHEET_NAME: 'Students',
  NOTIFICATION_EMAIL: 'nownotloki@gmail.com',  // Change to your email
  VALIDATION_COLUMN: 'Status',
  ERROR_COLUMN: 'Error'
};

/* ================= EDIT HANDLER ================= */
/* INSTALLABLE trigger - fires on any edit */

function handleEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;

  const row = e.range.getRow();
  if (row === 1) return; // Skip header row

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const record = {};
  headers.forEach((h, i) => record[h] = values[i]);

  processNewStudent(record, row, sheet);
}

/* ================= CORE PROCESSING ================= */

function processNewStudent(record, row, sheet) {
  const previousStatus = getStatus(sheet, row);
  if (previousStatus === 'Registered') return; // Already registered

  // Check if ALL required fields are filled before processing
  // This prevents triggering on incomplete rows
  const requiredFields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'year', 'phoneNumber', 'department'];
  const isRowComplete = requiredFields.every(field => {
    const value = record[field];
    return value !== undefined && value !== null && value.toString().trim() !== '';
  });
  
  if (!isRowComplete) {
    Logger.log('⏳ Row ' + row + ' incomplete - waiting for all fields');
    return; // Don't process until all fields are filled
  }

  clearStatus(sheet, row);
  
  // Log row being processed
  Logger.log('🔔 Row edited: ' + row);

  const validation = validateStudent(record);
  if (!validation.isValid) {
    Logger.log('❌ Validation failed: ' + validation.errors.join('; '));
    markRow(sheet, row, 'Invalid', validation.errors.join('; '));
    // Send immediate email notification for invalid row
    sendErrorEmail(row, record.email || 'N/A', 'Validation Failed', validation.errors);
    return;
  }

  const transformedData = transform(record);
  
  // Log data being sent
  Logger.log('📤 Sending to API: ' + record.email);
  Logger.log('📋 Data: ' + JSON.stringify(transformedData));
  
  const response = sendToAPI(transformedData);

  if (response.success) {
    const studentId = response.data?.data?.studentId || 
                      response.data?.studentId || 
                      'N/A';
    // Log successful registration
    Logger.log('✅ API Response Code: 201');
    Logger.log('📥 API Response Body: ' + JSON.stringify(response.data));
    Logger.log('✅ Registered! Student ID: ' + studentId);
    markRow(sheet, row, 'Registered', `Student ID: ${studentId}`);
    // Send success email notification
    sendSuccessEmail(row, record.email, studentId);
  } else if (response.error && response.error.toLowerCase().includes('email already exists')) {
    // Email exists = student already registered, treat as success
    Logger.log('ℹ️ Student already registered with this email');
    markRow(sheet, row, 'Registered', 'Already in database');
  } else {
    Logger.log('❌ API Error: ' + response.error);
    markRow(sheet, row, 'Error', response.error);
    // Send immediate email notification for API error
    sendErrorEmail(row, record.email || 'N/A', 'API Error', [response.error]);
  }
}

/* ================= SUCCESS EMAIL ================= */

function sendSuccessEmail(row, studentEmail, studentId) {
  try {
    const subject = `✅ Student Registered Successfully - ${studentEmail}`;
    const body = `
A new student has been registered successfully!

📍 Row: ${row}
📧 Email: ${studentEmail}
🆔 Student ID: ${studentId}

---
Spreadsheet: ${SpreadsheetApp.getActive().getUrl()}
Timestamp: ${new Date().toLocaleString()}
    `.trim();

    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
    Logger.log('📧 Success email sent for row ' + row);
  } catch (e) {
    Logger.log('⚠️ Failed to send success email: ' + e.toString());
  }
}

/* ================= IMMEDIATE ERROR EMAIL ================= */

function sendErrorEmail(row, studentEmail, errorType, errors) {
  try {
    const subject = `⚠️ Student Registration ${errorType} - Row ${row}`;
    const body = `
A student registration issue was detected:

📍 Row: ${row}
📧 Student Email: ${studentEmail}
❌ Error Type: ${errorType}

Issues Found:
${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Please review and correct the data in the Google Sheet.

---
Spreadsheet: ${SpreadsheetApp.getActive().getUrl()}
Timestamp: ${new Date().toLocaleString()}
    `.trim();

    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
    Logger.log(`📧 Error email sent for row ${row}`);
  } catch (e) {
    Logger.log(`⚠️ Failed to send error email: ${e.toString()}`);
  }
}

/* ================= VALIDATION ================= */

function validateStudent(r) {
  const errors = [];

  // Required fields - match your schema
  if (!r.firstName || r.firstName.toString().trim() === '') {
    errors.push('firstName is required');
  }
  if (!r.lastName || r.lastName.toString().trim() === '') {
    errors.push('lastName is required');
  }
  if (!r.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
    errors.push('Valid email required');
  }
  if (!r.dateOfBirth) {
    errors.push('dateOfBirth is required');
  } else {
    // Validate age: must be at least 16 years old
    const dob = new Date(r.dateOfBirth);
    const today = new Date();
    const age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 16) {
      errors.push('Student must be at least 16 years old (currently ' + age + ')');
    }
  }
  if (!r.year || isNaN(r.year) || r.year < 1 || r.year > 4) {
    errors.push('year must be 1-4');
  }
  if (!r.phoneNumber || r.phoneNumber.toString().trim() === '') {
    errors.push('phoneNumber is required');
  } else {
    // Validate phone format: must have at least 10 digits, allow +, -, spaces
    const digitsOnly = r.phoneNumber.toString().replace(/[\s\-\+]/g, '');
    if (!/^\d{10,15}$/.test(digitsOnly)) {
      errors.push('phoneNumber must have 10-15 digits (got ' + digitsOnly.length + ')');
    }
  }
  if (!r.department || r.department.toString().trim() === '') {
    errors.push('department is required');
  }

  return { isValid: errors.length === 0, errors };
}

function transform(r) {
  // Format date to YYYY-MM-DD if it's a Date object
  let dob = r.dateOfBirth;
  if (dob instanceof Date) {
    dob = dob.toISOString().split('T')[0];
  }

  return {
    firstName: String(r.firstName).trim(),
    lastName: String(r.lastName).trim(),
    email: String(r.email).trim().toLowerCase(),
    dateOfBirth: dob,
    year: parseInt(r.year),
    phoneNumber: String(r.phoneNumber).trim(),
    department: String(r.department).trim()
  };
}

/* ================= API CALL ================= */

function sendToAPI(record) {
  try {
    const res = UrlFetchApp.fetch(
      CONFIG.API_BASE_URL + '/students',
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(record),
        headers: {
          'Authorization': 'Bearer ' + CONFIG.API_SECRET_KEY,
          'X-API-Key': CONFIG.API_SECRET_KEY,
          'ngrok-skip-browser-warning': 'true'
        },
        muteHttpExceptions: true
      }
    );

    const code = res.getResponseCode();
    const text = res.getContentText();

    if ([200, 201].includes(code)) {
      return { success: true, data: JSON.parse(text) };
    }

    // Parse error response
    try {
      const errData = JSON.parse(text);
      return { success: false, error: errData.errors?.join('; ') || errData.error || text };
    } catch {
      return { success: false, error: text };
    }
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/* ================= SHEET HELPERS ================= */

function getStatus(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = headers.indexOf(CONFIG.VALIDATION_COLUMN) + 1;
  return col > 0 ? sheet.getRange(row, col).getValue() : '';
}

function clearStatus(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const sCol = headers.indexOf(CONFIG.VALIDATION_COLUMN) + 1;
  const eCol = headers.indexOf(CONFIG.ERROR_COLUMN) + 1;

  if (sCol > 0) sheet.getRange(row, sCol).clearContent().setBackground(null);
  if (eCol > 0) sheet.getRange(row, eCol).clearContent();
}

function markRow(sheet, row, status, message) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const sCol = headers.indexOf(CONFIG.VALIDATION_COLUMN) + 1;
  const eCol = headers.indexOf(CONFIG.ERROR_COLUMN) + 1;

  if (sCol > 0) {
    const statusCell = sheet.getRange(row, sCol);
    statusCell.setValue(status);

    if (status === 'Registered') {
      statusCell.setBackground('#d4edda'); // Green
    } else if (status === 'Invalid' || status === 'Error') {
      statusCell.setBackground('#f8d7da'); // Red
    }
  }

  if (eCol > 0) {
    sheet.getRange(row, eCol).setValue(message || '');
  }
}

/* ================= DAILY EMAIL REPORT ================= */

function sendDailyErrorEmail() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const sCol = headers.indexOf(CONFIG.VALIDATION_COLUMN);
  const eCol = headers.indexOf(CONFIG.ERROR_COLUMN);

  let body = '';
  data.forEach((row, i) => {
    if (row[sCol] === 'Error' || row[sCol] === 'Invalid') {
      body += `Row ${i + 2}: ${row[eCol]}\n`;
    }
  });

  if (!body) return;

  MailApp.sendEmail(
    CONFIG.NOTIFICATION_EMAIL,
    'Daily Student Registration Errors',
    body
  );
}

/* ================= SETUP TRIGGERS (RUN ONCE) ================= */

function setupTriggers() {
  // Remove existing triggers
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Create edit trigger
  ScriptApp.newTrigger('handleEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();

  // Create daily email trigger at 11:59 PM
  ScriptApp.newTrigger('sendDailyErrorEmail')
    .timeBased()
    .atHour(23)
    .nearMinute(59)
    .everyDays(1)
    .create();

  Logger.log('✅ Triggers created successfully!');
}

/* ================= MANUAL TEST FUNCTION ================= */

function testAPIConnection() {
  const testData = {
    firstName: 'Test',
    lastName: 'Student',
    email: 'test' + Date.now() + '@university.edu',
    dateOfBirth: '2004-05-15',
    year: 2,
    phoneNumber: '+91-9876543210',
    department: 'Computer Science'
  };

  Logger.log('Testing API connection...');
  Logger.log('Sending: ' + JSON.stringify(testData));

  const result = sendToAPI(testData);
  Logger.log('Result: ' + JSON.stringify(result));

  if (result.success) {
    Logger.log('✅ API connection successful!');
  } else {
    Logger.log('❌ API connection failed: ' + result.error);
  }
}
