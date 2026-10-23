# Wendy & Kayden — wedding site

The final Ballroom design, with a working RSVP system that emails each guest a
confirmation with directions and parking.

## Run it

```bash
npm install
npm start            # http://localhost:4173
```

The RSVP desk is at `/admin?key=…` — the key comes from `ADMIN_KEY`, or is
printed on startup if you do not set one.

## Layout

```
site/
  index.html       the page
  styles.css       Ballroom-specific styles
shared/
  site.config.js   every fact: date, venue/parking, schedule, party, gifts, contacts, RSVP
  base.css         palette tokens, type scale, shared components
  app.js           nav, scroll reveal, RSVP submit, deadline handling
server/
  server.js        static hosting, POST /api/rsvp, /admin, CSV export
  email.js         confirmation email (HTML + plain text)
  site-data.js     loads site.config.js server-side so the two never drift
  data/rsvps.json  the RSVP database (created at runtime)
assets/
  photos/          the couple's portrait
  venmo-qr.jpg
drafts/            the two designs that were not chosen (not served)
```

## Changing things

The date, deadline, parking copy, guest limit and contact emails all live in
`shared/site.config.js`. Replies stop being accepted at `rsvp.closesISO`
(midnight after the deadline); the page shows an "RSVP closed" notice instead
of the form from that moment on.

## Email

Without SMTP configured, confirmations are written to `outbox/` as `.html` and
`.txt` so you can review them — nothing is sent, and the admin page says so.
Fill in `.env` (see `.env.example`) to send for real. A Gmail App Password is
the simplest route for a personal address.

## Deploying

`Dockerfile` and `render.yaml` are set up for Render. The app is one Node
process plus one JSON file, so any small host works. Requirements:

1. A persistent disk mounted at `/app/server/data` — otherwise RSVPs reset on
   deploy.
2. `ADMIN_KEY` set to a long random value.
3. SMTP variables set so confirmations actually send.
4. HTTPS on the custom domain (hosts provide this automatically).

`render.yaml` creates the service, generates `ADMIN_KEY`, and mounts the 1 GB
disk. The health check is `/api/health`.

## Notes

- Guest count is capped at 6 per reply, and children count toward it.
- A reply is de-duplicated by email: submitting again updates the first one.
- The form and the API both enforce the deadline, so a stale page cannot slip
  a reply in after November 30.
