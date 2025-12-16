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

  clearStatus(sheet, row);

  const validation = validateStudent(record);
  if (!validation.isValid) {
    markRow(sheet, row, 'Invalid', validation.errors.join('; '));
    return;
  }

  const response = sendToAPI(transform(record));

  if (response.success) {
    const studentId = response.data?.data?.studentId || 
                      response.data?.studentId || 
                      'N/A';
    markRow(sheet, row, 'Registered', `Student ID: ${studentId}`);
  } else {
    markRow(sheet, row, 'Error', response.error);
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
  }
  if (!r.year || isNaN(r.year) || r.year < 1 || r.year > 4) {
    errors.push('year must be 1-4');
  }
  if (!r.phoneNumber || r.phoneNumber.toString().trim() === '') {
    errors.push('phoneNumber is required');
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
