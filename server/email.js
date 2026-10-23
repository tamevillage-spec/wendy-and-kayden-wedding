"use strict";

const { site } = require("./site-data");

const C = {
  pine: "#1a2821",
  evergreen: "#28604c",
  gold: "#b27e49",
  goldLight: "#d6b285",
  cream: "#faf6ef",
  paper: "#fffdf8",
  ink: "#1a2821",
  muted: "#6d7568",
  line: "#e2d9c9",
};

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function guestLine(rsvp) {
  if (rsvp.attending === "no") return "We are sorry you cannot make it — thank you for letting us know.";
  if (rsvp.guests > 1) return `We have you down for ${rsvp.guests} guests.`;
  return "We have you down for one seat.";
}

function scheduleRows() {
  return site.schedule
    .map(
      (item) => `
      <tr>
        <td style="padding:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${C.gold};white-space:nowrap;width:96px;vertical-align:top;">${escapeHtml(item.time)}</td>
        <td style="padding:7px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${C.ink};line-height:1.5;">
          <strong style="font-weight:600;">${escapeHtml(item.title)}</strong><br>
          <span style="color:${C.muted};">${escapeHtml(item.note)}</span>
        </td>
      </tr>`
    )
    .join("");
}

// The site copy points at the QR on the page; email has no QR image, so drop that clause.
function emailGiftBody() {
  return String(site.gifts.body || "")
    .replace(/[—–-]\s*scan the code below\s*[—–-]/gi, ",")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",");
}

function buildSubject(rsvp) {
  return rsvp.attending === "no"
    ? `We will miss you — ${site.couple.display}`
    : `RSVP confirmed — ${site.couple.display} at ${site.venue.name}`;
}

function buildText(rsvp) {
  const lines = [
    `Hi ${rsvp.fullName},`,
    "",
    guestLine(rsvp),
    "",
    `WHO: ${site.couple.display}`,
    `WHEN: ${site.dateDisplay} — arrive 12:00 PM, ceremony 1:00 PM, farewell 4:30 PM`,
    `WHERE: ${site.venue.name}, ${site.venue.city}`,
    "",
    "DIRECTIONS",
    `Google Maps: ${site.maps.google}`,
    `Apple Maps: ${site.maps.apple}`,
    "",
    "PARKING",
    site.venue.parkingNote,
    "",
    "CHILDREN",
    site.childrenNote,
    "",
    "DRESS CODE",
    `${site.dressCode.title} — ${site.dressCode.note}`,
    "",
    "GIFTS",
    `${site.gifts.headline} ${emailGiftBody()}`,
    "",
    "QUESTIONS",
    ...site.contacts.map((c) => `${c.name}: ${c.email}`),
    "",
    `— ${site.couple.display}`,
  ];
  return lines.join("\n");
}

