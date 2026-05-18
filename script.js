// ===== helpers =====
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => [...c.querySelectorAll(s)];
const urlSafe = (p) => encodeURI(p).replace(/'/g, "%27");

// ===== Rail: sticky media that swaps with scroll =====
(function initRail() {
  const stage = $("#phStage");
  const capTitle = $("#capTitle");
  if (!stage) return;

  // Collect all anchors with a [data-img]
  const anchors = $$("[data-img]");
  if (!anchors.length) return;

  // Build unique image layers
  const seen = new Map(); // src -> element
  anchors.forEach(a => {
    const src = a.dataset.img;
    if (!seen.has(src)) {
      const ph = document.createElement("div");
      ph.className = "ph";
      ph.dataset.src = src;
      ph.style.backgroundImage = `url("${urlSafe(src)}")`;
      stage.appendChild(ph);
      // preload
      const im = new Image();
      im.src = urlSafe(src);
      seen.set(src, ph);
    }
  });

  // Show the first image immediately
  const first = stage.firstElementChild;
  if (first) first.classList.add("is-on");

  // Friendly titles per section / anchor — used in the floating caption
  const titleFor = (el) => {
    // Prefer explicit data-title; else nearest H2/H3/H4 text
    if (el.dataset.title) return el.dataset.title;
    const id = el.id;
    const map = {
      "s-hero": "Tarihi Kaydedin",
      "s-schedule": "Plan",
      "s-info": "Mini Rehber",
      "s-memories": "Anılarımız",
      "s-rsvp": "Katılım Durumu",
      "s-foot": "Çağla & Can Arda"
    };
    if (map[id]) return map[id];
    const h = el.querySelector(".ev-title, .m-h, h2, h3, h4");
    return h ? h.textContent.trim().replace(/\s+/g, " ") : "";
  };

  let activeSrc = first?.dataset?.src || null;
  const setActive = (src, title) => {
    if (src === activeSrc) return;
    activeSrc = src;
    $$(".ph", stage).forEach(ph => {
      ph.classList.toggle("is-on", ph.dataset.src === src);
    });
    if (capTitle && title) capTitle.textContent = title;
  };

  // Mark which anchors are "leaf" (contain no nested anchors).
  // Leaf anchors win over parent anchors when both are in view.
  const isLeaf = (el) => !el.querySelector("[data-img]");
  anchors.forEach(a => { a.dataset._leaf = isLeaf(a) ? "1" : "0"; });

  const pickBest = () => {
    const vh = window.innerHeight;
    const mid = vh / 2;
    let leafBest = null, leafDist = Infinity;
    let anyBest  = null, anyDist  = Infinity;
    anchors.forEach(a => {
      const r = a.getBoundingClientRect();
      if (r.bottom < 80 || r.top > vh - 80) return;
      const center = (r.top + r.bottom) / 2;
      const dist = Math.abs(center - mid);
      if (a.dataset._leaf === "1" && dist < leafDist) { leafDist = dist; leafBest = a; }
      if (dist < anyDist) { anyDist = dist; anyBest = a; }
    });
    return leafBest || anyBest;
  };

  const recompute = () => {
    const best = pickBest();
    if (best) setActive(best.dataset.img, titleFor(best));
  };

  const io = new IntersectionObserver(recompute, {
    root: null,
    rootMargin: "-30% 0px -30% 0px",
    threshold: [0, 0.25, 0.5, 0.75, 1]
  });
  anchors.forEach(a => io.observe(a));

  // Also recompute on scroll/resize as a safety net (IO can be coarse during fast scroll)
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; recompute(); });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  recompute();

  // Also drive progress bar
  const prog = $("#railProgress");
  const updateProg = () => {
    if (!prog) return;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const p = Math.min(1, Math.max(0, window.scrollY / total));
    // top fixed at 6% of viewport, height grows with p
    const minH = 6, maxH = 80;
    prog.style.setProperty("--p-top", `${6 + (p * 2)}%`);
    prog.style.setProperty("--p-h",   `${minH + (maxH - minH) * p}%`);
  };
  updateProg();
  window.addEventListener("scroll", updateProg, { passive: true });
  window.addEventListener("resize", updateProg);
})();

