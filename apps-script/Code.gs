// RSVP backend for the Çağla & Can Arda wedding site.
// Paste this whole file into the Apps Script editor of a Google Sheet,
// then Deploy → New deployment → Web app → Access: "Anyone".
// The deploy URL goes into index.html as the form's `action` attribute.

const SHEET_NAME   = 'RSVPs';
const NOTIFY_EMAIL = ''; // optional — set to your email to get notified on each reply

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Timestamp', 'Name', 'Email', 'Attending',
        'Guests', 'Extra Names', 'After Party', 'Message'
      ]);
      sheet.setFrozenRows(1);
    }

    const p = e.parameter || {};
    const extra = Object.keys(p)
      .filter(k => /^guest\d+$/.test(k))
      .sort()
      .map(k => p[k])
      .filter(Boolean)
      .join(', ');

    sheet.appendRow([
      new Date(),
      p.name       || '',
      p.email      || '',
      p.attending  || '',
      p.guests     || '',
      extra,
      p.afterparty || '',
      p.message    || ''
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: `RSVP — ${p.name || 'Misafir'} (${p.attending || '?'})`,
        body: Object.keys(p).map(k => `${k}: ${p[k]}`).join('\n')
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('RSVP endpoint OK');
}
