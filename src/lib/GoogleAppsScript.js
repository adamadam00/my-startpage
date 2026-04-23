/**
 * STARTPAGE - Google Apps Script (with secret key security)
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP:
 * 1. Go to https://script.google.com → New Project
 * 2. Delete existing code, paste this entire file
 * 3. CHANGE THE SECRET below to something only you know
 * 4. Save → Deploy → New deployment → Web app
 * 5. Execute as: Me | Who has access: Anyone
 * 6. Copy the Web App URL
 * 7. In startpage: Settings → General → Calendar & Gmail
 *    Paste BOTH the URL and your secret key
 * ─────────────────────────────────────────────────────────────────────────────
 */

// !! CHANGE THIS !!
const SECRET = 'change-me-to-something-only-you-know'

function doGet(e) {
  if (!e.parameter.key || e.parameter.key !== SECRET) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  const type = e.parameter.type || 'calendar'
  const result = type === 'gmail' ? getUnreadEmails() : getCalendarEvents()

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
}

function getCalendarEvents() {
  try {
    const now = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 3)
    end.setHours(23, 59, 59, 999)

    const cal = CalendarApp.getDefaultCalendar()
    return cal.getEvents(now, end).map(function(ev) {
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

function getUnreadEmails() {
  try {
    const threads = GmailApp.getInboxThreads(0, 20)
    const unread = threads.filter(function(t) { return t.isUnread() })

    return unread.slice(0, 15).map(function(thread) {
      const lastMsg = thread.getMessages().slice(-1)[0]
      const from = lastMsg.getFrom()
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