// ===== Polaroid lightbox =====
(function initLightbox() {
  const polaroids = $$(".polaroid");
  if (!polaroids.length) return;
  const srcs = polaroids.map(p => p.dataset.img);

  // Build markup once
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.id = "lightbox";
  lb.hidden = true;
  lb.innerHTML = `
    <button class="lb-x" type="button" aria-label="Kapat">×</button>
    <button class="lb-prev" type="button" aria-label="Önceki">‹</button>
    <img class="lightbox-img" alt="" />
    <button class="lb-next" type="button" aria-label="Sonraki">›</button>
  `;
  document.body.appendChild(lb);

  const imgEl = lb.querySelector(".lightbox-img");
  let i = 0;
  const open = (idx) => {
    i = idx;
    imgEl.src = urlSafe(srcs[i]);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    lb.hidden = true;
    document.body.style.overflow = "";
  };
  const step = (dir) => {
    i = (i + dir + srcs.length) % srcs.length;
    imgEl.src = urlSafe(srcs[i]);
  };
  polaroids.forEach((p, idx) => p.addEventListener("click", (e) => { e.preventDefault(); open(idx); }));
  lb.querySelector(".lb-x").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", () => step(-1));
  lb.querySelector(".lb-next").addEventListener("click", () => step(1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  window.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft")  step(-1);
  });
})();

// ===== Menu pill (no longer changes color, but keeps mobile drawer) =====
function toggleMenu() {
  const d = $("#drawer");
  if (!d) return;
  d.hidden = !d.hidden;
  document.body.style.overflow = d.hidden ? "" : "hidden";
}
window.toggleMenu = toggleMenu;
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const d = $("#drawer");
    if (d && !d.hidden) { d.hidden = true; document.body.style.overflow = ""; }
  }
});

