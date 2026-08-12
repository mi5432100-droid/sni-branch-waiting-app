(function () {
  "use strict";

  var STORAGE_KEY = "wm_waiting_state";
  // 데모 진행 속도: 실제 avgServiceMin(분) 대신 짧은 간격으로 팀을 소진시켜
  // 새로고침 없이도 대기 흐름을 눈으로 확인할 수 있게 압축했다. 화면에 보여주는
  // 예상 시간(분)은 압축 속도가 아니라 avgServiceMin 기준 실제 값을 사용한다.
  var SERVICE_INTERVAL_MS = 6000;

  var BRANCHES = [
    { id: "gangnam", name: "강남지점", waitingTeams: 8, avgServiceMin: 12 },
    { id: "yeouido", name: "여의도지점", waitingTeams: 5, avgServiceMin: 15 },
    { id: "pangyo", name: "판교지점", waitingTeams: 3, avgServiceMin: 10 }
  ];

  var PURPOSES = ["신규 계좌개설", "자산관리 상담", "상품 가입/해지", "기타 상담"];

  var PREP_CHECKLISTS = {
    "신규 계좌개설": ["신분증", "도장 또는 서명", "초기 입금용 계좌/카드"],
    "자산관리 상담": ["신분증", "보유 자산 현황 메모", "최근 3개월 거래내역(선택)"],
    "상품 가입/해지": ["신분증", "기존 상품 계약서(해당 시)", "인감 또는 서명"],
    "기타 상담": ["신분증"]
  };

  var screens = {
    branches: document.getElementById("screen-branches"),
    register: document.getElementById("screen-register"),
    status: document.getElementById("screen-status"),
    prep: document.getElementById("screen-prep")
  };

  var branchListEl = document.getElementById("branch-list");
  var registerBranchNameEl = document.getElementById("register-branch-name");
  var purposeListEl = document.getElementById("purpose-list");
  var btnConfirmRegister = document.getElementById("btn-confirm-register");
  var btnBackToBranches = document.getElementById("btn-back-to-branches");
  var btnCancelWaiting = document.getElementById("btn-cancel-waiting");

  var statusBranchNameEl = document.getElementById("status-branch-name");
  var statusPurposeEl = document.getElementById("status-purpose");
  var positionNumberEl = document.getElementById("position-number");
  var progressFillEl = document.getElementById("progress-fill");
  var etaTextEl = document.getElementById("eta-text");
  var noticeBannerEl = document.getElementById("notice-banner");
  var prepStatusTextEl = document.getElementById("prep-status-text");
  var btnGoPrep = document.getElementById("btn-go-prep");

  var btnBackToStatus = document.getElementById("btn-back-to-status");
  var prepPurposeDescEl = document.getElementById("prep-purpose-desc");
  var prepChecklistEl = document.getElementById("prep-checklist");
  var prepMemoEl = document.getElementById("prep-memo");
  var btnIdentityVerify = document.getElementById("btn-identity-verify");
  var btnCompletePrep = document.getElementById("btn-complete-prep");

  var pendingBranch = null;
  var pendingPurpose = null;
  var statusTimer = null;

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle("hidden", key !== name);
    });
  }

  function loadState() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      var state = JSON.parse(raw);
      if (!state.prep) {
        state.prep = { checkedDocs: [], memo: "", identityVerified: false, completed: false };
      }
      return state;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function renderBranchList() {
    branchListEl.innerHTML = "";
    BRANCHES.forEach(function (branch) {
      var li = document.createElement("li");
      li.className = "branch-card";

      var info = document.createElement("div");
      info.className = "branch-info";
      var h3 = document.createElement("h3");
      h3.textContent = branch.name;
      var p = document.createElement("p");
      p.textContent =
        "현재 대기 " + branch.waitingTeams + "팀 · 예상 " +
        branch.waitingTeams * branch.avgServiceMin + "분";
      info.appendChild(h3);
      info.appendChild(p);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-register-small";
      btn.textContent = "웨이팅 등록";
      btn.addEventListener("click", function () {
        openRegisterScreen(branch);
      });

      li.appendChild(info);
      li.appendChild(btn);
      branchListEl.appendChild(li);
    });
  }

  function openRegisterScreen(branch) {
    pendingBranch = branch;
    pendingPurpose = null;
    registerBranchNameEl.textContent = branch.name;
    btnConfirmRegister.disabled = true;

    purposeListEl.innerHTML = "";
    PURPOSES.forEach(function (purpose) {
      var div = document.createElement("div");
      div.className = "purpose-option";
      div.textContent = purpose;
      div.addEventListener("click", function () {
        pendingPurpose = purpose;
        Array.prototype.forEach.call(
          purposeListEl.children,
          function (child) { child.classList.remove("selected"); }
        );
        div.classList.add("selected");
        btnConfirmRegister.disabled = false;
      });
      purposeListEl.appendChild(div);
    });

    showScreen("register");
  }

  function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function confirmRegister() {
    if (!pendingBranch || !pendingPurpose) return;
    requestNotificationPermission();

    var state = {
      branchId: pendingBranch.id,
      branchName: pendingBranch.name,
      purpose: pendingPurpose,
      initialPosition: pendingBranch.waitingTeams,
      avgServiceMin: pendingBranch.avgServiceMin,
      registeredAt: Date.now(),
      notifiedReady: false,
      notifiedSoon: false,
      prep: {
        checkedDocs: [],
        memo: "",
        identityVerified: false,
        completed: false
      }
    };
    saveState(state);
    showStatusScreen(state);
  }

  function computeRemaining(state) {
    var elapsedMs = Date.now() - state.registeredAt;
    var served = Math.floor(elapsedMs / SERVICE_INTERVAL_MS);
    return Math.max(0, state.initialPosition - served);
  }

  function renderStatus(state) {
    var remaining = computeRemaining(state);

    statusBranchNameEl.textContent = state.branchName;
    statusPurposeEl.textContent = state.purpose;
    positionNumberEl.textContent = remaining;

    var progressPct = state.initialPosition === 0
      ? 100
      : Math.min(100, ((state.initialPosition - remaining) / state.initialPosition) * 100);
    progressFillEl.style.width = progressPct + "%";

    var etaMin = remaining * state.avgServiceMin;
    etaTextEl.textContent = remaining === 0
      ? "지금 창구로 입장해주세요."
      : "예상 대기시간 약 " + etaMin + "분";

    if (remaining === 0) {
      noticeBannerEl.textContent = "입장하실 차례입니다! 창구로 와주세요.";
      noticeBannerEl.classList.remove("hidden");
      noticeBannerEl.classList.add("ready");
      if (!state.notifiedReady) {
        notifyUser("지금 입장해주세요", state.branchName + " 창구로 와주세요.");
        state.notifiedReady = true;
        saveState(state);
      }
      stopStatusTimer();
    } else if (remaining <= 1) {
      noticeBannerEl.textContent = "곧 입장하십니다. 지점으로 이동해주세요.";
      noticeBannerEl.classList.remove("hidden", "ready");
      if (!state.notifiedSoon) {
        notifyUser("곧 입장하세요", state.branchName + " 대기가 얼마 남지 않았습니다.");
        state.notifiedSoon = true;
        saveState(state);
      }
    } else {
      noticeBannerEl.classList.add("hidden");
      noticeBannerEl.classList.remove("ready");
    }

    if (state.prep && state.prep.completed) {
      prepStatusTextEl.textContent = "사전 준비: 완료 ✓";
      prepStatusTextEl.classList.add("done");
      btnGoPrep.textContent = "준비 내용 보기";
    } else {
      prepStatusTextEl.textContent = "사전 준비: 미완료";
      prepStatusTextEl.classList.remove("done");
      btnGoPrep.textContent = "상담 준비하기";
    }
  }

  function openPrepScreen() {
    var state = loadState();
    if (!state) return;

    prepPurposeDescEl.textContent = state.purpose + " 상담을 위해 아래 항목을 미리 준비해주세요.";

    var docs = PREP_CHECKLISTS[state.purpose] || PREP_CHECKLISTS["기타 상담"];
    prepChecklistEl.innerHTML = "";
    docs.forEach(function (doc) {
      var label = document.createElement("label");
      label.className = "prep-checklist-item";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.prep.checkedDocs.indexOf(doc) !== -1;
      checkbox.addEventListener("change", function () {
        var current = loadState();
        if (!current) return;
        var idx = current.prep.checkedDocs.indexOf(doc);
        if (checkbox.checked && idx === -1) {
          current.prep.checkedDocs.push(doc);
        } else if (!checkbox.checked && idx !== -1) {
          current.prep.checkedDocs.splice(idx, 1);
        }
        saveState(current);
      });

      var span = document.createElement("span");
      span.textContent = doc;

      label.appendChild(checkbox);
      label.appendChild(span);
      prepChecklistEl.appendChild(label);
    });

    prepMemoEl.value = state.prep.memo || "";
    setIdentityButtonState(state.prep.identityVerified);

    showScreen("prep");
  }

  function setIdentityButtonState(verified) {
    if (verified) {
      btnIdentityVerify.textContent = "본인인증 완료 ✓";
      btnIdentityVerify.classList.add("verified");
    } else {
      btnIdentityVerify.textContent = "본인인증 하기";
      btnIdentityVerify.classList.remove("verified");
    }
  }

  function toggleIdentityVerify() {
    var state = loadState();
    if (!state) return;
    state.prep.identityVerified = !state.prep.identityVerified;
    saveState(state);
    setIdentityButtonState(state.prep.identityVerified);
  }

  function saveMemo() {
    var state = loadState();
    if (!state) return;
    state.prep.memo = prepMemoEl.value;
    saveState(state);
  }

  function completePrep() {
    var state = loadState();
    if (!state) return;
    state.prep.memo = prepMemoEl.value;
    state.prep.completed = true;
    saveState(state);
    showScreen("status");
    renderStatus(state);
  }

  function notifyUser(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: body });
    }
  }

  function showStatusScreen(state) {
    showScreen("status");
    renderStatus(state);
    startStatusTimer();
  }

  function startStatusTimer() {
    stopStatusTimer();
    statusTimer = setInterval(function () {
      var state = loadState();
      if (!state) {
        stopStatusTimer();
        return;
      }
      renderStatus(state);
    }, 1000);
  }

  function stopStatusTimer() {
    if (statusTimer) {
      clearInterval(statusTimer);
      statusTimer = null;
    }
  }

  function cancelWaiting() {
    clearState();
    stopStatusTimer();
    showScreen("branches");
  }

  btnConfirmRegister.addEventListener("click", confirmRegister);
  btnBackToBranches.addEventListener("click", function () {
    showScreen("branches");
  });
  btnCancelWaiting.addEventListener("click", cancelWaiting);
  btnGoPrep.addEventListener("click", openPrepScreen);
  btnBackToStatus.addEventListener("click", function () {
    saveMemo();
    var state = loadState();
    showScreen("status");
    if (state) renderStatus(state);
  });
  btnIdentityVerify.addEventListener("click", toggleIdentityVerify);
  btnCompletePrep.addEventListener("click", completePrep);
  prepMemoEl.addEventListener("blur", saveMemo);

  // ===================================================================
  // Investment dashboard (관심종목 / 메모 / 체크리스트)
  // Separate localStorage-backed module, independent of the waiting app.
  // ===================================================================

  var DASH_KEYS = {
    watchlist: "d96_watchlist",
    notes: "d96_notes",
    checklist: "d96_checklist"
  };

  var tabWaiting = document.getElementById("tab-waiting");
  var tabDashboard = document.getElementById("tab-dashboard");
  var viewWaiting = document.getElementById("view-waiting");
  var viewDashboard = document.getElementById("view-dashboard");

  var watchlistForm = document.getElementById("watchlist-form");
  var watchlistNameInput = document.getElementById("watchlist-name-input");
  var watchlistMemoInput = document.getElementById("watchlist-memo-input");
  var watchlistListEl = document.getElementById("watchlist-list");
  var watchlistEmptyEl = document.getElementById("watchlist-empty");

  var noteForm = document.getElementById("note-form");
  var noteInput = document.getElementById("note-input");
  var noteListEl = document.getElementById("note-list");
  var noteEmptyEl = document.getElementById("note-empty");

  var checklistForm = document.getElementById("checklist-form");
  var checklistInput = document.getElementById("checklist-input");
  var checklistListEl = document.getElementById("checklist-list");
  var checklistEmptyEl = document.getElementById("checklist-empty");

  function loadList(key) {
    var raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function nextId(list) {
    var max = 0;
    list.forEach(function (item) { if (item.id > max) max = item.id; });
    return max + 1;
  }

  function switchMode(mode) {
    var toWaiting = mode === "waiting";
    viewWaiting.classList.toggle("hidden", !toWaiting);
    viewDashboard.classList.toggle("hidden", toWaiting);
    tabWaiting.classList.toggle("active", toWaiting);
    tabDashboard.classList.toggle("active", !toWaiting);
  }

  // ---- 관심종목 ----

  function renderWatchlist() {
    var items = loadList(DASH_KEYS.watchlist);
    watchlistListEl.innerHTML = "";
    watchlistEmptyEl.classList.toggle("hidden", items.length > 0);

    items.forEach(function (item) {
      var li = document.createElement("li");

      var main = document.createElement("div");
      main.className = "d96-item-main";
      var name = document.createElement("span");
      name.className = "d96-item-name";
      name.textContent = item.name;
      main.appendChild(name);
      if (item.memo) {
        var memo = document.createElement("span");
        memo.className = "d96-item-memo";
        memo.textContent = item.memo;
        main.appendChild(memo);
      }

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "d96-item-remove";
      removeBtn.textContent = "삭제";
      removeBtn.addEventListener("click", function () {
        saveList(DASH_KEYS.watchlist, loadList(DASH_KEYS.watchlist).filter(function (i) {
          return i.id !== item.id;
        }));
        renderWatchlist();
      });

      li.appendChild(main);
      li.appendChild(removeBtn);
      watchlistListEl.appendChild(li);
    });
  }

  watchlistForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = watchlistNameInput.value.trim();
    if (!name) return;
    var items = loadList(DASH_KEYS.watchlist);
    items.push({ id: nextId(items), name: name, memo: watchlistMemoInput.value.trim() });
    saveList(DASH_KEYS.watchlist, items);
    watchlistForm.reset();
    renderWatchlist();
  });

  // ---- 메모 ----

  function renderNotes() {
    var items = loadList(DASH_KEYS.notes);
    noteListEl.innerHTML = "";
    noteEmptyEl.classList.toggle("hidden", items.length > 0);

    items.forEach(function (item) {
      var li = document.createElement("li");

      var main = document.createElement("div");
      main.className = "d96-item-main";
      var text = document.createElement("span");
      text.className = "d96-item-name";
      text.textContent = item.text;
      main.appendChild(text);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "d96-item-remove";
      removeBtn.textContent = "삭제";
      removeBtn.addEventListener("click", function () {
        saveList(DASH_KEYS.notes, loadList(DASH_KEYS.notes).filter(function (i) {
          return i.id !== item.id;
        }));
        renderNotes();
      });

      li.appendChild(main);
      li.appendChild(removeBtn);
      noteListEl.appendChild(li);
    });
  }

  noteForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = noteInput.value.trim();
    if (!text) return;
    var items = loadList(DASH_KEYS.notes);
    items.push({ id: nextId(items), text: text });
    saveList(DASH_KEYS.notes, items);
    noteForm.reset();
    renderNotes();
  });

  // ---- 체크리스트 ----

  function renderChecklist() {
    var items = loadList(DASH_KEYS.checklist);
    checklistListEl.innerHTML = "";
    checklistEmptyEl.classList.toggle("hidden", items.length > 0);

    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "d96-checklist-item" + (item.done ? " done" : "");

      var label = document.createElement("label");
      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!item.done;
      checkbox.addEventListener("change", function () {
        var items2 = loadList(DASH_KEYS.checklist);
        items2.forEach(function (i) { if (i.id === item.id) i.done = checkbox.checked; });
        saveList(DASH_KEYS.checklist, items2);
        renderChecklist();
      });
      var text = document.createElement("span");
      text.className = "d96-item-text";
      text.textContent = item.text;
      label.appendChild(checkbox);
      label.appendChild(text);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "d96-item-remove";
      removeBtn.textContent = "삭제";
      removeBtn.addEventListener("click", function () {
        saveList(DASH_KEYS.checklist, loadList(DASH_KEYS.checklist).filter(function (i) {
          return i.id !== item.id;
        }));
        renderChecklist();
      });

      li.appendChild(label);
      li.appendChild(removeBtn);
      checklistListEl.appendChild(li);
    });
  }

  checklistForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = checklistInput.value.trim();
    if (!text) return;
    var items = loadList(DASH_KEYS.checklist);
    items.push({ id: nextId(items), text: text, done: false });
    saveList(DASH_KEYS.checklist, items);
    checklistForm.reset();
    renderChecklist();
  });

  tabWaiting.addEventListener("click", function () { switchMode("waiting"); });
  tabDashboard.addEventListener("click", function () { switchMode("dashboard"); });

  function initDashboard() {
    renderWatchlist();
    renderNotes();
    renderChecklist();
  }

  function init() {
    renderBranchList();
    var existing = loadState();
    if (existing) {
      showStatusScreen(existing);
    } else {
      showScreen("branches");
    }
    initDashboard();
  }

  init();
})();
