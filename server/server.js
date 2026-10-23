"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { site } = require("./site-data");
const { buildHtml, buildText, buildSubject } = require("./email");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "rsvps.json");
const OUTBOX_DIR = path.join(ROOT, "outbox");
const PORT = Number(process.env.PORT || 4173);

const ADMIN_KEY = process.env.ADMIN_KEY || crypto.randomBytes(12).toString("base64url");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_GUESTS = (site.rsvp && site.rsvp.maxGuests) || 6;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(OUTBOX_DIR, { recursive: true });

/* ------------------------------------------------------------------ store */

function readAll() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function writeAll(rows) {
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

/* -------------------------------------------------------------------- mail */

let mailer = null;
let mailerTried = false;

function getMailer() {
  if (mailerTried) return mailer;
  mailerTried = true;
  if (!process.env.SMTP_HOST) return null;
  if (process.env.SMTP_USER && !process.env.SMTP_PASS) {
    console.warn("[mail] SMTP_PASS is not set — confirmations go to /outbox");
    return null;
  }
  try {
    const nodemailer = require("nodemailer");
    mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } catch (err) {
    console.error("[mail] nodemailer unavailable:", err.message);
    mailer = null;
  }
  return mailer;
}

async function sendConfirmation(rsvp) {
  const message = {
    from: process.env.MAIL_FROM || `${site.couple.display} <${site.contacts[0].email}>`,
    to: rsvp.email,
    replyTo: site.contacts.map((c) => c.email),
    subject: buildSubject(rsvp),
    text: buildText(rsvp),
    html: buildHtml(rsvp),
  };

  const transport = getMailer();
  if (!transport) {
    const base = path.join(OUTBOX_DIR, `${rsvp.id}-${rsvp.attending}`);
    fs.writeFileSync(`${base}.html`, message.html);
    fs.writeFileSync(`${base}.txt`, `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    console.log(`[mail] SMTP not configured — confirmation written to ${base}.html`);
    return { sent: true, mode: "outbox" };
  }

  try {
    await transport.sendMail(message);
    return { sent: true, mode: "smtp" };
  } catch (err) {
    console.error("[mail] send failed:", err.message);
    const base = path.join(OUTBOX_DIR, `FAILED-${rsvp.id}`);
    fs.writeFileSync(`${base}.html`, message.html);
    fs.writeFileSync(`${base}.txt`, `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    return { sent: false, mode: "failed", error: err.message };
  }
}

/* --------------------------------------------------------------- rate limit */

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 20;
}

/* ------------------------------------------------------------------- app */

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "32kb" }));

const noCache = { setHeaders: (res) => res.setHeader("Cache-Control", "no-cache") };

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use("/shared", express.static(path.join(ROOT, "shared"), noCache));
app.use("/assets", express.static(path.join(ROOT, "assets"), { maxAge: "7d" }));
app.use("/site", express.static(path.join(ROOT, "site"), noCache));

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "site", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, dateISO: site.dateISO, date: site.dateDisplay, smtp: Boolean(getMailer()) });
});

app.post("/api/rsvp", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many submissions. Please try again in a few minutes." });
  }

  if (site.rsvp.closesISO && Date.now() > new Date(site.rsvp.closesISO).getTime()) {
    return res.status(403).json({
      error: `Online RSVPs closed on ${site.rsvp.deadlineDisplay}. Please email us directly if you still need to reply.`,
    });
  }

  const body = req.body || {};
  const fullName = String(body.fullName || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 200);
  const attending = body.attending === "no" ? "no" : "yes";
  const dietary = String(body.dietary || "").trim().slice(0, 500);
  const note = String(body.note || "").trim().slice(0, 1000);
  let guests = Number.parseInt(body.guests, 10);

  if (!fullName) return res.status(400).json({ error: "Please include your name." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please include a valid email address." });
  if (attending === "no") {
    guests = 0;
  } else if (!Number.isFinite(guests) || guests < 1) {
    guests = 1;
  }
  if (guests > MAX_GUESTS) guests = MAX_GUESTS;

  const rows = readAll();
  const key = email.toLowerCase();
  const now = new Date().toISOString();
  const existing = rows.find((r) => r.email.toLowerCase() === key);

  let record;
  if (existing) {
    existing.fullName = fullName;
    existing.attending = attending;
    existing.guests = guests;
    existing.dietary = dietary;
    existing.note = note;
    existing.updatedAt = now;
    record = existing;
  } else {
    record = {
      id: crypto.randomBytes(6).toString("hex"),
      createdAt: now,
      updatedAt: now,
      fullName,
      email,
      attending,
      guests,
      dietary,
      note,
    };
    rows.push(record);
  }
  writeAll(rows);

  const delivery = await sendConfirmation(record);
  if (delivery.mode !== "outbox") {
    record.emailStatus = delivery.sent ? "sent" : "failed";
    record.emailMode = delivery.mode;
    writeAll(rows);
  }

  res.json({
    ok: true,
    emailSent: delivery.sent,
    deliveryMode: delivery.mode,
    rsvp: {
      fullName: record.fullName,
      email: record.email,
      attending: record.attending,
      guests: record.guests,
    },
  });
});

/* ----------------------------------------------------------------- admin */

function requireAdmin(req, res, next) {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).type("text/plain").send("Unauthorized. Append ?key=YOUR_ADMIN_KEY");
  }
  next();
}