function buildHtml(rsvp) {
  const unsubNote =
    rsvp.attending === "no"
      ? "We are sorry you cannot make it — thank you for letting us know. If your plans change, just reply to this email."
      : guestLine(rsvp);

  const contacts = site.contacts
    .map(
      (c) =>
        `<a href="mailto:${escapeHtml(c.email)}" style="color:${C.evergreen};text-decoration:none;">${escapeHtml(c.email)}</a>`
    )
    .join('<span style="color:#c9bfae;"> &nbsp;·&nbsp; </span>');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(buildSubject(rsvp))}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your RSVP for ${escapeHtml(
    site.couple.display
  )} is confirmed. Directions and parking inside.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};padding:28px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.paper};border:1px solid ${C.line};">

        <!-- header -->
        <tr>
          <td style="background:${C.pine};padding:38px 32px 32px;text-align:center;">
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3.5px;text-transform:uppercase;color:${C.goldLight};padding-bottom:18px;">Together with their families</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:40px;line-height:1.05;color:${C.cream};letter-spacing:0.5px;">${escapeHtml(
              site.couple.display
            )}</div>
            <div style="width:56px;height:1px;background:${C.gold};margin:22px auto 18px;"></div>
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.6px;text-transform:uppercase;color:rgba(250,246,239,0.78);">${escapeHtml(
              site.venue.name
            )} &nbsp;·&nbsp; ${escapeHtml(site.venue.city)}</div>
          </td>
        </tr>

        <!-- confirmation -->
        <tr>
          <td style="padding:34px 32px 8px;">
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:12px;">${
              rsvp.attending === "no" ? "Your reply" : "Reservation confirmed"
            }</div>
            <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;color:${C.ink};">${
              rsvp.attending === "no" ? "We will miss you" : "Thank you"
            }, ${escapeHtml(rsvp.fullName)}.</h1>
            <p style="margin:0 0 6px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${C.muted};">${escapeHtml(
              unsubNote
            )}</p>
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${C.muted};">${
              site.dateISO
                ? escapeHtml(site.dateDisplay)
                : "The date is still being finalized — we will email you the moment it is set."
            }</p>
          </td>
        </tr>

        <!-- schedule -->
        <tr>
          <td style="padding:26px 32px 6px;">
            <div style="border-top:1px solid ${C.line};padding-top:24px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:10px;">The Day</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${scheduleRows()}</table>
            </div>
          </td>
        </tr>

        <!-- directions -->
        <tr>
          <td style="padding:22px 32px 0;">
            <div style="border-top:1px solid ${C.line};padding-top:24px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:10px;">Directions</div>
              <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.4;color:${C.ink};">${escapeHtml(
                site.venue.name
              )}<br><span style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};">${escapeHtml(
                site.venue.city
              )}</span></p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="${site.maps.google}" style="display:inline-block;background:${C.evergreen};color:${C.cream};text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;padding:12px 18px;">Google Maps</a>
                  </td>
                  <td>
                    <a href="${site.maps.apple}" style="display:inline-block;border:1px solid ${C.gold};color:${C.ink};text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;padding:11px 18px;">Apple Maps</a>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- parking -->
        <tr>
          <td style="padding:22px 32px 0;">
            <div style="border-top:1px solid ${C.line};padding-top:24px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:10px;">Parking</div>
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${C.muted};">${escapeHtml(
                site.venue.parkingNote
              )}</p>
            </div>
          </td>
        </tr>

        <!-- children -->
        <tr>
          <td style="padding:22px 32px 0;">
            <div style="border-top:1px solid ${C.line};padding-top:24px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:10px;">Children</div>
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${C.muted};">${escapeHtml(
                site.childrenNote
              )}</p>
            </div>
          </td>
        </tr>

        <!-- dress + gifts -->
        <tr>
          <td style="padding:22px 32px 0;">
            <div style="border-top:1px solid ${C.line};padding-top:24px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:10px;">Dress Code</div>
              <p style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${C.muted};"><strong style="color:${C.ink};font-weight:600;">${escapeHtml(
                site.dressCode.title
              )}</strong> — ${escapeHtml(site.dressCode.note)}</p>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${C.gold};padding-bottom:10px;">Gifts</div>
              <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.7;color:${C.muted};">${escapeHtml(
                site.gifts.headline
              )} ${escapeHtml(emailGiftBody())}</p>
            </div>
          </td>
        </tr>

        <!-- questions -->
        <tr>
          <td style="padding:24px 32px 34px;">
            <div style="border-top:1px solid ${C.line};padding-top:22px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.8;color:${C.muted};">
              Questions? ${contacts}
            </div>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="background:${C.pine};padding:24px 32px;text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:4px;color:${C.goldLight};">${escapeHtml(
              site.couple.monogram
            )}</div>
            <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(250,246,239,0.55);padding-top:8px;">${escapeHtml(
              site.couple.display
            )} &nbsp;·&nbsp; ${site.dateDisplay}</div>
          </td>
        </tr>

      </table>
      <div style="max-width:600px;padding:16px 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#8d948a;text-align:center;">
        You are receiving this because you RSVP'd at ${escapeHtml(site.couple.display)}'s wedding website.
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

module.exports = { buildHtml, buildText, buildSubject, guestLine };