// ===== Bottom ribbon: show after the hero =====
(function initRibbon() {
  const ribbon = $(".ribbon");
  const hero = $("#s-hero");
  if (!ribbon || !hero) return;
  const onScroll = () => {
    const past = window.scrollY > hero.offsetHeight - 120;
    ribbon.classList.toggle("show", past);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();

// ===== Countdown =====
(function initCountdown() {
  const target = new Date("2026-06-27T19:30:00+03:00").getTime();
  const cd = $("#countdown");
  if (!cd) return;
  const els = {
    d: cd.querySelector('[data-k="d"]'),
    h: cd.querySelector('[data-k="h"]'),
    m: cd.querySelector('[data-k="m"]'),
    s: cd.querySelector('[data-k="s"]')
  };
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    let diff = target - Date.now();
    if (diff <= 0) {
      els.d.textContent = "00"; els.h.textContent = "00";
      els.m.textContent = "00"; els.s.textContent = "00";
      return;
    }
    const d = Math.floor(diff / 86400000); diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
    const m = Math.floor(diff / 60000);    diff -= m * 60000;
    const s = Math.floor(diff / 1000);
    els.d.textContent = d;
    els.h.textContent = pad(h);
    els.m.textContent = pad(m);
    els.s.textContent = pad(s);
  };
  tick();
  setInterval(tick, 1000);
})();

// ===== RSVP form =====
(function initRsvp() {
  const form = $("#rsvpForm");
  if (!form) return;
  const note = $("#formNote");
  const afterField = $("#afterPartyField");

  // If the guest says they can't make it to the wedding, hide the after-party
  // question entirely (it doesn't make sense to ask).
  const syncAfterParty = () => {
    const v = form.querySelector('input[name="attending"]:checked')?.value;
    if (!afterField) return;
    if (v === "no") {
      afterField.classList.add("is-disabled");
      afterField.setAttribute("aria-hidden", "true");
      afterField.querySelectorAll('input[name="afterparty"]').forEach((i) => {
        i.checked = false;
        i.disabled = true;
      });
    } else {
      afterField.classList.remove("is-disabled");
      afterField.removeAttribute("aria-hidden");
      afterField.querySelectorAll('input[name="afterparty"]').forEach((i) => {
        i.disabled = false;
      });
    }
  };
  form.querySelectorAll('input[name="attending"]').forEach((i) =>
    i.addEventListener("change", syncAfterParty)
  );
  syncAfterParty();

  // When the guest count goes above 1, render a name input per extra guest.
  // Preserve typed values across re-renders.
  const countInput  = $("#r-count");
  const namesField  = $("#guestNamesField");
  const namesInputs = $("#guestInputs");
  const syncGuestNames = () => {
    if (!countInput || !namesField || !namesInputs) return;
    const attending = form.querySelector('input[name="attending"]:checked')?.value;
    const raw = parseInt(countInput.value, 10);
    const n = Math.max(1, Math.min(6, isFinite(raw) ? raw : 1));
    const extra = (attending === "no") ? 0 : n - 1;

    // Capture current values keyed by input name so they survive re-render.
    const prev = {};
    namesInputs.querySelectorAll("input").forEach((inp) => { prev[inp.name] = inp.value; });

    if (extra <= 0) {
      namesField.hidden = true;
      namesInputs.innerHTML = "";
      return;
    }
    namesField.hidden = false;
    namesInputs.innerHTML = "";
    for (let i = 2; i <= extra + 1; i++) {
      const row = document.createElement("div");
      row.className = "guest-row";
      const id = `r-g${i}`;
      const nm = `guest${i}`;
      row.innerHTML =
        `<label for="${id}">${i}. misafir</label>` +
        `<input id="${id}" name="${nm}" type="text" placeholder="Ad Soyad" autocomplete="off" />`;
      const inp = row.querySelector("input");
      if (prev[nm]) inp.value = prev[nm];
      namesInputs.appendChild(row);
    }
  };
  countInput?.addEventListener("input", syncGuestNames);
  countInput?.addEventListener("change", syncGuestNames);
  form.querySelectorAll('input[name="attending"]').forEach((i) =>
    i.addEventListener("change", syncGuestNames)
  );
  syncGuestNames();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const action = form.getAttribute("action") || "";
    const isPlaceholder = action.includes("your-form-id");

    try {
      const all = JSON.parse(localStorage.getItem("rsvp-replies") || "[]");
      all.push({ ...data, ts: new Date().toISOString() });
      localStorage.setItem("rsvp-replies", JSON.stringify(all));
    } catch (e) {}

    if (isPlaceholder) {
      const subject = `RSVP — ${data.name || "Misafir"}`;
      const lines = [
        `Ad Soyad: ${data.name || ""}`,
        `E-posta: ${data.email || ""}`,
        `Geliyor mu: ${data.attending || ""}`,
        `Kişi sayısı: ${data.guests || ""}`,
      ];
      // Collect additional guest names (guest2, guest3, …) if any
      const extraNames = Object.keys(data)
        .filter((k) => /^guest\d+$/.test(k) && data[k])
        .sort()
        .map((k) => `  - ${data[k]}`);
      if (extraNames.length) {
        lines.push("Diğer misafirler:", ...extraNames);
      }
      if (data.attending !== "no") {
        lines.push(`After party: ${data.afterparty || ""}`);
      }
      lines.push("", "Mesaj:", `${data.message || ""}`);
      const body = lines.join("\n");
      window.location.href =
        `mailto:canardaaydin@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showNote("Teşekkürler! E-posta uygulamanız açıldı, lütfen göndermeyi onaylayın. 💌", "ok");
      return;
    }

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      });
      if (res.ok) {
        showNote("Cevabın bize ulaştı. Sabırsızlanıyoruz! 🎉", "ok");
        form.reset();
      } else throw new Error("Bad status " + res.status);
    } catch (err) {
      showNote("Gönderilemedi, lütfen tekrar dene veya 0530 243 53 03'ten yaz. 🙏", "err");
    }
  });

  function showNote(text, kind) {
    if (!note) return;
    note.textContent = text;
    note.className = "form-note " + (kind || "");
    note.hidden = false;
    note.scrollIntoView({ behavior: "smooth", block: "center" });
  }
})();
