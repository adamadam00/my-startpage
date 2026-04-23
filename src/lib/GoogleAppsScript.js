/**
 * STARTPAGE - Google Apps Script
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Click "New Project"
 * 3. Delete any existing code, paste this entire file
 * 4. Click Save (floppy disk icon)
 * 5. Click "Deploy" → "New deployment"
 * 6. Type: "Web app"
 * 7. Execute as: "Me"
 * 8. Who has access: "Anyone"   ← important!
 * 9. Click "Deploy"
 * 10. Copy the Web App URL (looks like https://script.google.com/macros/s/ABC.../exec)
 * 11. Paste that URL into your startpage Settings → General → Calendar & Gmail
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTE: The URL acts as a secret key — don't share it publicly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function doGet(e) {
  const type = e.parameter.type || 'calendar'
  
  let result
  if (type === 'gmail') {
    result = getUnreadEmails()
  } else {
    result = getCalendarEvents()
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function getCalendarEvents() {
  try {
    const now = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 3)
    end.setHours(23, 59, 59, 999)

    const cal = CalendarApp.getDefaultCalendar()
    const events = cal.getEvents(now, end)

    return events.map(function(ev) {
      return {
        title: ev.getTitle(),
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        allDay: ev.isAllDayEvent(),
        location: ev.getLocation() || null,
        link: 'https://calendar.google.com/calendar/r/eventedit/' + ev.getId()
      }
    })
  } catch (err) {
    return { error: err.message }
  }
}

// ── GMAIL ─────────────────────────────────────────────────────────────────────
function getUnreadEmails() {
  try {
    const threads = GmailApp.getInboxThreads(0, 20)
    const unread = threads.filter(function(t) { return t.isUnread() })

    return unread.slice(0, 15).map(function(thread) {
      const lastMsg = thread.getMessages().slice(-1)[0]
      const from = lastMsg.getFrom()
      // Clean up "Name <email>" → just "Name"
      const fromClean = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || from

      return {
        subject: thread.getFirstMessageSubject() || '(no subject)',
        from: fromClean,
        date: lastMsg.getDate().toISOString(),
        link: 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId()
      }
    })
  } catch (err) {
    return { error: err.message }
  }
}
