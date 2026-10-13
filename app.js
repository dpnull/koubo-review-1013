/* Static review page: three transcripts aligned on the CapCut timeline. Data: window.COMPARE (data.js). */
(function () {
  "use strict";
  var D = window.COMPARE;
  var KEY = "koubo-review-" + D.review_id;
  var V = D.versions;
  var EX = D.excerpt;
  var $ = function (id) { return document.getElementById(id); };
  var video = $("video"), audio = $("audio");

  var state = load();
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    s = s || {};
    s.marks = s.marks || {}; s.vnotes = s.vnotes || {};
    s.view = s.view || "excerpt";
    return s;
  }
  function save() {
    state.updated = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function fmt(t) {
    t = Math.max(0, t); var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var lineById = {};
  V.forEach(function (v) { v.lines.forEach(function (l) { l.v = v.key; lineById[l.id] = l; }); });

  function inView(t) { return state.view === "full" || (t >= EX.start && t < EX.end); }
  function media() { return state.view === "full" ? audio : video; }
  function mediaToTl(t) { return state.view === "full" ? t : t + EX.start; }
  function tlToMedia(t) { return state.view === "full" ? t : t - EX.start; }

  /* ---------- render ---------- */
  function renderHead() {
    var showEng = $("showEngine").checked;
    $("gridHead").innerHTML = V.filter(function (v) { return !v.pending; }).map(function (v) {
      return "<div>" + v.label + (showEng ? '<span class="eng">' + esc(v.engine) + "</span>" : "") + "</div>";
    }).join("");
  }

  function renderStats() {
    var showEng = $("showEngine").checked;
    $("stats").innerHTML = V.map(function (v) {
      if (v.pending) return '<div class="stat"><h3>' + v.label + (showEng ? '<span class="eng">' + esc(v.engine) + "</span>" : "") + '</h3><div class="note">尚未导入</div></div>';
      var st = state.view === "full" ? v.stats_full : v.stats_excerpt;
      var bad = 0, ok = 0;
      v.lines.forEach(function (l) { if (!inView(l.start)) return; var m = state.marks[l.id]; if (m === "bad") bad++; else if (m === "ok") ok++; });
      var f = st.fillers, fl = Object.keys(f).filter(function (k) { return f[k]; }).map(function (k) { return k + f[k]; }).join(" ");
      return '<div class="stat"><h3>' + v.label + (showEng ? '<span class="eng">' + esc(v.engine) + "</span>" : "") + "</h3><dl>" +
        "<dt>字数</dt><dd>" + st.chars + "</dd><dt>句数</dt><dd>" + st.lines + "</dd>" +
        "<dt>语气词</dt><dd>" + st.filler_total + (fl ? ' <span class="fill">(' + fl + ")</span>" : "") + "</dd>" +
        "<dt>已标 ✗/✓</dt><dd>" + bad + " / " + ok + "</dd></dl></div>";
    }).join("");
  }

  function lineHtml(l) {
    var m = state.marks[l.id] || "";
    var en = l.en ? "<small>" + esc(l.en) + "</small>" : "";
    return '<div class="ln' + (m ? " m-" + m : "") + '" id="' + l.id + '" data-t="' + l.start + '">' +
      '<div class="t">' + esc(l.text) + en + "</div>" +
      '<div class="mk"><button class="ok' + (m === "ok" ? " on" : "") + '" data-mark="ok" aria-label="没问题">✓</button>' +
      '<button class="bad' + (m === "bad" ? " on" : "") + '" data-mark="bad" aria-label="有错">✗</button></div></div>';
  }

  function renderRows() {
    var byRow = {};
    V.forEach(function (v, vi) {
      v.lines.forEach(function (l) { (byRow[l.row] = byRow[l.row] || [[], [], []])[vi].push(l); });
    });
    var html = [];
    D.rows.forEach(function (r, ri) {
      if (!inView(r.start) && !(state.view === "excerpt" && r.start < EX.start && r.end > EX.start + 1)) return;
      var cells = byRow[ri] || [[], [], []];
      if (!cells[0].length && !cells[1].length && !cells[2].length) return;
      html.push('<div class="row"><div class="row-time" data-t="' + r.start + '">' + fmt(r.start) + '</div><div class="row-cells">' +
        V.map(function (v, vi) {
          if (v.pending) return "";
          return '<div class="cell">' + (cells[vi].length ? cells[vi].map(lineHtml).join("") : '<div class="empty">（无）</div>') + "</div>";
        }).join("") + "</div></div>");
    });
    if (V.some(function (v) { return v.pending; })) {
      html.unshift('<div class="pending">版本三（剪映自带字幕）还在生成中，稍后会补上，可以先比较版本一和版本二。</div>');
    }
    $("rows").innerHTML = html.join("");
    nowIds = [];
  }

  function renderFinal() {
    $("pick").innerHTML = V.map(function (v) {
      var on = state.pick === v.key;
      return '<label class="' + (on ? "on" : "") + '"><input type="radio" name="pick" value="' + v.key + '"' + (on ? " checked" : "") + (v.pending ? " disabled" : "") + "> " + v.label + "</label>";
    }).join("");
    $("vcomments").innerHTML = V.map(function (v) {
      return '<label class="block">' + v.label + " 的问题（可选）<input data-vnote=\"" + v.key + '" value="' + esc(state.vnotes[v.key] || "") + '"' + (v.pending ? " disabled" : "") + "></label>";
    }).join("");
    $("comment").value = state.comment || "";
    $("reviewer").value = state.reviewer || "";
  }

  function renderAll() {
    $("viewExcerpt").classList.toggle("on", state.view === "excerpt");
    $("viewFull").classList.toggle("on", state.view === "full");
    video.hidden = state.view === "full";
    audio.hidden = state.view !== "full";
    if (state.view === "full") { video.pause(); if (!audio.src) audio.src = D.media.full_audio; }
    else { audio.pause(); }
    document.body.classList.toggle("en", $("showEn").checked);
    document.documentElement.style.setProperty("--cols", V.filter(function (v) { return !v.pending; }).length);
    renderHead(); renderStats(); renderRows();
    var ph = $("player").offsetHeight; $("gridHead").style.top = ph + "px";
  }

  /* ---------- playback ---------- */
  function seekTl(t) {
    var m = media();
    if (state.view === "full" && !audio.src) audio.src = D.media.full_audio;
    var target = Math.max(0, tlToMedia(t) - 0.15);
    var go = function () { try { m.currentTime = target; } catch (e) {} var p = m.play(); if (p && p.catch) p.catch(function () {}); };
    if (m.readyState >= 1) go(); else { m.addEventListener("loadedmetadata", go, { once: true }); m.load(); }
  }

  var nowIds = [];
  function onTime() {
    var m = media();
    var t = mediaToTl(m.currentTime);
    $("clock").textContent = fmt(t);
    var ids = [];
    V.forEach(function (v) {
      var cur = null;
      for (var i = 0; i < v.lines.length; i++) {
        var l = v.lines[i];
        if (l.start <= t + 0.05) { if (t < l.end + 0.6) cur = l; } else break;
      }
      if (cur) ids.push(cur.id);
    });
    if (ids.join() === nowIds.join()) return;
    nowIds.forEach(function (id) { var e = $(id); if (e) e.classList.remove("now"); });
    ids.forEach(function (id) { var e = $(id); if (e) e.classList.add("now"); });
    nowIds = ids;
    if ($("follow").checked && !m.paused && ids.length) {
      var e = $(ids[0]); if (e) {
        var r = e.getBoundingClientRect(), top = $("player").offsetHeight + $("gridHead").offsetHeight;
        if (r.top < top || r.bottom > window.innerHeight - 40) window.scrollBy({ top: r.top - top - 60, behavior: "smooth" });
      }
    }
  }
  video.addEventListener("timeupdate", onTime);
  audio.addEventListener("timeupdate", onTime);

  /* ---------- events ---------- */
  $("rows").addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-mark]");
    if (b) {
      var ln = b.closest(".ln"), id = ln.id, mk = b.getAttribute("data-mark");
      if (state.marks[id] === mk) delete state.marks[id]; else state.marks[id] = mk;
      save();
      ln.classList.remove("m-ok", "m-bad"); if (state.marks[id]) ln.classList.add("m-" + state.marks[id]);
      ln.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-mark") === state.marks[id]); });
      renderStats();
      return;
    }
    var t = ev.target.closest("[data-t]");
    if (t) seekTl(parseFloat(t.getAttribute("data-t")));
  });
  $("viewExcerpt").onclick = function () { state.view = "excerpt"; save(); renderAll(); };
  $("viewFull").onclick = function () { state.view = "full"; save(); renderAll(); };
  $("showEngine").onchange = function () { state.showEngine = this.checked; save(); renderHead(); renderStats(); };
  $("showEn").onchange = function () { state.showEn = this.checked; save(); document.body.classList.toggle("en", this.checked); };
  $("pick").addEventListener("change", function (ev) { state.pick = ev.target.value; save(); renderFinal(); });
  $("vcomments").addEventListener("input", function (ev) { var k = ev.target.getAttribute("data-vnote"); if (k) { state.vnotes[k] = ev.target.value; save(); } });
  $("comment").oninput = function () { state.comment = this.value; save(); };
  $("reviewer").oninput = function () { state.reviewer = this.value; save(); };
  $("resetBtn").onclick = function () {
    if (!confirm("确定清除全部标记和评语吗？")) return;
    state = { marks: {}, vnotes: {}, view: state.view }; save(); renderFinal(); renderAll();
  };

  function result() {
    var per = {};
    V.forEach(function (v) {
      var bad = [], ok = 0;
      v.lines.forEach(function (l) {
        var m = state.marks[l.id];
        if (m === "bad") bad.push({ id: l.id, time: fmt(l.start), start: l.start, text: l.text });
        else if (m === "ok") ok++;
      });
      per[v.key] = { label: v.label, engine: v.engine, marked_wrong: bad.length, marked_ok: ok, wrong_lines: bad, note: state.vnotes[v.key] || "" };
    });
    var pickV = V.filter(function (v) { return v.key === state.pick; })[0];
    return {
      review_id: D.review_id, reviewer: state.reviewer || "", exported_at: new Date().toISOString(),
      pick: state.pick ? { key: state.pick, label: pickV.label, engine: pickV.engine } : null,
      comment: state.comment || "", versions: per,
      marks: state.marks
    };
  }
  function resultText(r) {
    var s = "【字幕对比评审结果】" + (r.reviewer ? " " + r.reviewer : "") + "\n";
    s += "最终选择：" + (r.pick ? r.pick.label + "（" + r.pick.engine + "）" : "未选") + "\n";
    if (r.comment) s += "评语：" + r.comment + "\n";
    V.forEach(function (v) {
      var p = r.versions[v.key];
      s += "\n" + p.label + "：✗ " + p.marked_wrong + " 句，✓ " + p.marked_ok + " 句" + (p.note ? "；" + p.note : "") + "\n";
      p.wrong_lines.forEach(function (w) { s += "  ✗ " + w.time + " [" + w.id + "] " + w.text + "\n"; });
    });
    s += "\n--JSON--\n" + JSON.stringify({ pick: r.pick && r.pick.key, reviewer: r.reviewer, comment: r.comment, marks: r.marks, vnotes: state.vnotes });
    return s;
  }
  $("exportBtn").onclick = function () {
    var r = result();
    var blob = new Blob([JSON.stringify(r, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "字幕对比评审-" + (r.reviewer || "结果") + "-" + r.exported_at.slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    var ta = $("exportText"); ta.value = resultText(r); ta.hidden = false;
    $("exportMsg").textContent = /MicroMessenger/i.test(navigator.userAgent)
      ? "微信内置浏览器通常不能下载文件：请点“复制结果”，或长按下面文字全选复制，发给我。"
      : "已下载结果文件。如果没有看到文件，请点“复制结果”后粘贴发给我。";
  };
  $("copyBtn").onclick = function () {
    var txt = resultText(result()), ta = $("exportText");
    ta.value = txt; ta.hidden = false;
    var done = function () { $("exportMsg").textContent = "已复制，直接粘贴到微信聊天里发给我即可。"; };
    var fallback = function () { ta.focus(); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { $("exportMsg").textContent = "请长按下面文字全选并复制。"; } };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  };

  /* ---------- init ---------- */
  video.src = D.media.excerpt_video;
  $("showEngine").checked = !!state.showEngine;
  $("showEn").checked = !!state.showEn;
  renderFinal(); renderAll();
  window.addEventListener("resize", function () { $("gridHead").style.top = $("player").offsetHeight + "px"; });
  video.addEventListener("loadedmetadata", function () { $("gridHead").style.top = $("player").offsetHeight + "px"; });
})();