app.get("/admin", requireAdmin, (req, res) => {
  const rows = readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const yes = rows.filter((r) => r.attending === "yes");
  const seats = yes.reduce((sum, r) => sum + (r.guests || 1), 0);
  const esc = (v) =>
    String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const tableRows = rows
    .map(
      (r) => `<tr>
      <td>${esc(r.fullName)}</td>
      <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
      <td><span class="pill ${r.attending}">${r.attending === "yes" ? "Attending" : "Declined"}</span></td>
      <td>${r.attending === "yes" ? r.guests : "—"}</td>
      <td>${esc(r.dietary)}</td>
      <td>${esc(r.note)}</td>
      <td class="muted">${esc(r.createdAt.slice(0, 16).replace("T", " "))}</td>
    </tr>`
    )
    .join("");

  res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RSVPs — ${esc(site.couple.display)}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; padding:2rem 1.25rem 4rem; background:#faf6ef; color:#1a2821; font:15px/1.6 "Helvetica Neue",Arial,sans-serif; }
  .wrap { max-width:1100px; margin:0 auto; }
  h1 { font-family:Georgia,serif; font-weight:400; font-size:2rem; margin:0 0 .25rem; }
  .sub { color:#6d7568; font-size:.85rem; letter-spacing:.12em; text-transform:uppercase; margin-bottom:2rem; }
  .stats { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem; }
  .stat { background:#fffdf8; border:1px solid #e2d9c9; padding:1rem 1.4rem; min-width:130px; }
  .stat b { display:block; font-family:Georgia,serif; font-size:1.8rem; font-weight:400; }
  .stat span { font-size:.65rem; letter-spacing:.2em; text-transform:uppercase; color:#b27e49; }
  table { width:100%; border-collapse:collapse; background:#fffdf8; border:1px solid #e2d9c9; font-size:.9rem; }
  th { text-align:left; font-size:.62rem; letter-spacing:.18em; text-transform:uppercase; color:#6d7568; padding:.85rem .8rem; border-bottom:1px solid #e2d9c9; background:#f6efe4; }
  td { padding:.8rem; border-bottom:1px solid #efe7da; vertical-align:top; }
  tr:last-child td { border-bottom:0; }
  .pill { display:inline-block; padding:.2rem .55rem; font-size:.62rem; letter-spacing:.12em; text-transform:uppercase; border:1px solid; }
  .pill.yes { color:#28604c; border-color:#28604c; background:#eaf2ee; }
  .pill.no { color:#a0061b; border-color:#a0061b; background:#f8e9eb; }
  .muted { color:#6d7568; white-space:nowrap; font-size:.8rem; }
  .bar { display:flex; justify-content:space-between; align-items:end; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem; }
  a { color:#28604c; }
  .banner { background:#efe2cd; border-left:3px solid #b27e49; padding:.9rem 1.1rem; font-size:.85rem; margin-bottom:1.5rem; }
  .empty { padding:3rem; text-align:center; color:#6d7568; background:#fffdf8; border:1px solid #e2d9c9; }
  @media (max-width:700px) { th:nth-child(5), td:nth-child(5), th:nth-child(6), td:nth-child(6) { display:none; } }
</style></head>
<body><div class="wrap">
  <div class="bar">
    <div><h1>RSVPs</h1><div class="sub">${esc(site.couple.display)} · ${esc(site.dateDisplay)}</div></div>
    <div><a href="/admin/export.csv?key=${encodeURIComponent(req.query.key)}">Download CSV</a></div>
  </div>
  ${getMailer() ? "" : '<div class="banner">Email is not configured yet — confirmations are being written to <code>/outbox</code> instead of sent. Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM to go live.</div>'}
  <div class="stats">
    <div class="stat"><span>Replies</span><b>${rows.length}</b></div>
    <div class="stat"><span>Attending</span><b>${yes.length}</b></div>
    <div class="stat"><span>Declined</span><b>${rows.length - yes.length}</b></div>
    <div class="stat"><span>Total seats</span><b>${seats}</b></div>
  </div>
  ${rows.length ? `<table><thead><tr><th>Name</th><th>Email</th><th>Reply</th><th>Seats</th><th>Dietary</th><th>Note</th><th>Received</th></tr></thead><tbody>${tableRows}</tbody></table>` : '<div class="empty">No replies yet.</div>'}
</div></body></html>`);
});

app.get("/admin/outbox/:file", requireAdmin, (req, res) => {
  const name = path.basename(String(req.params.file));
  const file = path.join(OUTBOX_DIR, name);
  if (!file.startsWith(OUTBOX_DIR) || !fs.existsSync(file)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  res.type(path.extname(file) === ".txt" ? "text/plain" : "html").sendFile(file);
});

app.get("/admin/export.csv", requireAdmin, (req, res) => {
  const rows = readAll();
  const header = ["name", "email", "attending", "guests", "dietary", "note", "received"];
  const cell = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [r.fullName, r.email, r.attending, r.guests, r.dietary, r.note, r.createdAt].map(cell).join(",")
    ),
  ].join("\n");
  res.type("text/csv").attachment(`rsvps-${new Date().toISOString().slice(0, 10)}.csv`).send(csv);
});

app.use((req, res) => {
  res.status(404).type("text/plain").send("Not found");
});

app.listen(PORT, () => {
  console.log(`\n  ${site.couple.display} — wedding site`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  RSVP admin: http://localhost:${PORT}/admin?key=${ADMIN_KEY}`);
  console.log(`  Email: ${getMailer() ? "SMTP configured" : "not configured (writing to /outbox)"}\n`);
});
