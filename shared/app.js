/* ============================================================
   Shared behaviour: config hydration, nav, reveal, countdown, RSVP
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.WEDDING || {};
  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* ---------- date + countdown ---------- */

  function hydrateDate() {
    var label = cfg.dateDisplay || "Date To Be Announced";
    $$("[data-date-display]").forEach(function (el) {
      el.textContent = label;
    });
    $$("[data-venue-name]").forEach(function (el) {
      el.textContent = (cfg.venue && cfg.venue.name) || "";
    });
    $$("[data-venue-city]").forEach(function (el) {
      el.textContent = (cfg.venue && cfg.venue.city) || "";
    });
    if (cfg.yearDisplay) {
      $$("[data-year]").forEach(function (el) {
        el.textContent = cfg.yearDisplay;
      });
    }
    var deadline = cfg.rsvp && cfg.rsvp.deadlineDisplay;
    $$("[data-rsvp-deadline]").forEach(function (el) {
      if (deadline) {
        el.textContent = deadline;
      } else {
        var host = el.closest("p, .hero__reply");
        (host || el).hidden = true;
      }
    });
  }

  function startCountdown() {
    var host = $("[data-countdown]");
    if (!host || !cfg.dateISO) return;
    var target = new Date(cfg.dateISO).getTime();
    if (isNaN(target)) return;

    var units = [
      ["days", 86400000],
      ["hrs", 3600000],
      ["min", 60000],
      ["sec", 1000],
    ];
    var boxes = {};
    units.forEach(function (u) {
      var el = document.createElement("div");
      el.className = "countdown__unit";
      var num = document.createElement("div");
      num.className = "countdown__num";
      num.textContent = "00";
      var lab = document.createElement("span");
      lab.className = "countdown__label";
      lab.textContent = u[0];
      el.appendChild(num);
      el.appendChild(lab);
      host.appendChild(el);
      boxes[u[0]] = num;
    });

    host.hidden = false;
    var wrap = host.closest("[data-countdown-wrap]");
    if (wrap) wrap.hidden = false;

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        host.hidden = true;
        clearInterval(timer);
        return;
      }
      var remaining = diff;
      units.forEach(function (u) {
        var value = Math.floor(remaining / u[1]);
        boxes[u[0]].textContent = value < 10 ? "0" + value : String(value);
        remaining -= value * u[1];
      });
    }

    tick();
    var timer = setInterval(tick, 1000);
  }

  /* ---------- navigation ---------- */

  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;

    function onScroll() {
      nav.classList.toggle("is-stuck", window.scrollY > 48);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $("[data-nav-toggle]", nav);
    var links = $(".nav-links", nav);
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$("a", links).forEach(function (a) {
        a.addEventListener("click", function () {
          links.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ---------- reveal ---------- */

  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- RSVP ---------- */

  function initRsvp() {
    var form = $("[data-rsvp]");
    if (!form) return;

    var closes = cfg.rsvp && cfg.rsvp.closesISO;
    if (closes && Date.now() > new Date(closes).getTime()) {
      form.hidden = true;
      var closed = $("[data-rsvp-closed]");
      if (closed) closed.hidden = false;
      return;
    }

    var guestFields = $("[data-guest-fields]", form);
    var guestSelect = form.querySelector("[name='guests']");
    var attendingInputs = $$("[name='attending']", form);
    var status = $("[data-rsvp-status]", form);
    var success = $("[data-rsvp-success]");
    var submit = form.querySelector("[type='submit']");

    if (guestSelect) {
      var max = (cfg.rsvp && cfg.rsvp.maxGuests) || 6;
      var current = guestSelect.options.length;
      for (var i = current + 1; i <= max; i++) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = i + " guests";
        guestSelect.appendChild(opt);
      }
    }

    function syncGuestFields() {
      var picked = form.querySelector("[name='attending']:checked");
      if (!guestFields) return;
      var going = !picked || picked.value === "yes";
      guestFields.hidden = !going;
    }

    attendingInputs.forEach(function (input) {
      input.addEventListener("change", syncGuestFields);
    });
    syncGuestFields();

    function setStatus(message, isError) {
      if (!status) return;
      status.hidden = !message;
      status.textContent = message || "";
      status.classList.toggle("form-status--error", !!isError);
    }

    function fillSuccess(data) {
      if (!success) return;
      setStatus("");
      var nameEl = $("[data-success-name]", success);
      if (nameEl) nameEl.textContent = data.fullName || "Friend";
      var emailEl = $("[data-success-email]", success);
      if (emailEl) emailEl.textContent = data.email || "";
      if (data.attending === "no") {
        var lead = $("[data-success-lead]", success);
        if (lead) {
          lead.textContent = "Thank you for letting us know — we will miss you. If your plans change, just reply to our email.";
        }
        var actions = $(".success-actions", success);
        if (actions) actions.hidden = true;
      }
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setStatus("");

      var fd = new FormData(form);
      var payload = {
        fullName: String(fd.get("fullName") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        attending: fd.get("attending") === "no" ? "no" : "yes",
        guests: Number(fd.get("guests") || 1),
        dietary: String(fd.get("dietary") || "").trim(),
        note: String(fd.get("note") || "").trim(),
      };

      if (!payload.fullName) {
        setStatus("Please tell us your name.", true);
        form.querySelector("[name='fullName']").focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        setStatus("Please enter a valid email address so we can send your confirmation.", true);
        form.querySelector("[name='email']").focus();
        return;
      }
      if (payload.attending === "no") {
        payload.guests = 0;
      } else if (!payload.guests || payload.guests < 1) {
        payload.guests = 1;
      }

      if (submit) {
        submit.disabled = true;
        submit.dataset.label = submit.textContent;
        submit.textContent = "Sending…";
      }
      setStatus("Sending your RSVP…");

      fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          var type = res.headers.get("content-type") || "";
          if (type.indexOf("application/json") === -1) {
            return {
              ok: false,
              body: { error: "We could not reach the RSVP service. Please try again, or email us directly." },
            };
          }
          return res.json().then(function (body) {
            return { ok: res.ok, body: body };
          });
        })
        .then(function (result) {
          if (!result.ok) throw new Error(result.body && result.body.error ? result.body.error : "Something went wrong.");
          fillSuccess(result.body.rsvp || payload);
          if (result.body.emailSent === false) {
            setStatus("Your RSVP is saved. We could not send the confirmation email just now — we will follow up by hand.", true);
          }
        })
        .catch(function (err) {
          setStatus(err.message || "We could not send that just now. Please try again.", true);
        })
        .finally(function () {
          if (submit && !form.hidden) {
            submit.disabled = false;
            if (submit.dataset.label) submit.textContent = submit.dataset.label;
          }
        });
    });
  }

  /* ---------- boot ---------- */

  function boot() {
    hydrateDate();
    initNav();
    initReveal();
    startCountdown();
    initRsvp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
