(() => {
  /* ---------- Hero horizontal gallery ---------- */
  const hero = document.querySelector(".hero");
  const gallery = document.getElementById("gallery");

  if (gallery) {
    // Three copies for a true infinite loop: user always stays in the middle copy.
    const originals = [...gallery.children];
    for (let c = 0; c < 2; c++) {
      originals.forEach((el) => {
        const clone = el.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        gallery.appendChild(clone);
      });
    }

    let loopWidth = 0;
    const computeLoopWidth = () => {
      let w = 0;
      for (let i = 0; i < originals.length; i++) {
        w += gallery.children[i].offsetWidth;
      }
      const gap = parseFloat(getComputedStyle(gallery).gap) || 0;
      w += gap * originals.length;
      if (w === loopWidth) return;
      loopWidth = w;
      // Start in the middle copy so both directions have a full set as buffer.
      gallery.scrollLeft = loopWidth;
    };

    computeLoopWidth();
    [...gallery.querySelectorAll("img")].forEach((img) => {
      if (img.complete && img.naturalWidth) return;
      img.addEventListener("load", computeLoopWidth, { once: true });
      img.addEventListener("error", computeLoopWidth, { once: true });
    });
    window.addEventListener("resize", computeLoopWidth);

    /* ---- Auto-advance ---- */
    const speed = 0.35; // px per frame ≈ 21 px/s
    let pointerHeld = false;
    let wheelTimer = null;
    let tabHidden = false;

    const isPaused = () => pointerHeld || wheelTimer !== null || tabHidden;

    const markInteracted = () => {
      if (hero && !hero.classList.contains("has-interacted")) {
        hero.classList.add("has-interacted");
      }
    };

    const normalize = () => {
      if (!loopWidth) return;
      // Keep scrollLeft in [loopWidth, 2*loopWidth) — always the middle copy.
      if (gallery.scrollLeft >= loopWidth * 2) {
        gallery.scrollLeft -= loopWidth;
      } else if (gallery.scrollLeft < loopWidth) {
        gallery.scrollLeft += loopWidth;
      }
    };

    let scrollAccum = 0;
    const tick = () => {
      if (!isPaused() && loopWidth) {
        scrollAccum += speed;
        if (scrollAccum >= 1) {
          const step = Math.floor(scrollAccum);
          gallery.scrollLeft += step;
          scrollAccum -= step;
          normalize();
        }
      }
      requestAnimationFrame(tick);
    };
    tick();

    /* ---- Wheel: capture on whole hero, translate any scroll → horizontal ---- */
    hero.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        gallery.scrollLeft += delta;
        normalize();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          wheelTimer = null;
        }, 250);
        markInteracted();
      },
      { passive: false }
    );

    /* ---- Drag to scroll — auto-scroll pauses only while pointer is held ---- */
    let isDown = false;
    let startX = 0;
    let lastX = 0;
    let moved = false;

    gallery.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      isDown = true;
      pointerHeld = true;
      moved = false;
      startX = e.clientX;
      lastX = e.clientX;
      gallery.classList.add("is-grabbing");
      markInteracted();
      if (e.pointerType === "mouse") {
        gallery.setPointerCapture(e.pointerId);
      }
    });

    gallery.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (Math.abs(e.clientX - startX) > 3) moved = true;
      gallery.scrollLeft -= dx;
      normalize();
    });

    const endDrag = (e) => {
      if (!isDown) return;
      isDown = false;
      pointerHeld = false;
      gallery.classList.remove("is-grabbing");
      if (e && e.pointerId !== undefined && gallery.hasPointerCapture?.(e.pointerId)) {
        gallery.releasePointerCapture(e.pointerId);
      }
    };
    gallery.addEventListener("pointerup", endDrag);
    gallery.addEventListener("pointercancel", endDrag);
    gallery.addEventListener("pointerleave", endDrag);

    /* ---- Touch: pause while finger is down, block vertical page scroll ---- */
    hero.addEventListener(
      "touchstart",
      () => {
        pointerHeld = true;
        markInteracted();
      },
      { passive: true }
    );
    hero.addEventListener(
      "touchmove",
      (e) => { e.preventDefault(); },
      { passive: false }
    );
    const touchEnd = () => {
      pointerHeld = false;
    };
    hero.addEventListener("touchend", touchEnd, { passive: true });
    hero.addEventListener("touchcancel", touchEnd, { passive: true });
    gallery.addEventListener(
      "scroll",
      () => {
        normalize();
      },
      { passive: true }
    );

    /* ---- Smooth scroll (custom, works around browser quirks) ---- */
    let smoothRaf = null;
    const easeInOut = (t) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const smoothScrollBy = (delta, duration = 620) => {
      if (smoothRaf) cancelAnimationFrame(smoothRaf);
      const start = gallery.scrollLeft;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        gallery.scrollLeft = start + delta * easeInOut(p);
        if (p < 1) smoothRaf = requestAnimationFrame(step);
        else smoothRaf = null;
      };
      smoothRaf = requestAnimationFrame(step);
    };

    const stepAmt = () => Math.max(gallery.clientWidth * 0.72, 400);

    /* ---- Keyboard ---- */
    window.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") {
        markInteracted();
        smoothScrollBy(stepAmt() * 0.5);
      } else if (e.key === "ArrowLeft") {
        markInteracted();
        smoothScrollBy(-stepAmt() * 0.5);
      }
    });

    /* ---- Prevent accidental link activation after drag ---- */
    gallery.addEventListener("click", (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    /* ---- Pause when tab hidden ---- */
    document.addEventListener("visibilitychange", () => {
      tabHidden = document.hidden;
    });
  }

  /* ---------- Footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Contact form (mailto) ---------- */
  const form = document.querySelector(".contact-form");
  if (form) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        status.textContent = "Please complete the required fields.";
        form.reportValidity();
        return;
      }
      const d = new FormData(form);
      const subject = `Quote request — ${d.get("name")}`;
      const body =
        `Name: ${d.get("name")}\n` +
        `Email: ${d.get("email")}\n` +
        `Phone: ${d.get("phone") || "—"}\n` +
        `Project type: ${d.get("type")}\n` +
        `Planned date: ${d.get("date") || "—"}\n\n` +
        `${d.get("message")}`;
      const href = `mailto:illenyi.keve@gmail.com?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
      status.textContent = "Opening your email client — send the message to finish.";
    });
  }
})();
