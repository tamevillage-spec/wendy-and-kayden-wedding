/* ============================================================
   Single source of truth for every date-sensitive / factual value.
   Change it here once and all three templates update.
   ============================================================ */

window.WEDDING = {
  couple: {
    one: "Wendy",
    two: "Kayden",
    display: "Wendy & Kayden",
    monogram: "W & K",
  },

  // Ceremony is at 1:00 PM Mountain Standard Time on Saturday, December 12, 2026.
  dateISO: "2026-12-12T13:00:00-07:00",
  dateDisplay: "December 12, 2026",
  yearDisplay: "2026",

  venue: {
    name: "Chief Hosa Lodge",
    city: "Golden, Colorado",
    mapQuery: "Chief Hosa Lodge, Golden, CO",
    parkingNote:
      "Parking is available on site at Chief Hosa Lodge — follow the signs to the lot when you arrive. If you need accessible parking, email us and we will arrange it for you.",
  },

  schedule: [
    { time: "12:00 PM", title: "Guest Arrival", note: "Please arrive around noon so everyone is settled before the ceremony." },
    { time: "1:00 PM", title: "Ceremony", note: "The ceremony begins promptly at one o'clock." },
    { time: "Following", title: "Reception", note: "Dinner, drinks, and dancing in the same location." },
    { time: "4:30 PM", title: "Farewell", note: "The celebration concludes and everyone departs by 4:30 PM." },
  ],

  dressCode: {
    title: "Christmas Party Attire",
    note: "Festive holiday dress: deep greens, rich reds, a little sparkle if you like.",
  },

  // The bride and a bridesmaid share a first name — the role is what
  // tells them apart on the page.
  party: {
    bridal: [
      { name: "Wendy", role: "Bride" },
      { name: "Wendy", role: "Bridesmaid" },
      { name: "Ashlyn", role: "Bridesmaid" },
      { name: "Sam", role: "Bridesmaid" },
      { name: "Payton", role: "Bridesmaid" },
      { name: "Lucy", role: "Bridesmaid" },
    ],
    groomsmen: [
      { name: "Alex", role: "Groomsman" },
      { name: "Simon", role: "Groomsman" },
      { name: "Aaron", role: "Groomsman" },
      { name: "Bronsyn", role: "Groomsman" },
    ],
  },

  gifts: {
    headline: "Your presence is the greatest gift.",
    body:
      "We are not registering for traditional gifts. If you would like to give something, we are collecting through Venmo — scan the code below — or cash at the reception.",
    qrImage: "/assets/venmo-qr.jpg",
    venmoLabel: "Scan to give on Venmo",
  },

  contacts: [
    { name: "Wendy", email: "wendymarie2727@gmail.com" },
    { name: "Kayden", email: "Kaydenjacklin@gmail.com" },
  ],

  rsvp: {
    deadlineDisplay: "November 30, 2026",
    // Replies close at midnight Mountain Time after the deadline.
    closesISO: "2026-12-01T00:00:00-07:00",
    maxGuests: 6,
  },

  childrenNote: "Children are welcome — please include them in your guest count when you reply.",

  maps: {
    google: "https://www.google.com/maps/search/?api=1&query=Chief%20Hosa%20Lodge%2C%20Golden%2C%20CO",
    apple: "https://maps.apple.com/?q=Chief%20Hosa%20Lodge%2C%20Golden%2C%20CO",
  },
};
