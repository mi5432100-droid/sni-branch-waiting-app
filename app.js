(function () {
  "use strict";

  var STORAGE_KEY = "wm_waiting_state";
  // 데모 진행 속도: 실제 avgServiceMin(분) 대신 짧은 간격으로 팀을 소진시켜
  // 새로고침 없이도 대기 흐름을 눈으로 확인할 수 있게 압축했다. 화면에 보여주는
  // 예상 시간(분)은 압축 속도가 아니라 avgServiceMin 기준 실제 값을 사용한다.
  var SERVICE_INTERVAL_MS = 6000;

  var REGIONS = [
    { id: "seoul", name: "서울" },
    { id: "gyeonggi", name: "경기·인천" },
    { id: "gangwon", name: "강원" },
    { id: "daejeon", name: "대전·충청" },
    { id: "daegu", name: "대구·경북" },
    { id: "busan", name: "부산·울산·경남" },
    { id: "gwangju", name: "광주·전라" },
    { id: "jeju", name: "제주" }
  ];

  var BRANCHES = [
    { id: "jongno", name: "종로지점", region: "seoul", type: "general", waitingTeams: 4, avgServiceMin: 12 },
    { id: "jamsil", name: "잠실지점", region: "seoul", type: "general", waitingTeams: 5, avgServiceMin: 11 },
    { id: "sni-gangnam", name: "SNI 강남 패밀리오피스센터", region: "seoul", type: "sni", waitingTeams: 2, avgServiceMin: 25 },
    { id: "sni-yeouido", name: "SNI 여의도센터", region: "seoul", type: "sni", waitingTeams: 1, avgServiceMin: 20 },
    { id: "bundang", name: "분당지점", region: "gyeonggi", type: "general", waitingTeams: 3, avgServiceMin: 12 },
    { id: "incheon", name: "인천지점", region: "gyeonggi", type: "general", waitingTeams: 4, avgServiceMin: 10 },
    { id: "gangneung", name: "강릉지점", region: "gangwon", type: "general", waitingTeams: 2, avgServiceMin: 11 },
    { id: "wonju", name: "원주지점", region: "gangwon", type: "general", waitingTeams: 2, avgServiceMin: 10 },
    { id: "daejeon-branch", name: "대전지점", region: "daejeon", type: "general", waitingTeams: 3, avgServiceMin: 11 },
    { id: "cheongju", name: "청주지점", region: "daejeon", type: "general", waitingTeams: 2, avgServiceMin: 10 },
    { id: "daegu-branch", name: "대구지점", region: "daegu", type: "general", waitingTeams: 4, avgServiceMin: 12 },
    { id: "pohang", name: "포항지점", region: "daegu", type: "general", waitingTeams: 2, avgServiceMin: 10 },
    { id: "seomyeon", name: "부산서면지점", region: "busan", type: "general", waitingTeams: 6, avgServiceMin: 11 },
    { id: "centum", name: "센텀지점", region: "busan", type: "general", waitingTeams: 4, avgServiceMin: 13 },
    { id: "changwon", name: "창원지점", region: "busan", type: "general", waitingTeams: 3, avgServiceMin: 10 },
    { id: "ulsan", name: "울산지점", region: "busan", type: "general", waitingTeams: 5, avgServiceMin: 12 },
    { id: "gwangju-branch", name: "광주지점", region: "gwangju", type: "general", waitingTeams: 3, avgServiceMin: 11 },
    { id: "jeonju", name: "전주지점", region: "gwangju", type: "general", waitingTeams: 2, avgServiceMin: 10 },
    { id: "jeju-branch", name: "제주지점", region: "jeju", type: "general", waitingTeams: 2, avgServiceMin: 12 }
  ];

  var PURPOSES = ["신규 계좌개설", "자산관리 상담", "상품 가입/해지", "기타 상담"];

  var PREP_CHECKLISTS = {
    "신규 계좌개설": ["신분증", "도장 또는 서명", "초기 입금용 계좌/카드"],
    "자산관리 상담": ["신분증", "보유 자산 현황 메모", "최근 3개월 거래내역(선택)"],
    "상품 가입/해지": ["신분증", "기존 상품 계약서(해당 시)", "인감 또는 서명"],
    "기타 상담": ["신분증"]
  };

  var screens = {
    regions: document.getElementById("screen-regions"),
    branches: document.getElementById("screen-branches"),
    register: document.getElementById("screen-register"),
    status: document.getElementById("screen-status"),
    prep: document.getElementById("screen-prep")
  };

  var regionListEl = document.getElementById("region-list");
  var branchesRegionNameEl = document.getElementById("branches-region-name");
  var btnBackToRegions = document.getElementById("btn-back-to-regions");
  var branchListEl = document.getElementById("branch-list");
  var registerBranchNameEl = document.getElementById("register-branch-name");
  var registerTypeBadgeEl = document.getElementById("register-type-badge");
  var purposeListEl = document.getElementById("purpose-list");
  var btnConfirmRegister = document.getElementById("btn-confirm-register");
  var btnBackToBranches = document.getElementById("btn-back-to-branches");
  var btnCancelWaiting = document.getElementById("btn-cancel-waiting");

  var statusBranchNameEl = document.getElementById("status-branch-name");
  var statusTypeBadgeEl = document.getElementById("status-type-badge");
  var statusPurposeEl = document.getElementById("status-purpose");
  var positionNumberEl = document.getElementById("position-number");
  var positionLabelEl = document.getElementById("position-label");
  var sniNoteEl = document.getElementById("sni-note");
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
  var currentRegion = null;

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle("hidden", key !== name);
    });
  }

  function renderRegionList() {
    regionListEl.innerHTML = "";
    REGIONS.forEach(function (region) {
      var count = BRANCHES.filter(function (b) { return b.region === region.id; }).length;
      var li = document.createElement("li");
      li.className = "region-card";

      var h3 = document.createElement("h3");
      h3.textContent = region.name;
      var p = document.createElement("p");
      p.textContent = count + "개 지점";

      li.appendChild(h3);
      li.appendChild(p);
      li.addEventListener("click", function () {
        openBranchesForRegion(region);
      });
      regionListEl.appendChild(li);
    });
  }

  function openBranchesForRegion(region) {
    currentRegion = region.id;
    branchesRegionNameEl.textContent = region.name;
    renderBranchList();
    showScreen("branches");
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
    BRANCHES.filter(function (branch) {
      return branch.region === currentRegion;
    }).forEach(function (branch) {
      var isSni = branch.type === "sni";
      var li = document.createElement("li");
      li.className = "branch-card" + (isSni ? " branch-card-sni" : "");

      var info = document.createElement("div");
      info.className = "branch-info";

      if (isSni) {
        var badge = document.createElement("span");
        badge.className = "type-badge";
        badge.textContent = "SNI · 예약제";
        info.appendChild(badge);
      }

      var h3 = document.createElement("h3");
      h3.textContent = branch.name;
      var p = document.createElement("p");
      p.textContent = isSni
        ? "예약 접수 " + branch.waitingTeams + "건 · PB 준비 예상 " + (branch.waitingTeams * branch.avgServiceMin) + "분"
        : "현재 대기 " + branch.waitingTeams + "팀 · 예상 " + (branch.waitingTeams * branch.avgServiceMin) + "분";
      info.appendChild(h3);
      info.appendChild(p);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-register-small";
      btn.textContent = isSni ? "예약 신청" : "대기 등록";
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

    var isSni = branch.type === "sni";
    registerTypeBadgeEl.textContent = "SNI · 예약제";
    registerTypeBadgeEl.classList.toggle("hidden", !isSni);
    btnConfirmRegister.textContent = isSni ? "예약 신청하기" : "대기 등록하기";

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
      branchType: pendingBranch.type,
      branchRegion: pendingBranch.region,
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
    var isSni = state.branchType === "sni";

    statusTypeBadgeEl.textContent = "SNI · 예약제";
    statusTypeBadgeEl.classList.toggle("hidden", !isSni);
    sniNoteEl.classList.toggle("hidden", !isSni);
    positionLabelEl.textContent = isSni ? "번째 예약 순서" : "팀 남음";

    statusBranchNameEl.textContent = state.branchName;
    statusPurposeEl.textContent = state.purpose;
    positionNumberEl.textContent = remaining;

    var progressPct = state.initialPosition === 0
      ? 100
      : Math.min(100, ((state.initialPosition - remaining) / state.initialPosition) * 100);
    progressFillEl.style.width = progressPct + "%";

    var etaMin = remaining * state.avgServiceMin;
    etaTextEl.textContent = remaining === 0
      ? (isSni ? "지금 창구로 입장해주세요." : "지금 창구로 입장해주세요.")
      : (isSni ? "PB 준비까지 약 " + etaMin + "분 예상" : "예상 대기시간 약 " + etaMin + "분");

    if (remaining === 0) {
      noticeBannerEl.textContent = isSni
        ? "예약이 확정되었습니다! 창구로 와주세요."
        : "입장하실 차례입니다! 창구로 와주세요.";
      noticeBannerEl.classList.remove("hidden");
      noticeBannerEl.classList.add("ready");
      if (!state.notifiedReady) {
        notifyUser("지금 입장해주세요", state.branchName + " 창구로 와주세요.");
        state.notifiedReady = true;
        saveState(state);
      }
      stopStatusTimer();
    } else if (remaining <= 1) {
      noticeBannerEl.textContent = isSni
        ? "곧 예약이 확정됩니다. 지점으로 이동해주세요."
        : "곧 입장하십니다. 지점으로 이동해주세요.";
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
    var region = REGIONS.filter(function (r) { return r.id === currentRegion; })[0];
    if (region) {
      openBranchesForRegion(region);
    } else {
      showScreen("regions");
    }
  }

  btnConfirmRegister.addEventListener("click", confirmRegister);
  btnBackToBranches.addEventListener("click", function () {
    showScreen("branches");
  });
  btnBackToRegions.addEventListener("click", function () {
    showScreen("regions");
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
  // Investment dashboard (투자자 성향 / 자산 구조)
  // 고객이 직접 입력하는 화면. localStorage에 저장한다.
  // ===================================================================

  var tabWaiting = document.getElementById("tab-waiting");
  var tabDashboard = document.getElementById("tab-dashboard");
  var tabPb = document.getElementById("tab-pb");
  var viewWaiting = document.getElementById("view-waiting");
  var viewDashboard = document.getElementById("view-dashboard");
  var viewPb = document.getElementById("view-pb");

  var MODE_TABS = [
    { mode: "waiting", tab: tabWaiting, view: viewWaiting },
    { mode: "dashboard", tab: tabDashboard, view: viewDashboard },
    { mode: "pb", tab: tabPb, view: viewPb }
  ];

  function switchMode(mode) {
    MODE_TABS.forEach(function (m) {
      var active = m.mode === mode;
      m.view.classList.toggle("hidden", !active);
      m.tab.classList.toggle("active", active);
    });
    if (mode === "pb") renderPbEvents();
  }

  tabWaiting.addEventListener("click", function () { switchMode("waiting"); });
  tabDashboard.addEventListener("click", function () { switchMode("dashboard"); });
  tabPb.addEventListener("click", function () { switchMode("pb"); });

  function formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  // ===================================================================
  // PB 업무 — 고객 자산 만기·조기상환 이벤트 (샘플 데이터)
  // ===================================================================

  var PB_RESOLVED_KEY = "pb_events_resolved";

  var PB_EVENTS = [
    {
      id: "evt-1",
      customer: "박서연",
      product: "ELS 26-042호",
      status: "예상",
      detail: "조기상환평가일 D-7 · 기초자산이 배리어(85%) 대비 +3.2%p 여유",
      draft: null
    },
    {
      id: "evt-2",
      customer: "김하늘",
      product: "ELS 25-101호",
      status: "확정",
      detail: "조기상환 확정 · 상환금액 약 2,800만원 · 입금예정 2026-08-18",
      draft: "안녕하세요 김하늘 고객님, 삼성증권 김민준입니다.\n\n보유하신 ELS 25-101호가 조기상환 조건을 충족해 약 2,800만원이 8월 18일 입금될 예정입니다.\n\n편하신 시간에 연락 주시면 재투자 방안을 상세히 안내드리겠습니다."
    },
    {
      id: "evt-3",
      customer: "이수진",
      product: "정기예금",
      status: "확정",
      detail: "만기 D-7 · 만기일 2026-08-20 · 만기금액 약 5,000만원",
      draft: "안녕하세요 이수진 고객님, 삼성증권 김민준입니다.\n\n보유하신 정기예금이 8월 20일 만기 도래하며 만기금액은 약 5,000만원입니다.\n\n편하신 시간에 연락 주시면 재예치·재투자 방안을 안내드리겠습니다."
    },
    {
      id: "evt-4",
      customer: "정우진",
      product: "ELS 25-077호",
      status: "이월",
      detail: "이번 평가일 조건 미충족 · 다음 평가일 2026-11-15로 이월 · 배리어(75%) 대비 -4.1%p 부족",
      draft: null
    }
  ];

  var pbEventListEl = document.getElementById("pb-event-list");

  function loadResolvedEvents() {
    var raw = localStorage.getItem(PB_RESOLVED_KEY);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function markEventResolved(id) {
    var resolved = loadResolvedEvents();
    if (resolved.indexOf(id) === -1) resolved.push(id);
    localStorage.setItem(PB_RESOLVED_KEY, JSON.stringify(resolved));
  }

  var STATUS_CLASS = { "예상": "pb-status-expected", "확정": "pb-status-confirmed", "이월": "pb-status-rolled" };

  function renderPbEvents() {
    var resolved = loadResolvedEvents();
    pbEventListEl.innerHTML = "";

    PB_EVENTS.forEach(function (evt) {
      var isResolved = resolved.indexOf(evt.id) !== -1;

      var card = document.createElement("div");
      card.className = "pb-event-card" + (isResolved ? " pb-event-resolved" : "");

      var head = document.createElement("div");
      head.className = "pb-event-head";
      var status = document.createElement("span");
      status.className = "pb-event-status " + (STATUS_CLASS[evt.status] || "");
      status.textContent = evt.status;
      var customer = document.createElement("span");
      customer.className = "pb-event-customer";
      customer.textContent = evt.customer + " 고객";
      head.appendChild(status);
      head.appendChild(customer);
      if (isResolved) {
        var doneTag = document.createElement("span");
        doneTag.className = "pb-event-done-tag";
        doneTag.textContent = "처리완료";
        head.appendChild(doneTag);
      }

      var product = document.createElement("p");
      product.className = "pb-event-product";
      product.textContent = evt.product;

      var detail = document.createElement("p");
      detail.className = "pb-event-detail";
      detail.textContent = evt.detail;

      card.appendChild(head);
      card.appendChild(product);
      card.appendChild(detail);

      if (evt.draft) {
        var draftBox = document.createElement("pre");
        draftBox.className = "pb-draft-box hidden";
        draftBox.textContent = evt.draft;

        var actions = document.createElement("div");
        actions.className = "pb-event-actions";

        var toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "btn-outline";
        toggleBtn.textContent = "제안 초안 보기";
        toggleBtn.addEventListener("click", function () {
          draftBox.classList.toggle("hidden");
          toggleBtn.textContent = draftBox.classList.contains("hidden") ? "제안 초안 보기" : "초안 닫기";
        });

        var resolveBtn = document.createElement("button");
        resolveBtn.type = "button";
        resolveBtn.className = "btn-primary pb-resolve-btn";
        resolveBtn.textContent = isResolved ? "처리완료" : "전화 완료 · 처리완료로 표시";
        resolveBtn.disabled = isResolved;
        resolveBtn.addEventListener("click", function () {
          markEventResolved(evt.id);
          renderPbEvents();
        });

        actions.appendChild(toggleBtn);
        actions.appendChild(resolveBtn);
        card.appendChild(actions);
        card.appendChild(draftBox);
      }

      pbEventListEl.appendChild(card);
    });
  }

  // ---- 투자자 성향 ----

  var PROFILE_KEY = "d96_investor_profile";
  var profileScaleEl = document.getElementById("profile-scale");
  var profileStatusEl = document.getElementById("profile-status");

  function loadProfile() {
    var raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function renderProfile() {
    var saved = loadProfile();
    var buttons = profileScaleEl.querySelectorAll(".d96-scale-btn");
    buttons.forEach(function (btn) {
      btn.classList.toggle("active", !!saved && saved.value === btn.dataset.value);
    });
    profileStatusEl.textContent = saved
      ? "선택함: " + saved.value + " (" + saved.savedAt + " 저장)"
      : "아직 선택하지 않았습니다.";
  }

  profileScaleEl.querySelectorAll(".d96-scale-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        value: btn.dataset.value,
        savedAt: formatDate(new Date())
      }));
      renderProfile();
    });
  });

  // ---- 상속/증여 ----

  var INHERITANCE_KEY = "d96_inheritance_note";
  var inheritanceForm = document.getElementById("inheritance-form");
  var inheritanceInput = document.getElementById("inheritance-input");
  var inheritanceStatusEl = document.getElementById("inheritance-status");

  function loadInheritance() {
    var raw = localStorage.getItem(INHERITANCE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function renderInheritance() {
    var saved = loadInheritance();
    inheritanceStatusEl.textContent = saved
      ? "저장됨: " + saved.savedAt
      : "아직 입력하지 않았습니다.";
  }

  inheritanceForm.addEventListener("submit", function (e) {
    e.preventDefault();
    localStorage.setItem(INHERITANCE_KEY, JSON.stringify({
      text: inheritanceInput.value.trim(),
      savedAt: formatDate(new Date())
    }));
    renderInheritance();
  });

  // ---- 자산 구조 ----

  var ASSET_KEY = "d96_asset_structure";
  var ASSET_FIELDS = [
    { id: "asset-domestic-stock", label: "국내주식", tint: "d96-tint-sky" },
    { id: "asset-foreign-stock", label: "해외주식", tint: "d96-tint-salmon" },
    { id: "asset-bond", label: "채권", tint: "d96-tint-periwinkle" },
    { id: "asset-cash", label: "예금/현금", tint: "d96-tint-lime" },
    { id: "asset-fund", label: "펀드/기타", tint: "d96-tint-steel" }
  ];

  var assetForm = document.getElementById("asset-form");
  var assetTotalEl = document.getElementById("asset-total-display");
  var assetBarEl = document.getElementById("asset-bar");
  var assetListEl = document.getElementById("asset-list");
  var assetStatusEl = document.getElementById("asset-status");

  function loadAssets() {
    var raw = localStorage.getItem(ASSET_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function formatWon(won) {
    return Math.round(won).toLocaleString("ko-KR");
  }

  function renderAssets() {
    var saved = loadAssets();
    assetBarEl.innerHTML = "";
    assetListEl.innerHTML = "";

    if (!saved) {
      assetTotalEl.textContent = "총 자산 0원";
      assetStatusEl.textContent = "아직 입력하지 않았습니다.";
      return;
    }

    var total = 0;
    ASSET_FIELDS.forEach(function (f) { total += (saved[f.id] || 0); });
    assetTotalEl.textContent = "총 자산 " + formatWon(total) + "원";

    ASSET_FIELDS.forEach(function (f) {
      var val = saved[f.id] || 0;
      var pct = total > 0 ? Math.round((val / total) * 100) : 0;

      if (val > 0) {
        var seg = document.createElement("span");
        seg.className = f.tint;
        seg.style.width = pct + "%";
        assetBarEl.appendChild(seg);
      }

      var li = document.createElement("li");
      var swatch = document.createElement("span");
      swatch.className = "d96-swatch " + f.tint;
      var name = document.createElement("span");
      name.className = "d96-asset-name";
      name.textContent = f.label;
      var pctEl = document.createElement("span");
      pctEl.className = "d96-asset-pct";
      pctEl.textContent = pct + "%";
      var amtEl = document.createElement("span");
      amtEl.className = "d96-asset-amt";
      amtEl.textContent = formatWon(val) + "원";
      li.appendChild(swatch);
      li.appendChild(name);
      li.appendChild(pctEl);
      li.appendChild(amtEl);
      assetListEl.appendChild(li);
    });

    assetStatusEl.textContent = "저장됨: " + saved.savedAt;
  }

  assetForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {};
    ASSET_FIELDS.forEach(function (f) {
      data[f.id] = parseInt(document.getElementById(f.id).value, 10) || 0;
    });
    data.savedAt = formatDate(new Date());
    localStorage.setItem(ASSET_KEY, JSON.stringify(data));
    renderAssets();
  });

  function initDashboard() {
    var savedAssets = loadAssets();
    if (savedAssets) {
      ASSET_FIELDS.forEach(function (f) {
        if (savedAssets[f.id] != null) {
          document.getElementById(f.id).value = savedAssets[f.id];
        }
      });
    }
    var savedInheritance = loadInheritance();
    if (savedInheritance) {
      inheritanceInput.value = savedInheritance.text;
    }
    renderProfile();
    renderInheritance();
    renderAssets();
  }

  function init() {
    renderRegionList();
    var existing = loadState();
    if (existing) {
      currentRegion = existing.branchRegion || null;
      showStatusScreen(existing);
    } else {
      showScreen("regions");
    }
    initDashboard();
  }

  init();
})();
