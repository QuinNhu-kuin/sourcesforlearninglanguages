// script.js — phiên bản tiếng Nhật (SRS + SpeechSynthesis API)
(() => {
  const STORAGE_KEY = "quin_srs_jp_v1";
  const THEME_KEY = "quin_theme_jp";
  const msPerDay = 24 * 60 * 60 * 1000;
  const todayDays = () => Math.floor(Date.now() / msPerDay);

  // ======= SuperMemo-2 Algorithm =======
  function sm2Update(w, q) {
    if (!w) return;
    if (q < 3) {
      w.reps = 0;
      w.interval = 1;
    } else {
      w.reps = (w.reps || 0) + 1;
      if (w.reps === 1) w.interval = 1;
      else if (w.reps === 2) w.interval = 6;
      else w.interval = Math.round((w.interval || 1) * (w.ef || 2.5));
    }
    w.ef = Math.max(
      1.3,
      (w.ef || 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    );
    w.next = todayDays() + (w.interval || 1);
  }

  // ======= Storage =======
  let db = { words: [] };
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) db = JSON.parse(raw);
    } catch {
      db = { words: [] };
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    updateStats();
  }

  // ======= DOM =======
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const tabBtns = $$(".tab-btn");
  const panels = $$(".tab");
  const inpKanji = $("#inp-kanji");
  const inpKana = $("#inp-kana");
  const inpMeaning = $("#inp-meaning");
  const inpExample = $("#inp-example");
  const inpImage = $("#inp-image");
  const btnAdd = $("#btn-add");
  const addMsg = $("#addMsg");

  const dueCountEl = $("#dueCount");
  const noDueEl = $("#noDue");
  const cardEl = $("#card");
  const cardKanji = $("#card-kanji");
  const cardKana = $("#card-kana");
  const cardMeaning = $("#card-meaning");
  const cardExample = $("#card-example");
  const cardImageContainer = $("#card-image-container");
  const queueMeta = $("#queueMeta");
  const showMeaningBtn = $("#showMeaningBtn");
  const playAudioBtn = $("#playAudioBtn");
  const gradeBtns = $$(".grade-btn");
  const wordTableBody = $("#wordTable tbody");
  const searchBox = $("#searchBox");
  const refreshListBtn = $("#refreshList");
  const statTotal = $("#statTotal");
  const statDue = $("#statDue");
  const chartEl = $("#chart");
  const exportBtn = $("#exportBtn");
  const importBtn = $("#importBtn");
  const importFile = $("#importFile");
  const clearAllBtn = $("#clearAll");
  const themeBtn = $("#themeToggle");

  let queue = [];
  let idx = 0;

  // ======= Init =======
  load();
  bindTabs();
  updateStats();
  renderList();
  startLeafFall();
  setupTheme();

  // ======= Speech =======
  function speakJapanese(text) {
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.rate = 1;
    utter.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  // ======= Tabs =======
  function bindTabs() {
    tabBtns.forEach((b) => {
      b.addEventListener("click", () => {
        tabBtns.forEach((x) => x.classList.remove("active"));
        panels.forEach((p) => p.classList.remove("active"));
        b.classList.add("active");
        const target = document.getElementById(b.dataset.target);
        if (target) target.classList.add("active");

        if (b.dataset.target === "tab-list") renderList();
        if (b.dataset.target === "tab-stats") drawChart();
        if (b.dataset.target === "tab-review") prepareReview();
      });
    });
  }

  // ======= Add new word =======
  btnAdd.addEventListener("click", () => {
    const kanji = inpKanji.value.trim();
    const meaning = inpMeaning.value.trim();
    if (!kanji || !meaning) {
      addMsg.textContent = "Kanji và Ý nghĩa là bắt buộc";
      setTimeout(() => (addMsg.textContent = ""), 1800);
      return;
    }
    const item = {
      id: Date.now(),
      kanji,
      kana: inpKana.value.trim(),
      meaning,
      example: inpExample.value.trim(),
      imageUrl: inpImage.value.trim(),
      ef: 2.5,
      reps: 0,
      interval: 1,
      next: todayDays(),
    };
    db.words.push(item);
    save();
    inpKanji.value =
      inpKana.value =
      inpMeaning.value =
      inpExample.value =
      inpImage.value =
        "";
    addMsg.textContent = "Đã lưu ✓";
    setTimeout(() => (addMsg.textContent = ""), 1500);
  });

  // ======= Review mode =======
  function prepareReview() {
    queue = db.words.filter((w) => (w.next || 0) <= todayDays());
    updateStats();
    if (!queue.length) {
      noDueEl.style.display = "block";
      cardEl.classList.add("hidden");
      return;
    }
    noDueEl.style.display = "none";
    idx = 0;
    showCard();
  }

  function showCard() {
    const w = queue[idx];
    if (!w) return;
    cardKanji.textContent = w.kanji;
    cardKana.textContent = w.kana || "";
    cardMeaning.textContent = w.meaning || "";
    cardExample.textContent = w.example || "";
    cardKana.classList.add("hidden");
    cardMeaning.classList.add("hidden");
    cardExample.classList.add("hidden");
    cardImageContainer.innerHTML = "";

    if (w.imageUrl) {
      const img = document.createElement("img");
      img.src = w.imageUrl;
      img.alt = "img";
      img.style.width = "120px";
      img.style.height = "90px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      img.classList.add("hidden");
      cardImageContainer.appendChild(img);
    }

    playAudioBtn.onclick = () => speakJapanese(w.kana || w.kanji || "");
    queueMeta.textContent = `Từ ${idx + 1}/${queue.length}`;
    cardEl.classList.remove("hidden");
  }

  // ======= Show Meaning =======
  showMeaningBtn.addEventListener("click", () => {
    cardKana.classList.remove("hidden");
    cardMeaning.classList.remove("hidden");
    cardExample.classList.remove("hidden");
    const img = cardImageContainer.querySelector("img");
    if (img) img.classList.remove("hidden");
    const w = queue[idx];
    if (w) speakJapanese(w.kana || w.kanji || "");
  });

  // ======= Grade =======
  gradeBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      const q = Number(btn.dataset.q);
      gradeCurrent(q);
    })
  );

  function gradeCurrent(q) {
    const w = queue[idx];
    if (!w) return;
    sm2Update(w, q);
    const pos = db.words.findIndex((x) => x.id === w.id);
    if (pos >= 0) db.words[pos] = w;
    save();
    idx++;
    if (idx < queue.length) showCard();
    else {
      alert("Hoàn thành phiên ôn hôm nay 🎉");
      prepareReview();
    }
  }

  // ======= List =======
  function renderList(filter = "") {
    wordTableBody.innerHTML = "";
    const f = filter.trim().toLowerCase();
    const words = db.words
      .slice()
      .sort((a, b) => (a.kanji || "").localeCompare(b.kanji || ""));
    if (!words.length) {
      wordTableBody.innerHTML =
        '<tr><td colspan="8" class="muted">Chưa có từ nào.</td></tr>';
      return;
    }

    for (const w of words) {
      if (
        f &&
        !(
          (w.kanji || "").toLowerCase().includes(f) ||
          (w.kana || "").toLowerCase().includes(f) ||
          (w.meaning || "").toLowerCase().includes(f)
        )
      )
        continue;

      const tr = document.createElement("tr");
      const nextDate = new Date((w.next || todayDays()) * msPerDay);
      const nextStr = `${nextDate.getDate()}/${
        nextDate.getMonth() + 1
      }/${nextDate.getFullYear()}`;

      tr.innerHTML = `
        <td>${escapeHtml(w.kanji)}</td>
        <td>${escapeHtml(w.kana || "")}</td>
        <td>${escapeHtml(w.meaning || "")}</td>
        <td>${escapeHtml(w.example || "")}</td>
        <td>${
          w.imageUrl ? `<img src="${escapeHtml(w.imageUrl)}" alt="img">` : ""
        }</td>
        <td>${nextStr}</td>
        <td><button class="icon-btn small play-row" data-id="${
          w.id
        }">🔊</button></td>
        <td><button class="danger delete-row" data-id="${
          w.id
        }">Xóa</button></td>
      `;
      wordTableBody.appendChild(tr);
    }

    $$(".play-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const w = db.words.find((x) => x.id === id);
        if (w) speakJapanese(w.kana || w.kanji || "");
      });
    });

    $$(".delete-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        if (!confirm("Xóa từ này?")) return;
        const pos = db.words.findIndex((x) => x.id === id);
        if (pos >= 0) {
          db.words.splice(pos, 1);
          save();
          renderList(searchBox.value);
        }
      });
    });
  }

  refreshListBtn.addEventListener("click", () => renderList(searchBox.value));
  searchBox.addEventListener("input", () => renderList(searchBox.value));

  // ======= Stats =======
  function updateStats() {
    statTotal.textContent = db.words.length;
    const due = db.words.filter((w) => (w.next || 0) <= todayDays()).length;
    statDue.textContent = due;
    if (dueCountEl) dueCountEl.textContent = `(${due} từ đến hạn)`;
  }

  function drawChart() {
    const days = Array.from({ length: 7 }, (_, i) => todayDays() - (6 - i));
    const counts = days.map(
      (d) => db.words.filter((w) => (w.next || 0) === d).length
    );
    chartEl.innerHTML = "";
    const max = Math.max(...counts, 1);
    counts.forEach((c) => {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${(c / max) * 100}%`;
      bar.style.background = `linear-gradient(180deg, var(--main), var(--main-dark))`;
      bar.textContent = c || "";
      chartEl.appendChild(bar);
    });
  }

  // ======= Export / Import / Clear =======
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quin_srs_jp_backup.json";
    a.click();
  });

  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await f.text();
    try {
      const data = JSON.parse(text);
      if (data.words && Array.isArray(data.words)) {
        db = data;
        save();
        renderList();
        alert("Nhập JSON thành công ✓");
      } else alert('File không đúng định dạng (cần key "words")');
    } catch {
      alert("Không đọc được file JSON");
    }
  });

  clearAllBtn.addEventListener("click", () => {
    if (!confirm("Xoá toàn bộ từ? (không thể hoàn tác)")) return;
    db.words = [];
    save();
    renderList();
    prepareReview();
  });

  // ======= Helpers =======
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m];
    });
  }

  // ======= Rose Fall Animation =======
  function startLeafFall() {
    const container = document.querySelector(".rose-container");
    if (!container) return;
    const leafImg = "img/maple-leaf.png";
    setInterval(() => {
      if (container.childElementCount > 30) return;
      const d = document.createElement("div");
      d.className = "rose";
      d.style.left = Math.random() * 100 + "vw";
      d.style.width = 14 + Math.random() * 20 + "px";
      d.style.height = d.style.width;
      d.style.backgroundImage = `url("${leafImg}")`;
      d.style.animationDuration = 4 + Math.random() * 5 + "s";
      container.appendChild(d);
      setTimeout(() => d.remove(), 9000);
    }, 450);
  }

  // ======= Theme Toggle =======
  function setupTheme() {
    if (!themeBtn) return;
    const saved = localStorage.getItem(THEME_KEY) || "light";
    if (saved === "dark") {
      document.body.classList.add("dark");
      themeBtn.textContent = "☀️ Chế độ ngày";
    }
    themeBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark");
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
      themeBtn.textContent = isDark ? "☀️ Chế độ ngày" : "🌙 Chế độ đêm";
    });
  }
})();
