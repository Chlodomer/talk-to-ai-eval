(() => {
  "use strict";
  const E = window.EVAL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const KEY = "tta-eval-v1";

  /* ---------------- מצב ---------------- */
  const fresh = () => ({
    step: 1, doc: "d1", read: ["d1"], briefed: false,
    items: [], uid: 1,
    criteria: [{ c: "", why: "", check: "" }, { c: "", why: "", check: "" }, { c: "", why: "", check: "" }],
    refl: {}, name: "", sid: ""
  });
  let S = fresh();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 200); };

  const docById = id => E.docs.find(d => d.id === id);
  const blockById = id => E.blocks.find(b => b[0] === id);
  const roleLabel = id => (E.roles.find(r => r.id === id) || {}).label || "";

  /* ---------------- אייקונים ---------------- */
  const IC = {
    mail: '<path d="M3 6h18v12H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    notes: '<path d="M6 3h12v18H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    policy: '<path d="M7 3h7l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 3v4h4M10 12h5M10 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    archive: '<path d="M4 5h16v4H4zM5 9h14v10H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 13h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    grip: '<g fill="currentColor"><circle cx="4" cy="4" r="1.8"/><circle cx="10" cy="4" r="1.8"/><circle cx="4" cy="10" r="1.8"/><circle cx="10" cy="10" r="1.8"/><circle cx="4" cy="16" r="1.8"/><circle cx="10" cy="16" r="1.8"/></g>'
  };
  const svg = (k, vb = "0 0 24 24") => `<svg viewBox="${vb}" aria-hidden="true">${IC[k]}</svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------------- כותרת ותדריך ---------------- */
  $("#appTitle").textContent = E.title;
  $("#appSub").textContent = E.subtitle;
  $("#briefH").textContent = E.briefing.heading;
  $("#briefLead").textContent = E.briefing.lead;
  $("#briefTwist").textContent = E.briefing.twist;
  $("#briefNote").textContent = E.briefing.note;
  $("#briefSteps").innerHTML = E.briefing.steps.map(s => `<li>${esc(s)}</li>`).join("");
  const openBrief = () => { $("#brief").hidden = false; $("#closeBrief").focus(); };
  $("#openBrief").onclick = openBrief;
  $("#closeBrief").onclick = () => { $("#brief").hidden = true; const first = !S.briefed; S.briefed = true; save(); if (first) startTour(); };
  $("#briefTour").onclick = () => { $("#brief").hidden = true; S.briefed = true; save(); startTour(); };
  if (!S.briefed) openBrief();

  let toastT;
  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1800); };

  /* ---------------- סיור במסך ---------------- */
  const TOUR = [
    ["#docTabs", "תיק העבודה", "כאן שלושה מסמכים: מייל מהמרצה, מייל ממזכירות החוג והסילבוס. פתחו את כולם. נקודה כתומה מסמנת מסמך שעוד לא נפתח."],
    ["#reader", "סמנו טקסט", "סמנו בעכבר משפט או כמה משפטים. יופיע כפתור ״הוסיפו לפרומפט״: לחצו עליו, או גררו אותו אל הפרומפט."],
    ["#composer", "הפרומפט שלכם", "כאן נבנה הפרומפט. לכל רכיב בוחרים תפקיד, ואפשר לגרור רכיבים בידית כדי לשנות את הסדר."],
    ["#addOwn", "משפטים משלכם", "כתבו משפטים שמחברים בין הקטעים ומשלימים את מה שחסר. אפשר גם להוסיף משפט בין שני רכיבים."],
    [".bank", "מאגר אבני הבניין", "לחצו על אבן או גררו אותה. לא כל אבן כאן טובה: בחרו רק את מה שבאמת משפר את הפרומפט."],
    ["#steps", "ארבעה שלבים", "אחרי הפרומפט מגדירים איך נראית הצלחה, עונים על שאלות הסיכום, ומורידים קובץ TXT להגשה."],
    ["#openBrief", "תמיד אפשר לחזור", "התדריך והסיור זמינים כאן בכל רגע. בהצלחה!"]
  ];
  let tourI = 0, tourSteps = [];
  function startTour() {
    goStep(1);
    if (matchMedia("(max-width:860px)").matches) setPane("desk");
    tourSteps = TOUR.filter(([sel]) => { const el = $(sel); return el && el.getClientRects().length; });
    tourI = 0; $("#tour").hidden = false; showTour();
  }
  function showTour() {
    const [sel, h, p] = tourSteps[tourI];
    const el = $(sel);
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const r = el.getBoundingClientRect(), pad = 8;
    const hole = $("#tourHole");
    Object.assign(hole.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: Math.min(r.height, innerHeight - 40) + pad * 2 + "px" });
    $("#tourN").textContent = `${tourI + 1} מתוך ${tourSteps.length}`;
    $("#tourH").textContent = h; $("#tourP").textContent = p;
    $("#tourPrev").hidden = tourI === 0;
    $("#tourNext").textContent = tourI === tourSteps.length - 1 ? "סיום" : "הבא";
    const card = $("#tourCard"), cw = Math.min(380, innerWidth - 32), ch = card.offsetHeight || 220;
    let x = r.left + r.width / 2 - cw / 2, y = r.bottom + pad + 14;
    if (y + ch > innerHeight - 12) y = r.top - pad - 14 - ch;
    if (y < 12) { y = Math.max(12, innerHeight / 2 - ch / 2); x = r.right + 20 + cw < innerWidth ? r.right + 20 : r.left - cw - 20; }
    x = Math.max(16, Math.min(innerWidth - cw - 16, x));
    Object.assign(card.style, { left: x + "px", top: y + "px", width: cw + "px" });
    $("#tourNext").focus();
  }
  const endTour = () => { $("#tour").hidden = true; };
  $("#tourNext").onclick = () => { if (tourI < tourSteps.length - 1) { tourI++; showTour(); } else endTour(); };
  $("#tourPrev").onclick = () => { if (tourI > 0) { tourI--; showTour(); } };
  $("#tourSkip").onclick = endTour;
  addEventListener("resize", () => { if (!$("#tour").hidden) showTour(); });

  /* ---------------- תיק העבודה ---------------- */
  function renderTabs() {
    $("#docTabs").innerHTML = E.docs.map(d =>
      `<button class="doc-tab ${d.id === S.doc ? "on" : ""} ${S.read.includes(d.id) ? "read" : ""}" role="tab" data-doc="${d.id}">
        <span class="dot"></span>${svg(d.icon)}${esc(d.tab)}</button>`).join("");
  }
  const segs = arr => arr.map(([id, t]) => `<span class="seg" data-id="${id}">${esc(t)}</span>`).join("");
  const paras = ps => ps.map(p => `<p>${segs(p)}</p>`).join("");
  const metaHtml = m => `<dl class="meta">${m.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="${k === "נושא" ? "subject" : ""}">${esc(v)}</dd>`).join("")}</dl>`;

  const TB = {
    reply: '<path d="M10 7L4 12l6 5M4 12h10a6 6 0 016 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    fwd: '<path d="M14 7l6 5-6 5M20 12H10a6 6 0 00-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    arch: '<path d="M4 5h16v4H4zM5 9h14v10H5zM10 13h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    clip: '<path d="M16 7l-7 7a2 2 0 003 3l7-7a4 4 0 00-6-6l-7 7a6 6 0 008 8l6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'
  };
  const tb = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${TB[k]}</svg>`;
  const fileIc = t => `<span class="fic fic-${t}">${{ docx: "DOC", pdf: "PDF", eml: "EML" }[t]}</span>`;

  function mailShell(d, inner) {
    const f = d.from;
    return `<article class="doc mail" data-doc="${d.id}">
      <div class="mail-tools"><span class="crumb">${esc(d.folder)}</span><span class="tbtns">${tb("reply")}${tb("fwd")}${tb("arch")}${tb("trash")}</span></div>
      <h2 class="mail-subj">${esc(d.subject)}</h2>
      <div class="mail-from"><div class="av" style="background:${f.color}">${esc(f.initials)}</div>
        <div class="who"><div><b>${esc(f.name)}</b> <bdi class="addr" dir="ltr">${esc(f.addr)}</bdi>${f.note ? ` <span class="tag">${esc(f.note)}</span>` : ""}</div>
        <div class="to">אל: ${esc(d.to)}</div></div>
        <div class="when">${esc(d.date)}<span class="st">${tb("star")}</span></div></div>
      <div class="mail-body">${inner}</div>
      ${d.attachments ? `<div class="atts"><div class="atts-h">${tb("clip")} ${d.attachments.length === 1 ? "קובץ מצורף אחד" : d.attachments.length + " קבצים מצורפים"}</div><div class="atts-g">${d.attachments.map(([t, n, sz]) => `<div class="att">${fileIc(t)}<div><div class="an">${esc(n)}</div><div class="as">${sz}</div></div></div>`).join("")}</div></div>` : ""}
    </article>`;
  }

  function renderDoc() {
    const d = docById(S.doc);
    let h = "";
    if (d.kind === "email") {
      h = mailShell(d, paras(d.body)
        + (d.list ? `<ul class="fb">${d.list.map(([id, t]) => `<li>${segs([[id, t]])}</li>`).join("")}</ul>` : "")
        + (d.after ? paras(d.after) : "")
        + (d.example ? `<div class="fwd-body"><p class="qs">${esc(d.example.head)}</p>${paras(d.example.paras)}</div>` : "")
        + `<div class="sig">--<br>${d.signature.map(esc).join("<br>")}</div>`);
    } else if (d.kind === "notes") {
      const meta = d.meta.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
      h = `<article class="doc docx" data-doc="${d.id}">
        <div class="app-bar"><span class="fic fic-docx">DOC</span><b>${esc(d.file)}</b><span class="saved">נשמר בענן</span></div>
        <div class="ribbon"><span class="rb">Assistant</span><span class="rb">12</span><span class="sep"></span><span class="rb b">B</span><span class="rb i">I</span><span class="rb u">U</span><span class="sep"></span><span class="rb">≡</span><span class="rb">☰</span><span class="sep"></span><span class="rb">כותרת 1</span></div>
        <div class="canvas"><div class="page"><h3>${esc(d.heading)}</h3><table class="mt">${meta}</table>
        ${d.sections.map(s => `<h4>${esc(s.title)}</h4><ul>${s.paras.map(p => `<li>${segs(p)}</li>`).join("")}</ul>`).join("")}
        <div class="pg-foot">עמוד 1 מתוך 1</div></div></div></article>`;
    } else if (d.kind === "policy") {
      h = `<article class="doc pdf" data-doc="${d.id}">
        <div class="pdf-bar"><span class="fic fic-pdf">PDF</span><span class="fn">${esc(d.file)}</span><span class="pg">${d.page} / ${d.pages}</span><span class="zm">− 100% +</span></div>
        <div class="canvas"><div class="page"><div class="pdf-head"><span>${esc(d.org)}</span><span>${esc(d.docno)}</span></div>
        <span class="stamp">${esc(d.stamp || "נוסח מאושר")}</span><h3>${esc(d.heading)}</h3><div class="sub">${esc(d.subheading)}</div>${paras(d.paras)}
        <div class="pg-foot">עמוד ${d.page} מתוך ${d.pages}</div></div></div></article>`;
    } else if (d.kind === "chat") {
      h = `<article class="doc phone-wrap" data-doc="${d.id}"><div class="phone">
        <div class="status"><span>16:12</span><span class="sb"><i></i><i></i><i></i><b></b></span></div>
        <div class="ph-head"><span class="back">›</span><div class="avatar">אש</div><div><div class="nm">${esc(d.heading)}</div><div class="sub2">רכז סדנאות · מחובר/ת</div></div></div>
        <div class="ph-body"><div class="chat-day">${esc(d.when)}</div>
          ${d.mine.map(m => `<div class="msg mine">${esc(m.text)}<span class="t">${m.time} ✓✓</span></div>`).join("")}
          ${d.bubbles.map(b => `<div class="msg">${segs(b.spans)}<span class="t">${b.time}</span></div>`).join("")}</div>
        <div class="ph-input"><span>הודעה</span><i></i></div></div></article>`;
    }
    $("#reader").innerHTML = h;
    $("#reader").scrollTop = 0;
    markUsed();
  }
  function markUsed() {
    const used = new Set(S.items.filter(i => i.type === "excerpt").flatMap(i => i.ids));
    $$("#reader .seg").forEach(s => s.classList.toggle("used", used.has(s.dataset.id)));
  }
  $("#docTabs").addEventListener("click", e => {
    const b = e.target.closest(".doc-tab"); if (!b) return;
    S.doc = b.dataset.doc; if (!S.read.includes(S.doc)) S.read.push(S.doc);
    save(); renderTabs(); renderDoc(); hidePill();
  });

  /* ---------------- סימון טקסט ---------------- */
  let pending = null;   // הקטע המסומן כרגע
  let drag = null;      // מה שנגרר כרגע
  const pill = $("#selPill");
  const hidePill = () => { pill.hidden = true; pending = null; };

  function readSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const art = $("#reader .doc");
    if (!art || !art.contains(range.commonAncestorContainer)) return null;
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 2) return null;
    const ids = $$(".seg", art).filter(s => range.intersectsNode(s)).map(s => s.dataset.id);
    if (!ids.length) return null;
    return { type: "excerpt", doc: art.dataset.doc, ids, text, rect: range.getBoundingClientRect() };
  }
  function showPill() {
    const p = readSelection();
    if (!p) { hidePill(); return; }
    pending = p;
    pill.hidden = false;
    const w = pill.offsetWidth, h = pill.offsetHeight;
    let x = p.rect.left + p.rect.width / 2 - w / 2;
    let y = p.rect.top - h - 10;
    if (y < 80) y = p.rect.bottom + 10;
    x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
    pill.style.left = x + "px"; pill.style.top = y + "px";
  }
  const reader = $("#reader");
  reader.addEventListener("mouseup", () => setTimeout(showPill, 0));
  reader.addEventListener("touchend", () => setTimeout(showPill, 250));
  reader.addEventListener("keyup", () => setTimeout(showPill, 0));
  reader.addEventListener("scroll", hidePill);
  document.addEventListener("mousedown", e => { if (e.target !== pill && !reader.contains(e.target)) hidePill(); });
  pill.addEventListener("click", () => {
    if (!pending) return;
    addItem({ type: "excerpt", doc: pending.doc, ids: pending.ids, text: pending.text });
    window.getSelection().removeAllRanges(); hidePill();
  });
  pill.addEventListener("dragstart", e => {
    if (!pending) return;
    drag = { type: "excerpt", doc: pending.doc, ids: pending.ids, text: pending.text };
    e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", pending.text);
  });
  // גרירה ישירה של טקסט מסומן מתוך המסמך
  reader.addEventListener("dragstart", e => {
    const p = readSelection();
    if (!p) return;
    drag = { type: "excerpt", doc: p.doc, ids: p.ids, text: p.text };
    e.dataTransfer.effectAllowed = "copy";
    pill.hidden = true;
  });
  document.addEventListener("dragend", () => { drag = null; clearTargets(); $("#composer").classList.remove("over"); $$(".item.dragging").forEach(x => x.classList.remove("dragging")); });

  /* ---------------- מאגר אבני בניין ---------------- */
  function renderBank() {
    const used = new Set(S.items.filter(i => i.type === "block").map(i => i.block));
    $("#bank").innerHTML = E.blocks.map(([id, t]) =>
      `<button class="chip ${used.has(id) ? "used" : ""}" draggable="${!used.has(id)}" data-block="${id}" ${used.has(id) ? 'aria-disabled="true" title="כבר בפרומפט"' : ""}>${esc(t)}</button>`).join("");
  }
  $("#bank").addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c || c.classList.contains("used")) return;
    addItem({ type: "block", block: c.dataset.block, text: blockById(c.dataset.block)[1] });
  });
  $("#bank").addEventListener("dragstart", e => {
    const c = e.target.closest(".chip"); if (!c || c.classList.contains("used")) { e.preventDefault(); return; }
    drag = { type: "block", block: c.dataset.block, text: blockById(c.dataset.block)[1] };
    e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", drag.text);
  });

  /* ---------------- הפרומפט ---------------- */
  const composer = $("#composer");
  function addItem(obj, at) {
    const it = Object.assign({ uid: S.uid++, role: "" }, obj);
    if (at == null || at > S.items.length) at = S.items.length;
    S.items.splice(at, 0, it);
    save(); renderComposer(); renderBank(); markUsed();
    if (matchMedia("(max-width:860px)").matches && obj.type !== "own") toast("נוסף לפרומפט");
    return it;
  }
  function srcLabel(it) {
    if (it.type === "excerpt") return `<span class="src">מתוך: ${esc(docById(it.doc).tab)}</span>`;
    if (it.type === "block") return `<span class="src block">אבן בניין</span>`;
    return `<span class="src own">ניסוח שלכם</span>`;
  }
  function roleSelect(it) {
    return `<select class="role ${it.role ? "" : "unset"}" data-uid="${it.uid}" aria-label="תפקיד הרכיב">
      <option value="">בחרו תפקיד…</option>${E.roles.map(r => `<option value="${r.id}" ${r.id === it.role ? "selected" : ""}>${r.label}</option>`).join("")}</select>`;
  }
  const gap = i => `<div class="gap" data-gap="${i}"><span class="drop-line"></span><button data-ins="${i}" title="הוסיפו כאן משפט משלכם">＋ משפט</button></div>`;
  function renderComposer() {
    if (!S.items.length) {
      composer.innerHTML = `<div class="empty"><strong>הפרומפט עדיין ריק</strong>סמנו קטע באחד המסמכים וגררו אותו לכאן, גררו אבן בניין מהמאגר, או התחילו במשפט משלכם.</div>`;
    } else {
      composer.innerHTML = S.items.map((it, i) => gap(i) + `
        <div class="item r-${it.role || "none"}" data-uid="${it.uid}">
          <button class="handle" draggable="true" data-uid="${it.uid}" aria-label="גררו לשינוי הסדר">${svg("grip", "0 0 14 20")}</button>
          <div>
            <div class="item-top">${srcLabel(it)}${roleSelect(it)}
              <div class="tools">
                <button data-act="up" title="למעלה">${svg("up")}</button>
                <button data-act="down" title="למטה">${svg("down")}</button>
                <button data-act="del" title="הסרה">${svg("x")}</button>
              </div>
            </div>
            ${it.type === "own"
              ? `<textarea class="own-text" rows="1" data-uid="${it.uid}" placeholder="כתבו כאן משפט משלכם: חיבור בין החלקים, הסבר, או מידע שחסר…">${esc(it.text || "")}</textarea>`
              : `<p class="quote ${it.type}">${esc(it.text)}</p>`}
          </div>
        </div>`).join("") + gap(S.items.length);
      $$(".own-text", composer).forEach(grow);
    }
    updateCount(); updateStepMarks();
  }
  function grow(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
  function updateCount() {
    const n = promptText().split(/\s+/).filter(Boolean).length;
    $("#wordCount").textContent = `${n} מילים`;
  }
  const itemByUid = uid => S.items.find(i => i.uid === +uid);

  composer.addEventListener("change", e => {
    if (!e.target.classList.contains("role")) return;
    const it = itemByUid(e.target.dataset.uid); it.role = e.target.value;
    const box = e.target.closest(".item"); box.className = `item r-${it.role || "none"}`;
    e.target.classList.toggle("unset", !it.role); save(); updateStepMarks();
  });
  composer.addEventListener("input", e => {
    if (!e.target.classList.contains("own-text")) return;
    itemByUid(e.target.dataset.uid).text = e.target.value; grow(e.target); save(); updateCount();
  });
  composer.addEventListener("click", e => {
    const ins = e.target.closest("[data-ins]");
    if (ins) { const it = addItem({ type: "own", text: "" }, +ins.dataset.ins); focusOwn(it.uid); return; }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const uid = +b.closest(".item").dataset.uid;
    const i = S.items.findIndex(x => x.uid === uid);
    if (b.dataset.act === "del") S.items.splice(i, 1);
    if (b.dataset.act === "up" && i > 0) S.items.splice(i - 1, 0, S.items.splice(i, 1)[0]);
    if (b.dataset.act === "down" && i < S.items.length - 1) S.items.splice(i + 1, 0, S.items.splice(i, 1)[0]);
    save(); renderComposer(); renderBank(); markUsed();
  });
  const focusOwn = uid => { const t = $(`.own-text[data-uid="${uid}"]`); if (t) { t.focus(); t.scrollIntoView({ block: "center", behavior: "smooth" }); } };
  $("#addOwn").onclick = () => { const it = addItem({ type: "own", text: "" }); focusOwn(it.uid); };

  // גרירה לתוך הפרומפט ובתוכו
  composer.addEventListener("dragstart", e => {
    const h = e.target.closest(".handle"); if (!h) return;
    drag = { type: "move", uid: +h.dataset.uid };
    const box = h.closest(".item"); box.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "move");
    try { e.dataTransfer.setDragImage(box, 30, 20); } catch (_) {}
  });
  function clearTargets() { $$(".gap.target", composer).forEach(g => g.classList.remove("target")); }
  function dropIndex(y) {
    const items = $$(".item", composer);
    for (let i = 0; i < items.length; i++) { const r = items[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return i; }
    return items.length;
  }
  composer.addEventListener("dragover", e => {
    if (!drag) return;
    e.preventDefault(); e.dataTransfer.dropEffect = drag.type === "move" ? "move" : "copy";
    composer.classList.add("over"); clearTargets();
    const g = $(`.gap[data-gap="${dropIndex(e.clientY)}"]`, composer); if (g) g.classList.add("target");
  });
  composer.addEventListener("dragleave", e => { if (!composer.contains(e.relatedTarget)) { composer.classList.remove("over"); clearTargets(); } });
  composer.addEventListener("drop", e => {
    if (!drag) return;
    e.preventDefault();
    let at = dropIndex(e.clientY);
    if (drag.type === "move") {
      const from = S.items.findIndex(x => x.uid === drag.uid);
      const [it] = S.items.splice(from, 1);
      if (from < at) at--;
      S.items.splice(at, 0, it); save(); renderComposer();
    } else {
      const { type, doc, ids, text, block } = drag;
      addItem(type === "block" ? { type, block, text } : { type, doc, ids, text }, at);
      window.getSelection().removeAllRanges(); hidePill();
    }
    drag = null; composer.classList.remove("over"); clearTargets();
  });

  /* ---------------- הצלחה ---------------- */
  function renderCriteria() {
    $("#criteria").innerHTML = S.criteria.map((c, i) => `
      <div class="crit" data-i="${i}">
        <div class="n">${i + 1}</div>
        <div><label>הקריטריון</label><textarea rows="2" data-f="c" placeholder="למשל: משהו שאפשר לבדוק בטיוטה, לא ״שיהיה טוב״">${esc(c.c)}</textarea></div>
        <button class="del" data-del="${i}" title="הסרה">${svg("x")}</button>
        <div><label>למה הוא חשוב?</label><textarea rows="1" data-f="why">${esc(c.why)}</textarea></div>
        <div><label>איך אבדוק אותו בטיוטה?</label><textarea rows="1" data-f="check">${esc(c.check)}</textarea></div>
      </div>`).join("");
  }
  $("#criteria").addEventListener("input", e => {
    const f = e.target.dataset.f; if (!f) return;
    S.criteria[+e.target.closest(".crit").dataset.i][f] = e.target.value; save(); updateStepMarks();
  });
  $("#criteria").addEventListener("click", e => {
    const d = e.target.closest("[data-del]"); if (!d) return;
    S.criteria.splice(+d.dataset.del, 1);
    if (!S.criteria.length) S.criteria.push({ c: "", why: "", check: "" });
    save(); renderCriteria();
  });
  $("#addCrit").onclick = () => {
    if (S.criteria.length >= 8) { toast("אפשר עד שמונה קריטריונים"); return; }
    S.criteria.push({ c: "", why: "", check: "" }); save(); renderCriteria();
    $$("#criteria .crit:last-child textarea")[0].focus();
  };

  /* ---------------- סיכום ---------------- */
  $("#reflections").innerHTML = E.reflections.map(([id, q], i) => `
    <div class="reflect"><h3>${i + 1}. ${esc(q)}</h3><textarea data-r="${id}" aria-label="${esc(q)}">${esc(S.refl[id] || "")}</textarea></div>`).join("");
  $("#reflections").addEventListener("input", e => { const r = e.target.dataset.r; if (!r) return; S.refl[r] = e.target.value; save(); updateStepMarks(); });

  /* ---------------- שלבים ---------------- */
  function goStep(n, user) {
    S.step = n; save();
    $$("#steps button").forEach(b => b.classList.toggle("on", +b.dataset.step === n));
    $$(".panel").forEach(p => p.hidden = +p.dataset.panel !== n);
    $("#desk").scrollTop = 0;
    if (n === 4) renderSubmit();
    if (user && matchMedia("(max-width:860px)").matches) setPane("desk");
  }
  function updateStepMarks() {
    const done = {
      1: S.items.length > 0 && S.items.every(i => i.role),
      2: S.criteria.some(c => c.c.trim()),
      3: E.reflections.every(([id]) => (S.refl[id] || "").trim())
    };
    $$("#steps button").forEach(b => b.classList.toggle("done", !!done[b.dataset.step]));
  }
  $("#steps").addEventListener("click", e => { const b = e.target.closest("button"); if (b) goStep(+b.dataset.step, true); });

  // מסך צר: מעבר בין תיק העבודה לשולחן העבודה
  function setPane(p) {
    $("#layout").classList.toggle("show-case", p === "case");
    $("#layout").classList.toggle("show-desk", p === "desk");
    $$("#mobileSwitch button").forEach(b => b.classList.toggle("on", b.dataset.pane === p));
  }
  $("#mobileSwitch").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setPane(b.dataset.pane); });
  setPane("case");

  /* ---------------- הגשה ---------------- */
  $("#sName").value = S.name; $("#sId").value = S.sid;
  $("#sName").addEventListener("input", e => { S.name = e.target.value; save(); renderSubmit(); });
  $("#sId").addEventListener("input", e => { S.sid = e.target.value; save(); renderSubmit(); });

  const promptText = () => S.items.map(i => (i.text || "").trim()).filter(Boolean).join("\n");
  const pad2 = n => String(n).padStart(2, "0");
  const RULE = "────────────────────────";

  function buildTxt() {
    const now = new Date();
    const stamp = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()}, ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const L = [];
    const sec = t => { L.push("", RULE, t, RULE); };
    L.push(`${E.title}: משימת הערכה`);
    L.push(`שם: ${S.name.trim() || "—"}`);
    L.push(`מספר סטודנט: ${S.sid.trim() || "—"}`);
    L.push(`הופק: ${stamp}`);

    sec("חלק א · הפרומפט המלא");
    L.push(promptText() || "(ריק)");

    sec("חלק ב · רכיבי הפרומפט ותפקידם");
    if (!S.items.length) L.push("(אין רכיבים)");
    S.items.forEach((it, i) => {
      const role = it.role ? roleLabel(it.role) : "ללא תפקיד";
      let src = "ניסוח עצמי";
      if (it.type === "excerpt") src = `קטע מתוך: ${docById(it.doc).tab} (${it.ids.join(", ")})`;
      if (it.type === "block") src = `אבן בניין ${it.block}`;
      L.push(`${i + 1}. [${role}] · ${src}`);
      L.push(`   ${(it.text || "").trim() || "(ריק)"}`);
    });

    sec("חלק ג · איך נראית הצלחה");
    const crits = S.criteria.filter(c => c.c.trim() || c.why.trim() || c.check.trim());
    if (!crits.length) L.push("(לא הוגדרו קריטריונים)");
    crits.forEach((c, i) => {
      L.push(`קריטריון ${i + 1}: ${c.c.trim() || "—"}`);
      L.push(`   למה: ${c.why.trim() || "—"}`);
      L.push(`   איך אבדוק: ${c.check.trim() || "—"}`);
    });

    sec("חלק ד · סיכום");
    E.reflections.forEach(([id, q], i) => {
      L.push(`${i + 1}. ${q}`);
      L.push(`   ${(S.refl[id] || "").trim() || "—"}`);
      L.push("");
    });

    sec("נתונים לבודק");
    const ex = S.items.filter(i => i.type === "excerpt"), bl = S.items.filter(i => i.type === "block"), ow = S.items.filter(i => i.type === "own");
    L.push(`רכיבים: ${S.items.length} (קטעים מהמסמכים: ${ex.length}, אבני בניין: ${bl.length}, ניסוח עצמי: ${ow.length})`);
    L.push(`מקטעים שנבחרו: ${[...new Set(ex.flatMap(i => i.ids))].join(", ") || "—"}`);
    L.push(`אבני בניין: ${bl.map(i => i.block).join(", ") || "—"}`);
    L.push(`מסמכים שנפתחו: ${S.read.join(", ")}`);
    L.push(`מילים בפרומפט: ${promptText().split(/\s+/).filter(Boolean).length}`);
    return L.join("\n");
  }

  function renderSubmit() {
    const checks = [
      [S.name.trim() && S.sid.trim(), "שם ומספר סטודנט"],
      [S.items.length > 0, `רכיבים בפרומפט: ${S.items.length}`],
      [S.items.length > 0 && S.items.every(i => i.role), "לכל רכיב נבחר תפקיד"],
      [S.items.some(i => i.type === "own" && (i.text || "").trim()), "יש בפרומפט ניסוח משלכם"],
      [S.criteria.some(c => c.c.trim()), "הוגדרו קריטריונים להצלחה"],
      [E.reflections.every(([id]) => (S.refl[id] || "").trim()), "נענו כל שאלות הסיכום"],
      [S.read.length === E.docs.length, `נפתחו ${S.read.length} מתוך ${E.docs.length} מסמכים`]
    ];
    $("#checklist").innerHTML = checks.map(([ok, t]) => `<li><span class="${ok ? "ok" : "no"}">${ok ? "✓" : "!"}</span>${esc(t)}</li>`).join("");
    $("#preview").textContent = buildTxt();
  }

  $("#download").onclick = () => {
    if (!S.name.trim() || !S.sid.trim()) { toast("נא למלא שם ומספר סטודנט"); (S.name.trim() ? $("#sId") : $("#sName")).focus(); return; }
    const txt = "﻿" + buildTxt().replace(/\n/g, "\r\n");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prompt-eval_${S.sid.trim().replace(/[^\w-]/g, "") || "student"}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("הקובץ ירד. עכשיו מעלים אותו למערכת הקורס.");
  };

  $("#resetAll").onclick = () => { $("#confirm").hidden = false; };
  $("#confirmNo").onclick = () => { $("#confirm").hidden = true; };
  $("#confirmYes").onclick = () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = fresh(); S.briefed = true; save();
    $("#confirm").hidden = true; $("#sName").value = ""; $("#sId").value = "";
    $$("#reflections textarea").forEach(t => t.value = "");
    renderAll(); goStep(1); toast("העבודה נמחקה");
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#tour").hidden) { endTour(); return; } if (!$("#brief").hidden) $("#closeBrief").click(); $("#confirm").hidden = true; hidePill(); } });

  function renderAll() { renderTabs(); renderDoc(); renderBank(); renderComposer(); renderCriteria(); }
  renderAll(); goStep(S.step);
})();
