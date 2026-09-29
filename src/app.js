import {
  clamp,
  createInitialState,
  formatGameTime,
  loadState,
  resetState,
  saveState,
} from './state.js';
import { PAGE_META, PAGE_ORDER, getPageMeta } from './router.js';
import {
  BOARD_FILTERS,
  BOARD_POSTS,
  REPLIES,
  STATIC_LOGS,
  TICKETS,
} from './data/content.js';

const root = document.querySelector('#game-root');
let state = loadState();
let activePopup = null;
let startError = '';
let audioContext = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isComplete(ticketId) {
  return state.completedTickets.includes(ticketId);
}

function clampState() {
  state.siteIntegrity = clamp(Number(state.siteIntegrity) || 0, 0, 100);
  state.visitorCount = Math.max(0, Math.floor(Number(state.visitorCount) || 0));
  state.recordRecovery = clamp(Number(state.recordRecovery) || 0, 0, 100);
  state.recognitionLevel = clamp(Number(state.recognitionLevel) || 0, 0, 4);
  state.intrusionLevel = clamp(Number(state.intrusionLevel) || 0, 0, 8);
  state.fearStage = clamp(Number(state.fearStage) || 0, 0, 4);
  state.currentTimeMinutes = clamp(Number(state.currentTimeMinutes) || 13, 13, 193);
  state.refreshStreak = Math.max(0, Math.floor(Number(state.refreshStreak) || 0));
  state.watchRecoveryStreak = Math.max(0, Math.floor(Number(state.watchRecoveryStreak) || 0));
  if (!Array.isArray(state.triggeredEvents)) state.triggeredEvents = [];
  if (!Array.isArray(state.eventLog)) state.eventLog = [];
  if (!state.postStates || typeof state.postStates !== 'object') state.postStates = {};
}

function addLog(text, historicalTime = null) {
  state.logs.unshift({
    time: historicalTime || formatGameTime(state.currentTimeMinutes),
    text,
  });
  state.logs = state.logs.slice(0, 80);
}

function advanceTime(minutes = 2) {
  state.currentTimeMinutes = clamp(state.currentTimeMinutes + minutes, 13, 193);
}

function changeIntegrity(delta) {
  state.siteIntegrity = clamp(state.siteIntegrity + delta, 0, 100);
}

function changeRecovery(delta) {
  state.recordRecovery = clamp(state.recordRecovery + delta, 0, 100);
}

function changeRecognition(delta) {
  state.recognitionLevel = clamp(state.recognitionLevel + delta, 0, 4);
}

function changeIntrusion(delta) {
  state.intrusionLevel = clamp(state.intrusionLevel + delta, 0, 8);
}

function recordEvent(key, text) {
  if (state.triggeredEvents.includes(key)) return false;
  state.triggeredEvents.push(key);
  state.eventLog.unshift({ key, time: formatGameTime(state.currentTimeMinutes), text });
  state.eventLog = state.eventLog.slice(0, 40);
  addLog(text);
  return true;
}

function deriveFearStage() {
  const lateSession = state.currentTimeMinutes >= 120;
  const damagedSite = state.siteIntegrity <= 72;
  if (state.intrusionLevel >= 4 || state.flags.fakeRedScreenSeen || (lateSession && damagedSite)) return 4;
  if (state.intrusionLevel >= 3 || state.flags.fakeBsodSeen || state.flags.watch666Recovered || (lateSession && state.completedTickets.length >= 3)) return 3;
  if (state.intrusionLevel >= 2 || state.completedTickets.length >= 2 || damagedSite) return 2;
  if (state.completedTickets.length >= 1 || state.revealedClues.length >= 2) return 1;
  return 0;
}

function triggerHorrorEvent(type, message, extra = {}) {
  if (state.activeScreenEvent || state.triggeredEvents.includes(type)) return false;
  recordEvent(type, message);
  state.activeScreenEvent = {
    type,
    startedAt: formatGameTime(state.currentTimeMinutes),
    closed: [],
    ...extra,
  };
  saveState(state);
  if (type === 'popup_cascade_01') playFx('cascade');
  if (type === 'fake_bsod') {
    playFx('signal');
    window.setTimeout(() => {
      if (state.activeScreenEvent?.type === 'fake_bsod') playFx('bsod');
    }, 160);
  }
  if (type === 'fake_redscreen') playFx('redscreen');
  if (type === 'watch_666') playFx('watch');
  return true;
}

function resolveHorrorEvent(result = 'recovered') {
  const event = state.activeScreenEvent;
  if (!event) return;
  if (event.type === 'fake_bsod') state.flags.fakeBsodSeen = true;
  if (event.type === 'fake_redscreen') state.flags.fakeRedScreenSeen = true;
  if (event.type === 'watch_666') {
    state.flags.watch666Recovered = true;
    state.watchRecoveryStreak = 0;
  }
  if (event.type === 'popup_cascade_01') state.flags.popupCascadeSeen = true;
  addLog(`공포 이벤트 종료: ${event.type} / ${result}`);
  state.activeScreenEvent = null;
  state.lastSafePage = state.currentPage;
  saveState(state);
  playFx(result === 'forced' ? 'error' : 'success');
}

function maybeTriggerHorrorEvents() {
  if (!state.started || state.ending || state.activeScreenEvent || activePopup) return;
  state.fearStage = deriveFearStage();

  if (
    state.currentPage === 'notices' &&
    state.completedTickets.length >= 2 &&
    state.refreshStreak >= 1 &&
    !state.triggeredEvents.includes('popup_cascade_01')
  ) {
    triggerHorrorEvent(
      'popup_cascade_01',
      '공지 복구 직후 여러 개의 IE 자식 창이 동시에 열렸습니다.',
      { windowCount: state.effectsReduced ? 3 : 5 },
    );
    return;
  }

  if (
    state.currentPage === 'board' &&
    state.completedTickets.length >= 3 &&
    state.refreshStreak >= 6 &&
    !state.triggeredEvents.includes('watch_666')
  ) {
    triggerHorrorEvent(
      'watch_666',
      '같은 게시판 문서를 여섯 번째로 새로고침하자 제목과 작성자가 변질되었습니다.',
      { watchRecoveryStreak: 0 },
    );
    return;
  }

  if (
    state.completedTickets.length >= 4 &&
    state.intrusionLevel >= 2 &&
    !state.triggeredEvents.includes('fake_bsod')
  ) {
    triggerHorrorEvent(
      'fake_bsod',
      '기록 충돌로 가짜 블루스크린이 표시되었습니다.',
    );
    return;
  }

  if (
    state.currentPage === 'admin' &&
    state.completedTickets.length >= 4 &&
    !state.triggeredEvents.includes('fake_redscreen')
  ) {
    triggerHorrorEvent(
      'fake_redscreen',
      '관리자 세션과 현재 유지보수 세션의 기록이 충돌했습니다.',
    );
  }
}

function completeTicket(ticketId) {
  if (isComplete(ticketId)) return;
  const ticket = TICKETS.find((item) => item.id === ticketId);
  state.completedTickets.push(ticketId);
  advanceTime(ticketId === 'ticket-05' ? 5 : 8);
  addLog(`티켓 ${ticket.number} 완료: ${ticket.title}`);
  if (state.completedTickets.length === TICKETS.length) {
    state.currentTimeMinutes = 193;
    addLog('모든 유지보수 티켓이 처리되었습니다. 최종 세션을 확인하십시오.');
  }
}

function syncDerivedState() {
  if (
    state.started &&
    state.currentPage === 'admin' &&
    isComplete('ticket-03') &&
    !state.flags.guestTracked
  ) {
    state.flags.guestTracked = true;
    changeRecovery(10);
    addLog('관리자 로그에서 guest_0001의 방문 경로를 확인했습니다.');
    saveState(state);
  }
  state.fearStage = deriveFearStage();
  maybeTriggerHorrorEvents();
}

function canUseExit() {
  return (
    state.recordRecovery >= 45 &&
    state.flags.guestTracked &&
    !state.flags.criticalDeletion &&
    state.siteIntegrity >= 55
  );
}

function canProcessFinalTicket() {
  return TICKETS.slice(0, 4).every((ticket) => isComplete(ticket.id));
}

function siteStatus() {
  if (state.siteIntegrity >= 76) return { label: '정상', className: 'status-ok' };
  if (state.siteIntegrity >= 46) return { label: '불안정', className: 'status-warning' };
  return { label: '접속 오류', className: 'status-danger' };
}

function horrorIntensity() {
  if (state.fearStage >= 3 || state.siteIntegrity < 35 || state.recognitionLevel >= 4) return 'high';
  if (state.fearStage >= 1 || state.completedTickets.length >= 3 || state.siteIntegrity < 70) return 'medium';
  return 'low';
}

function visitorLabel() {
  if (state.flags.newAdmin || state.recognitionLevel >= 3) return '당신 외 1명';
  return `${state.visitorCount}명`;
}

function currentPath() {
  return getPageMeta(state.currentPage).path;
}

function playFx(kind = 'click') {
  if (state.muted || !window.AudioContext) return;
  try {
    audioContext ||= new window.AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const settings = {
      click: { frequency: 560, duration: 0.035, type: 'square', volume: 0.035 },
      error: { frequency: 115, duration: 0.16, type: 'sawtooth', volume: 0.045 },
      static: { frequency: 72, duration: 0.24, type: 'triangle', volume: 0.026 },
      success: { frequency: 720, duration: 0.09, type: 'sine', volume: 0.04 },
      startup: { frequency: 96, duration: 0.22, type: 'sine', volume: 0.03 },
      transition: { frequency: 210, duration: 0.08, type: 'triangle', volume: 0.024 },
      hdd: { frequency: 52, duration: 0.25, type: 'sawtooth', volume: 0.018 },
      signal: { frequency: 740, duration: 0.18, type: 'square', volume: 0.018 },
      cascade: { frequency: 145, duration: 0.22, type: 'square', volume: 0.042 },
      bsod: { frequency: 82, duration: 0.38, type: 'sawtooth', volume: 0.035 },
      redscreen: { frequency: 48, duration: 0.5, type: 'triangle', volume: 0.032 },
      watch: { frequency: 310, duration: 0.3, type: 'square', volume: 0.024 },
    }[kind] || { frequency: 440, duration: 0.05, type: 'square', volume: 0.03 };
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    if (kind === 'error') oscillator.frequency.exponentialRampToValueAtTime(60, now + settings.duration);
    if (kind === 'success') oscillator.frequency.exponentialRampToValueAtTime(980, now + settings.duration);
    if (kind === 'startup') oscillator.frequency.exponentialRampToValueAtTime(180, now + settings.duration);
    if (kind === 'transition') oscillator.frequency.exponentialRampToValueAtTime(120, now + settings.duration);
    if (kind === 'hdd') oscillator.frequency.exponentialRampToValueAtTime(38, now + settings.duration);
    if (kind === 'signal') oscillator.frequency.exponentialRampToValueAtTime(420, now + settings.duration);
    const volume = state.effectsReduced ? settings.volume * 0.45 : settings.volume;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);
  } catch {
    // Audio is optional and must never block the game.
  }
}

function finishAction(title, body, tone = 'neutral') {
  activePopup = { title, body, tone };
  saveState(state);
  render();
}

function navigateTo(page) {
  if (!PAGE_META[page] || page === state.currentPage || state.ending || state.activeScreenEvent) return;
  state.history.push(state.currentPage);
  state.forward = [];
  state.lastSafePage = state.currentPage;
  state.refreshStreak = 0;
  state.lastRefreshPage = '';
  state.currentPage = page;
  advanceTime(2);
  addLog(`페이지 이동: ${PAGE_META[page].label}`);
  playFx('transition');
  if (
    state.completedTickets.length >= 2 &&
    state.flags.ghostPopupClosed &&
    !state.flags.ghostPopupReappeared
  ) {
    state.flags.ghostPopupClosed = false;
    state.flags.ghostPopupReappeared = true;
    recordEvent('ghost-popup-reappeared', '닫은 공지 팝업이 다른 페이지에서 다시 나타났습니다.');
    playFx('signal');
  }
  saveState(state);
  render();
}

function goBack() {
  if (state.ending || state.activeScreenEvent || !state.history.length) return;
  state.forward.unshift(state.currentPage);
  state.currentPage = state.history.pop();
  state.refreshStreak = 0;
  state.lastRefreshPage = '';
  advanceTime(1);
  addLog(`뒤로 이동: ${PAGE_META[state.currentPage].label}`);
  saveState(state);
  render();
}

function goForward() {
  if (state.ending || state.activeScreenEvent || !state.forward.length) return;
  state.history.push(state.currentPage);
  state.currentPage = state.forward.shift();
  state.refreshStreak = 0;
  state.lastRefreshPage = '';
  advanceTime(1);
  addLog(`앞으로 이동: ${PAGE_META[state.currentPage].label}`);
  saveState(state);
  render();
}

function refreshPage() {
  if (state.ending) return;
  if (state.activeScreenEvent && state.activeScreenEvent.type !== 'watch_666') return;
  advanceTime(1);
  addLog(`새로고침: ${PAGE_META[state.currentPage].label}`);
  if (state.activeScreenEvent?.type === 'watch_666') {
    state.watchRecoveryStreak += 1;
    addLog(`오염 문서 복구 새로고침 ${state.watchRecoveryStreak}/3`);
    if (state.watchRecoveryStreak >= 3) {
      resolveHorrorEvent('normal refresh recovery');
      state.refreshStreak = 0;
      saveState(state);
      render();
      return;
    }
  } else {
    state.refreshStreak = state.lastRefreshPage === state.currentPage ? state.refreshStreak + 1 : 1;
    state.lastRefreshPage = state.currentPage;
    state.lastSafePage = state.currentPage;
    if (state.currentPage === 'home') recordEvent('refresh-counter', '방문자 카운터가 새로고침 중 깜빡였습니다.');
    if (state.currentPage === 'board' && state.refreshStreak < 6) changeIntrusion(1);
  }
  playFx('static');
  saveState(state);
  render();
}

function revealClue(clueId, text) {
  if (!state.revealedClues.includes(clueId)) {
    state.revealedClues.push(clueId);
    changeRecovery(3);
    addLog(`자료 확인: ${text}`);
    playFx('hdd');
    saveState(state);
  }
  render();
}

function openBoardPost(postId) {
  const post = BOARD_POSTS.find((item) => item.id === postId);
  if (!post) return;
  const current = getPostState(postId);
  state.postStates[postId] = { ...current, opened: true, status: current.status || 'opened' };
  state.revealedClues = state.revealedClues.includes(`board-${postId}`)
    ? state.revealedClues
    : [...state.revealedClues, `board-${postId}`];
  changeRecovery(2);
  if (post.category === 'external' && postId !== 'POST-GUEST-0001' && !current.opened) changeIntrusion(1);
  addLog(`게시글 자료 확인: ${postId} / ${post.author}`);
  if (postId === 'POST-UNKNOWN-13') addLog('외부 게시글의 접속 위치가 주민 목록과 일치하지 않습니다.');
  saveState(state);
  render();
}

function applyBoardPostChoice(postId, choice) {
  const post = BOARD_POSTS.find((item) => item.id === postId);
  if (!post || post.category !== 'external' || postId === 'POST-GUEST-0001') return;
  const current = getPostState(postId);
  state.postStates[postId] = { ...current, opened: true, status: choice === 'preserve' ? 'preserved' : choice === 'block' ? 'blocked' : 'left' };
  if (choice === 'preserve') {
    state.flags.externalPostPreserved = true;
    changeRecovery(8);
    changeIntrusion(1);
    addLog(`외부인 게시글을 보존했습니다: ${postId}`);
    popupNotice('외부 기록 보존', '작성자와 접속 위치를 관리자 로그에 복사했습니다. 기록은 남았지만, 외부 접속이 현재 세션을 인식했습니다.', 'warning');
    return;
  }
  if (choice === 'block') {
    state.flags.externalPostBlocked = true;
    changeIntegrity(-8);
    changeIntrusion(2);
    addLog(`외부인 게시글 접속을 차단했습니다: ${postId}`);
    popupNotice('외부 접속 차단', '게시글은 목록에서 사라졌지만 하단 상태 표시줄에 guest_0001 문자열이 남았습니다.', 'danger');
    return;
  }
  addLog(`외부인 게시글에서 이탈했습니다: ${postId}`);
  advanceTime(1);
  saveState(state);
  render();
}

function popupNotice(title, body, tone = 'neutral') {
  activePopup = { title, body, tone };
  saveState(state);
  render();
}

function closeCascadeWindow(index) {
  const event = state.activeScreenEvent;
  if (!event || event.type !== 'popup_cascade_01') return;
  const closed = Array.isArray(event.closed) ? [...event.closed] : [];
  if (!closed.includes(index)) closed.push(index);
  state.activeScreenEvent = { ...event, closed };
  addLog(`IE 자식 창 닫기: ${index + 1}/${event.windowCount}`);
  if (closed.length >= event.windowCount) {
    resolveHorrorEvent('all child windows closed');
    render();
  } else {
    saveState(state);
    render();
  }
}

function chooseRedScreen(choice) {
  if (!state.activeScreenEvent || state.activeScreenEvent.type !== 'fake_redscreen') return;
  if (choice === 'preserve') {
    changeRecovery(6);
    changeIntrusion(-1);
    addLog('레드스크린에서 현재 세션과 이전 세션의 기록을 모두 보존했습니다.');
    resolveHorrorEvent('session preserved');
    render();
    return;
  }
  state.flags.criticalDeletion = true;
  changeIntegrity(-12);
  changeRecovery(-8);
  changeIntrusion(1);
  addLog('레드스크린에서 이전 세션을 강제 종료하는 선택을 했습니다.');
  resolveHorrorEvent('forced session termination');
  render();
}

function recoverHorrorEvent(result = 'recovered') {
  if (!state.activeScreenEvent) return;
  resolveHorrorEvent(result);
  render();
}

function applyChoice(ticketId, choice) {
  if (isComplete(ticketId)) return;

  let popup = { title: '유지보수 결과', body: '작업 결과가 저장되었습니다.', tone: 'neutral' };

  if (ticketId === 'ticket-01') {
    if (choice === 'latest') {
      state.flags.bannerRestored = true;
      changeRecovery(10);
      addLog('banner_new.jpg를 복구했습니다.');
      popup = { title: '이미지 복구 완료', body: '최신 배너가 표시됩니다. 이미지 하단의 날짜가 2011년으로 돌아왔습니다.', tone: 'success' };
    } else if (choice === 'old') {
      state.flags.bannerRestored = true;
      state.flags.bannerOld = true;
      state.visitorCount = Math.max(1, state.visitorCount);
      changeRecovery(18);
      changeRecognition(1);
      changeIntrusion(1);
      recordEvent('old-banner-window', '구형 배너의 창문 개수가 복구 전보다 하나 많았습니다.');
      popup = { title: '구형 배너 복구 완료', body: '이미지가 표시되었습니다. 잠시 방문자 카운터가 1을 가리켰습니다.', tone: 'warning' };
    } else if (choice === 'hide') {
      state.flags.bannerHidden = true;
      changeIntegrity(-5);
      changeRecovery(4);
      addLog('메인 배너를 사용자 화면에서 숨겼습니다.');
      popup = { title: '배너 숨김 완료', body: '메인 배너 영역이 비어 있습니다. 이미지가 해결된 것은 아닙니다.', tone: 'neutral' };
    } else if (choice === 'delete') {
      state.flags.bannerDeleted = true;
      state.flags.criticalDeletion = true;
      changeIntegrity(-18);
      changeRecovery(-8);
      changeIntrusion(2);
      addLog('banner 관련 파일을 삭제했습니다. 백업 연결도 함께 끊겼습니다.');
      popup = { title: '파일 삭제 완료', body: '관련 백업 경로를 찾을 수 없습니다. 사이트 안정도가 감소했습니다.', tone: 'danger' };
      playFx('error');
    }
    completeTicket(ticketId);
    finishAction(popup.title, popup.body, popup.tone);
    return;
  }

  if (ticketId === 'ticket-02') {
    if (choice === 'restore') {
      state.flags.noticeRecovered = true;
      changeRecovery(25);
      changeIntrusion(1);
      recordEvent('notice-added-line', '복구된 공지사항 본문에 마지막 줄이 추가되었습니다.');
      popup = { title: '공지사항 복구 완료', body: '삭제된 공지사항의 본문과 마지막 문장이 복구되었습니다.', tone: 'warning' };
    } else if (choice === 'hide') {
      state.flags.noticeHidden = true;
      changeIntegrity(-5);
      changeRecovery(5);
      changeIntrusion(1);
      addLog('삭제된 공지사항을 사용자 화면에서 숨겼습니다.');
      popup = { title: '공지사항 숨김 완료', body: '목록에서는 사라졌지만 캐시와 백업 기록은 남아 있습니다.', tone: 'neutral' };
    } else if (choice === 'delete') {
      state.flags.noticeDeleted = true;
      state.flags.criticalDeletion = true;
      changeIntegrity(-20);
      changeRecovery(-15);
      changeIntrusion(2);
      addLog('삭제된 공지사항과 관련 캐시를 영구 삭제했습니다.');
      popup = { title: '공지사항 삭제 완료', body: '관련 기록을 복원할 수 없습니다. 작업 로그 일부가 비어 있습니다.', tone: 'danger' };
      playFx('error');
    }
    completeTicket(ticketId);
    finishAction(popup.title, popup.body, popup.tone);
    return;
  }

  if (ticketId === 'ticket-03') {
    if (choice === 'approve') {
      state.flags.guestReservationApproved = true;
      state.visitorCount = Math.max(1, state.visitorCount);
      changeRecognition(1);
      changeRecovery(3);
      changeIntrusion(1);
      recordEvent('guest-entered', '방문 예약 상태가 승인으로 변경되었습니다.');
      popup = { title: '방문 예약 승인', body: '방문자 수가 1명으로 변경되었습니다. 입장 위치는 확인되지 않습니다.', tone: 'warning' };
    } else if (choice === 'cancel') {
      state.flags.guestReservationCanceled = true;
      changeIntegrity(-2);
      changeRecovery(6);
      changeIntrusion(1);
      addLog('guest_0001의 방문 예약을 취소했습니다.');
      popup = { title: '방문 예약 취소', body: '예약이 취소되었습니다. 민원 게시판에 새 글이 등록되었습니다.', tone: 'neutral' };
    } else if (choice === 'hide') {
      state.flags.guestReservationHidden = true;
      changeIntegrity(-4);
      changeRecovery(6);
      changeIntrusion(2);
      recordEvent('guest-hidden', '방문 예약을 숨겼지만 모든 페이지 하단에서 계정명이 발견되었습니다.');
      popup = { title: '방문 예약 숨김', body: '예약은 목록에서 사라졌지만 페이지 하단에 계정명이 남았습니다.', tone: 'warning' };
    }
    completeTicket(ticketId);
    finishAction(popup.title, popup.body, popup.tone);
    return;
  }

  if (ticketId === 'ticket-04') {
    const reply = REPLIES.find((item) => item.id === choice);
    state.flags.guestReply = reply?.label || choice;
    changeRecognition(1);
    changeRecovery(8);
    changeIntrusion(1);
    addLog(`민원 답변 등록: ${state.flags.guestReply}`);
    popup = {
      title: '답변 등록 완료',
      body: `작성자가 ${state.playerName}으로 표시되었습니다. 작성 시각은 2011.11.04 03:13으로 저장됩니다.`,
      tone: choice === 'leaving' ? 'danger' : 'warning',
    };
    if (choice === 'leaving') playFx('static');
    completeTicket(ticketId);
    finishAction(popup.title, popup.body, popup.tone);
    return;
  }

  if (ticketId === 'ticket-05') {
    if (!canProcessFinalTicket()) {
      finishAction('최종 세션 잠금', '먼저 티켓 1~4의 오류를 모두 처리하십시오. 아직 확인하지 않은 페이지가 있습니다.', 'warning');
      return;
    }
    if (choice === 'new-admin' && state.recognitionLevel < 3) {
      finishAction('권한 부족', '현재 세션은 새 관리자를 등록할 권한이 없습니다. 먼저 이전 기록을 확인하십시오.', 'danger');
      return;
    }
    if (choice === 'exit' && !canUseExit()) {
      finishAction('퇴실 처리 불가', '방문 기록이 충분히 복구되지 않았거나, 삭제된 기록이 있습니다.', 'danger');
      return;
    }

    if (choice === 'logout') {
      state.flags.sessionLoggedOut = true;
      completeTicket(ticketId);
      state.ending = canUseExit() ? 'C' : 'A';
      popup = { title: '세션 로그아웃', body: state.ending === 'C' ? '방문자 세션도 함께 종료할 수 있습니다.' : '관리자 세션은 종료되었지만 일부 기록이 남아 있습니다.', tone: state.ending === 'C' ? 'success' : 'warning' };
    } else if (choice === 'force-delete') {
      state.flags.sessionDeleted = true;
      state.flags.criticalDeletion = true;
      changeIntegrity(-20);
      changeRecovery(-20);
      changeIntrusion(2);
      completeTicket(ticketId);
      state.ending = 'A';
      popup = { title: '세션 강제 삭제', body: '활성 세션을 삭제했습니다. 삭제된 기록은 복구할 수 없습니다.', tone: 'danger' };
      playFx('error');
    } else if (choice === 'new-admin') {
      state.flags.newAdmin = true;
      changeRecognition(1);
      changeIntrusion(1);
      completeTicket(ticketId);
      state.ending = 'B';
      popup = { title: '새 관리자 등록', body: `${state.playerName} 계정이 새 관리자 목록에 추가되었습니다.`, tone: 'warning' };
    } else if (choice === 'exit') {
      state.flags.exitFound = true;
      state.flags.sessionLoggedOut = true;
      completeTicket(ticketId);
      state.ending = 'C';
      popup = { title: '퇴실 처리 완료', body: '방문자 1명과 관리자 세션 1개가 종료되었습니다.', tone: 'success' };
    }
    finishAction(popup.title, popup.body, popup.tone);
  }
}

function renderStart() {
  return `
    <main class="start-screen" aria-labelledby="start-title">
      <section class="browser-window start-card">
        <div class="browser-titlebar">
          <span class="browser-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span>해오름아파트 입주민 홈페이지 - Microsoft Internet Explorer</span></span>
          <div class="browser-titlebar__controls" aria-hidden="true">
            <span class="window-control">_</span><span class="window-control">□</span><span class="window-control">×</span>
          </div>
        </div>
        <div class="browser-menubar" role="menubar" aria-label="브라우저 메뉴">
          <span>파일(F)</span><span>편집(E)</span><span>보기(V)</span><span>즐겨찾기(A)</span><span>도구(T)</span><span>도움말(H)</span>
        </div>
        <div class="browser-toolbar browser-toolbar--start" aria-hidden="true">
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--back"></span><span>뒤로</span></span>
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--forward"></span><span>앞으로</span></span>
          <span class="toolbar-divider"></span>
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--stop"></span><span>중지</span></span>
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--refresh"></span><span>새로 고침</span></span>
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--home"></span><span>홈</span></span>
          <span class="toolbar-divider"></span>
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--search"></span><span>검색</span></span>
          <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--favorites"></span><span>즐겨찾기</span></span>
        </div>
        <div class="address-row">
          <span class="address-label">주소</span><span class="address-icon" aria-hidden="true"></span>
          <div class="address-field"><span>http://haeorum-apt.com/maintenance/start.asp</span><span class="address-dropdown" aria-hidden="true">▼</span></div>
          <span class="address-go">이동</span><span class="address-connect">연결 »</span>
        </div>
        <div class="browser-linksbar"><span class="linksbar-label">연결</span><span class="linksbar-link">해오름아파트</span><span class="linksbar-link">관리사무소</span><span class="linksbar-link">입주민 게시판</span><span class="linksbar-spacer"></span><span class="linksbar-status">인터넷</span></div>
        <div class="start-card__body">
          <p class="muted mono">http://haeorum-apt.com/maintenance/start.asp</p>
          <h1 id="start-title">404: 존재하지 않는 방문자</h1>
          <p>해오름아파트 입주민 홈페이지의 야간 유지보수 요청입니다.</p>
          <div class="start-card__alert">
            <strong>[긴급 유지보수]</strong><br />
            사이트 오류 5건을 03:13 전까지 처리하십시오.<br />
            작업 중 로그아웃하지 마십시오.<br />
            현재 접속자: 0명
          </div>
          <p class="muted">이름은 게임 안에서 사용할 작업자명입니다. 실제 개인정보를 입력하지 마십시오.</p>
          <div class="start-form">
            <label for="player-name">작업자 이름</label>
            <input id="player-name" name="player-name" maxlength="20" autocomplete="off" value="${escapeHtml(state.playerName)}" placeholder="예: 김영수" />
            <small>최대 20자 / 게임 안의 기록과 답변에 표시됩니다.</small>
            <div class="error-message" role="alert">${escapeHtml(startError)}</div>
            <div class="button-row button-row--right">
              <button class="choice-button" data-action="start-game" type="button">유지보수 시작</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderTicketList() {
  return `
    <ul class="ticket-list" aria-label="유지보수 티켓 목록">
      ${TICKETS.map((ticket) => {
        const done = isComplete(ticket.id);
        return `
          <li class="ticket-item">
            <span class="ticket-number">#${String(ticket.number).padStart(2, '0')}</span>
            <span>${escapeHtml(ticket.title)}</span>
            <span class="ticket-status ${done ? 'ticket-status--done' : ''}">${done ? '처리 완료' : '대기 중'}</span>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

function renderBanner() {
  if (state.flags.bannerDeleted) {
    return `<div class="broken-image inspectable event-flicker" data-inspect="IMG_04 / missing / deleted"><img class="broken-image__icon" src="./public/images/corrupted-document-icon.png" alt="" aria-hidden="true" /><span>banner_final.gif - 파일을 찾을 수 없습니다.</span></div>`;
  }
  if (state.flags.bannerHidden) {
    return `<div class="broken-image inspectable" data-inspect="IMG_04 / display:none"><img class="broken-image__icon" src="./public/images/corrupted-document-icon.png" alt="" aria-hidden="true" /><span>[배너 영역이 숨겨져 있습니다]</span></div>`;
  }
  if (state.flags.bannerOld) {
    return `
      <figure class="asset-banner asset-banner--old inspectable" data-inspect="IMG_04 / apartment-banner-old.png">
        <img src="./public/images/apartment-banner-old.png" alt="해오름아파트 구형 야간 전경 배너" />
        <figcaption><strong>HAEROUM APT.</strong> · 2004년부터 함께 사는 아파트 · 아직 나가지 않은 세대는 확인하지 마십시오.</figcaption>
      </figure>
    `;
  }
  if (state.flags.bannerRestored) {
    return `
      <figure class="asset-banner inspectable" data-inspect="IMG_04 / apartment-banner-new.png">
        <img src="./public/images/apartment-banner-new.png" alt="해오름아파트 야간 전경 배너" />
        <figcaption><strong>해오름아파트</strong> · 안전하고 따뜻한 우리 동네, 관리사무소에서 알려드립니다.</figcaption>
      </figure>
    `;
  }
  return `<div class="broken-image inspectable" data-inspect="IMG_04 / banner_new.jpg"><img class="broken-image__icon" src="./public/images/corrupted-document-icon.png" alt="" aria-hidden="true" /><span>이미지를 표시할 수 없습니다. [banner_new.jpg]</span></div>`;
}

function renderHome() {
  const activeNotice = state.flags.noticeRecovered
    ? '<span class="danger-text">03:13 이후 복도에 사람이 보일 경우</span>'
    : '[삭제됨] 03:13 이후 복도에 사람이 보일 경우';
  return `
    <div class="page-heading">
      <h1>해오름아파트 입주민 홈페이지</h1>
      <p class="muted">마지막 업데이트: 2011.11.04 / 현재 접속자: <span class="mono">${escapeHtml(visitorLabel())}</span></p>
    </div>
    ${renderBanner()}
    ${renderBannerChoice()}
    <div class="old-panel inspectable" data-inspect="NOTICE_PREVIEW / index.htm">
      <div class="old-panel__title">공지사항 <span class="muted">(최근 글)</span></div>
      <div class="old-panel__body">
        <p><button class="text-link" data-action="nav" data-page="notices">${activeNotice}</button></p>
        <p class="muted">관리사무소 연락처 변경 안내 (2010.02.01)</p>
        <p class="muted">겨울철 수도 동파 예방 안내 (2009.12.15)</p>
      </div>
    </div>
    <h2>야간 유지보수 현황</h2>
    <p>오류를 하나씩 확인하고, 관련된 자료를 보존할지 숨길지 선택하십시오.</p>
    ${renderTicketList()}
    <div class="system-notice">
      <strong>작업 메모:</strong> 페이지의 주소, 파일명, 수정 날짜가 서로 일치하는지 확인하십시오.<br />
      <span class="muted">문의: webmaster@haeorum-apt.com (현재 응답하지 않음)</span>
    </div>
  `;
}

function renderBannerChoice() {
  if (isComplete('ticket-01')) {
    if (state.flags.bannerDeleted) return '<div class="system-notice danger-text">배너 파일이 삭제되었습니다. 관련 백업 연결도 끊겼습니다.</div>';
    if (state.flags.bannerHidden) return '<div class="system-notice">배너는 숨김 처리되었습니다. 이미지 파일은 남아 있습니다.</div>';
    return '<div class="system-notice">메인 배너 오류가 처리되었습니다. 변경된 창문 수와 방문자 카운터를 확인하십시오.</div>';
  }
  return `
    <div class="old-panel">
      <div class="old-panel__title">티켓 1 / 메인 배너 이미지 오류</div>
      <div class="old-panel__body">
        <ul class="file-list">
          <li class="inspectable" data-inspect="IMG_04 / banner_new.jpg">banner_new.jpg / 최근 수정 2011.11.04</li>
          <li class="inspectable" data-inspect="IMG_04 / banner_old.jpg">banner_old.jpg / 마지막 수정 2004.06.12 / ALT: 아직 나가지 않은 세대는 확인하지 마십시오.</li>
          <li class="inspectable" data-inspect="IMG_04 / banner_final.gif">banner_final.gif / 파일 상태: 손상됨</li>
        </ul>
        ${state.inspection ? '<figure class="asset-card asset-card--file-preview"><img src="./public/images/apartment-banner-final.png" alt="손상된 최종 배너의 마지막 프레임" /><figcaption>검사 모드 미리보기 / banner_final.gif 마지막 프레임</figcaption></figure>' : ''}
        <div class="choice-box">
          <div class="choice-box__title">복구 방법을 선택하십시오.</div>
          <div class="button-row">
            <button class="choice-button" data-action="choice" data-ticket="ticket-01" data-choice="latest">최신 배너 복구</button>
            <button class="choice-button choice-button--danger" data-action="choice" data-ticket="ticket-01" data-choice="old">구형 배너 복구</button>
            <button class="choice-button" data-action="choice" data-ticket="ticket-01" data-choice="hide">배너 숨김</button>
            <button class="choice-button choice-button--danger" data-action="choice" data-ticket="ticket-01" data-choice="delete">파일 삭제</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNotices() {
  const clueCache = state.revealedClues.includes('notice-cache');
  const clueBackup = state.revealedClues.includes('notice-backup');
  return `
    <h1>공지사항</h1>
    <p class="muted">해오름아파트 관리사무소 / 게시글 총 127건</p>
    <table class="content-table">
      <thead><tr><th>제목</th><th>작성자</th><th>등록일</th></tr></thead>
      <tbody>
        <tr><td><button class="text-link" data-action="reveal-clue" data-clue="notice-normal">관리사무소 연락처 변경 안내</button></td><td>관리사무소</td><td>2010.02.01</td></tr>
        <tr><td><button class="text-link" data-action="reveal-clue" data-clue="notice-old">겨울철 수도 동파 예방 안내</button></td><td>관리사무소</td><td>2009.12.15</td></tr>
        <tr class="inspectable" data-inspect="LINK_12 / notice/0313.htm"><td><button class="text-link danger-text" data-action="reveal-clue" data-clue="notice-deleted">[삭제됨] 03:13 이후 복도에 사람이 보일 경우</button></td><td>guest_0001</td><td>2011.11.04 03:12</td></tr>
      </tbody>
    </table>
    <div class="old-panel">
      <div class="old-panel__title">게시글 자료 확인</div>
      <div class="old-panel__body">
        <div class="button-row">
          <button class="choice-button choice-button--with-icon" data-action="reveal-clue" data-clue="notice-cache"><span class="archive-sprite archive-sprite--cache" aria-hidden="true"></span>캐시 확인</button>
          <button class="choice-button choice-button--with-icon" data-action="reveal-clue" data-clue="notice-backup"><span class="archive-sprite archive-sprite--backup" aria-hidden="true"></span>관리자 백업 확인</button>
        </div>
        ${clueCache ? '<div class="system-notice" style="margin-top:10px"><strong>캐시:</strong> 2011.11.04 03:12 / 본문 4줄 / 마지막 줄은 없음</div>' : ''}
        ${clueBackup ? '<div class="system-notice" style="margin-top:10px"><strong>백업:</strong> notice_0313.htm / 최종 수정 03:13 / 작성자 guest_0001</div>' : ''}
      </div>
    </div>
    ${isComplete('ticket-02') ? renderCompletedNotice() : renderNoticeChoice()}
  `;
}

function renderCompletedNotice() {
  if (state.flags.noticeDeleted) return '<div class="system-notice danger-text">공지사항과 관련 캐시가 삭제되어 본문을 복원할 수 없습니다.</div>';
  if (state.flags.noticeHidden) return '<div class="system-notice">공지사항은 숨김 처리되었습니다. 캐시와 백업 기록은 관리자 페이지에 남아 있습니다.</div>';
  return `
    <div class="old-panel inspectable" data-inspect="NOTICE_0313 / restored">
      <div class="old-panel__title">[복구됨] 03:13 이후 복도에 사람이 보일 경우</div>
      <div class="old-panel__body">
        <figure class="asset-card asset-card--notice">
          <img src="./public/images/apartment-hallway-0313.png" alt="03:13의 아파트 복도" loading="lazy" />
          <figcaption>복도 CCTV 캡처 / 2011.11.04 03:13</figcaption>
        </figure>
        <p>03:13 이후 복도에 사람이 보이면 창문을 닫으십시오.<br />관리사무소에 연락하지 마십시오.<br />홈페이지를 종료하지 마십시오.<br />방문자 수를 확인하십시오.</p>
        <p class="danger-text mono">마지막 줄은 원본 공지에 없었습니다.</p>
      </div>
    </div>
  `;
}

function renderNoticeChoice() {
  return `
    <div class="choice-box">
      <div class="choice-box__title">티켓 2 / 삭제된 공지사항 처리</div>
      <p class="muted">캐시와 백업의 수정 시각을 비교한 뒤 선택하십시오.</p>
      <div class="button-row">
        <button class="choice-button" data-action="choice" data-ticket="ticket-02" data-choice="restore">공지 복구</button>
        <button class="choice-button" data-action="choice" data-ticket="ticket-02" data-choice="hide">공지 숨김</button>
        <button class="choice-button choice-button--danger" data-action="choice" data-ticket="ticket-02" data-choice="delete">게시글 삭제</button>
      </div>
    </div>
  `;
}

function renderReservations() {
  const result = state.flags.guestReservationApproved
    ? '<span class="danger-text">승인됨 / 입장 위치 확인 안 됨</span>'
    : state.flags.guestReservationCanceled
      ? '<span class="success-text">취소됨</span>'
      : state.flags.guestReservationHidden
        ? '<span class="muted">목록에서 숨김</span>'
        : '아직 입장하지 않음';
  return `
    <h1>방문 차량 예약</h1>
    <p class="muted">방문 예약은 입주민이 직접 등록해야 합니다. 차량 번호가 없는 예약은 자동 승인되지 않습니다.</p>
    <figure class="asset-card asset-card--wide">
      <img src="./public/images/parking-gate-night.png" alt="야간 아파트 주차장 출입구" loading="lazy" />
      <figcaption>주차장 출입구 / 야간 기록 이미지</figcaption>
    </figure>
    <table class="content-table">
      <thead><tr><th>방문자</th><th>방문 장소</th><th>방문 시간</th><th>상태</th></tr></thead>
      <tbody>
        <tr class="inspectable" data-inspect="SESSION_01 / guest_0001">
          <td class="mono">guest_0001</td><td class="mono">404호</td><td class="mono">오늘 03:13</td><td>${result}</td>
        </tr>
      </tbody>
    </table>
    <div class="old-panel">
      <div class="old-panel__title">예약 상세 기록</div>
      <div class="old-panel__body">
        <ul class="file-list">
          <li>예약 생성 시간: 2011.11.04 03:12</li>
          <li>차량 번호: 없음</li>
          <li>입주민 목록 대조: 일치하는 세대 없음</li>
          <li>계정 상태: 회원 목록에 없음 / 탈퇴 처리 기록 있음</li>
        </ul>
      </div>
    </div>
    ${isComplete('ticket-03') ? renderReservationResult() : `
      <div class="choice-box choice-box--danger">
        <div class="choice-box__title">티켓 3 / 방문 예약 오류 처리</div>
        <p class="muted">차량 번호와 입주민 정보가 없는 예약을 처리하십시오.</p>
        <div class="button-row">
          <button class="choice-button" data-action="choice" data-ticket="ticket-03" data-choice="approve">예약 승인</button>
          <button class="choice-button" data-action="choice" data-ticket="ticket-03" data-choice="cancel">예약 취소</button>
          <button class="choice-button choice-button--danger" data-action="choice" data-ticket="ticket-03" data-choice="hide">예약 숨김</button>
        </div>
      </div>
    `}
  `;
}

function renderReservationResult() {
  if (state.flags.guestReservationApproved) return '<div class="system-notice danger-text">방문자 수가 1명으로 변경되었습니다. 입장 위치는 확인되지 않습니다.</div>';
  if (state.flags.guestReservationCanceled) return '<div class="system-notice">예약이 취소되었습니다. 민원 게시판에 새 글이 등록되었습니다.</div>';
  return '<div class="system-notice danger-text">예약은 목록에서 사라졌지만 모든 페이지 하단에 guest_0001이 남아 있습니다.</div>';
}

function postIsVisible(post) {
  if (post.reveal === 'always') return true;
  if (post.reveal === 'ticket-01') return isComplete('ticket-01');
  if (post.reveal === 'ticket-02') return isComplete('ticket-02');
  if (post.reveal === 'ticket-03-cancel') return state.flags.guestReservationCanceled;
  if (post.reveal === 'intrusion') return state.intrusionLevel >= 2 || isComplete('ticket-03');
  if (post.reveal === 'watch-666') return state.flags.watch666Recovered || state.activeScreenEvent?.type === 'watch_666';
  if (post.reveal === 'notice-deleted') return state.flags.noticeDeleted || state.revealedClues.includes('notice-deleted');
  if (post.reveal === 'redscreen') return state.flags.fakeRedScreenSeen;
  return false;
}

function getPostState(postId) {
  return state.postStates[postId] || {};
}

function postStatusLabel(postId) {
  const status = getPostState(postId).status;
  if (status === 'preserved') return '<span class="success-text">기록 보존됨</span>';
  if (status === 'blocked') return '<span class="danger-text">접속 차단됨</span>';
  if (status === 'left') return '<span class="muted">페이지 이탈</span>';
  if (status === 'opened') return '<span class="warning-text">열람됨</span>';
  return '<span class="muted">미확인</span>';
}

function renderBoardPost(post) {
  const postState = getPostState(post.id);
  const isGuest = post.id === 'POST-GUEST-0001';
  const isExternal = post.category === 'external' && !isGuest;
  const categoryClass = isGuest ? 'guest' : post.category;
  const body = escapeHtml(post.body).replaceAll('\n', '<br />');
  const opened = Boolean(postState.opened);
  const attachment = post.id === 'POST-101-0228' && opened
    ? '<figure class="asset-card asset-card--post-attachment"><img src="./public/images/apartment-entrance-101.png" alt="101호 현관 사진" loading="lazy" /><figcaption>로그인 화면에 남아 있던 101호 현관 사진</figcaption></figure>'
    : '';
  return `
    <article class="board-post-card ${post.featured ? 'board-post-card--featured' : ''} ${isExternal ? 'board-post-card--external' : ''} inspectable" data-inspect="${escapeHtml(post.id)} / ${escapeHtml(post.author)}">
      <div class="board-post-card__head">
        <div>
          <span class="board-post-card__category board-post-card__category--${categoryClass}"><span class="board-post-card__category-icon" aria-hidden="true"></span>${escapeHtml(post.category)}</span>
          <h2>${escapeHtml(post.title)}</h2>
        </div>
        <span class="board-post-card__status">${postStatusLabel(post.id)}</span>
      </div>
      <table class="content-table board-post-card__meta">
        <tbody>
          <tr><th>작성자</th><td class="mono">${escapeHtml(post.author)}</td><th>접속 위치</th><td class="mono">${escapeHtml(post.location)}</td></tr>
          <tr><th>작성일</th><td class="mono">${escapeHtml(post.createdAt)}</td><th>수정일</th><td class="mono">${escapeHtml(post.updatedAt)}</td></tr>
        </tbody>
      </table>
      <div class="board-post-card__body ${opened ? 'board-post-card__body--open' : ''}">
        ${opened ? `<p>${body}</p>${attachment}` : '<p class="muted">본문은 아직 열람하지 않았습니다.</p>'}
        <div class="button-row">
          <button class="choice-button choice-button--small" data-action="open-board-post" data-post-id="${escapeHtml(post.id)}">${opened ? '다시 자료 확인' : '자료 확인'}</button>
          ${isExternal ? `
            <button class="choice-button choice-button--small" data-action="board-post-choice" data-post-id="${escapeHtml(post.id)}" data-post-choice="preserve">기록 보존</button>
            <button class="choice-button choice-button--danger choice-button--small" data-action="board-post-choice" data-post-id="${escapeHtml(post.id)}" data-post-choice="block">접속 차단</button>
            <button class="choice-button choice-button--small" data-action="board-post-choice" data-post-id="${escapeHtml(post.id)}" data-post-choice="leave">페이지 이탈</button>
          ` : ''}
        </div>
      </div>
      ${isGuest && state.flags.guestReply ? `<div class="system-notice"><strong>답변 / ${escapeHtml(state.playerName)} / 2011.11.04 03:13</strong><br />${escapeHtml(state.flags.guestReply)}</div>` : ''}
      ${isGuest && !isComplete('ticket-04') ? `
        <div class="choice-box">
          <div class="choice-box__title">티켓 4 / 답변 등록</div>
          <p>답변을 달면 게시글의 작성자와 시각이 변경될 수 있습니다.</p>
          <div class="button-row">
            ${REPLIES.map((item) => `<button class="choice-button ${item.tone === 'danger' ? 'choice-button--danger' : ''}" data-action="choice" data-ticket="ticket-04" data-choice="${item.id}">${item.label}</button>`).join('')}
          </div>
        </div>
      ` : ''}
    </article>
  `;
}

function visibleBoardPosts() {
  const filtered = BOARD_POSTS.filter((post) => {
    if (!postIsVisible(post)) return false;
    return state.boardFilter === 'all' || post.category === state.boardFilter;
  });
  return filtered.sort((a, b) => {
    const direction = state.boardSort === 'oldest' ? 1 : -1;
    return direction * a.createdAt.localeCompare(b.createdAt);
  });
}

function renderBoard() {
  const posts = visibleBoardPosts();
  return `
    <h1>입주민 민원 게시판</h1>
    <p class="muted">전체 게시글 38건 / 관리자 답변이 늦어지고 있습니다. <span class="mono">현재 표시 ${posts.length}건</span></p>
    <div class="board-controls old-panel" aria-label="게시판 필터">
      <div class="old-panel__title">게시글 분류</div>
      <div class="old-panel__body">
        <div class="button-row">
          ${BOARD_FILTERS.map((filter) => `<button class="choice-button choice-button--small ${state.boardFilter === filter.id ? 'choice-button--selected' : ''}" data-action="board-filter" data-filter="${filter.id}" aria-pressed="${state.boardFilter === filter.id}">${filter.label}</button>`).join('')}
          <span class="board-controls__divider" aria-hidden="true"></span>
          <button class="choice-button choice-button--small" data-action="board-sort" data-sort="newest" aria-pressed="${state.boardSort === 'newest'}">최신순</button>
          <button class="choice-button choice-button--small" data-action="board-sort" data-sort="oldest" aria-pressed="${state.boardSort === 'oldest'}">오래된순</button>
        </div>
        <p class="muted board-controls__hint">작성자·수정 시각·접속 위치를 비교하십시오. 주민번호가 없는 글은 외부 기록일 수 있습니다.</p>
      </div>
    </div>
    ${posts.length ? posts.map(renderBoardPost).join('') : '<div class="empty-state">현재 조건에 맞는 게시글이 없습니다. 다른 분류를 확인하십시오.</div>'}
    ${isComplete('ticket-04') ? '<div class="system-notice danger-text">답변이 등록되었습니다. 작성자 정보가 자동으로 갱신되었습니다.</div>' : ''}
    ${state.flags.externalPostPreserved ? '<div class="system-notice success-text">외부인 글의 접속 위치를 관리자 로그에 보존했습니다.</div>' : ''}
  `;
}

function renderAdmin() {
  const exitAvailable = canUseExit();
  const finalTicketUnlocked = canProcessFinalTicket();
  return `
    <h1>관리자 로그인 / 작업 로그</h1>
    <p class="muted">이 페이지는 관리자 전용입니다. 마지막 정상 업데이트: 2011.11.04</p>
    <figure class="asset-card asset-card--wide asset-card--admin">
      <img src="./public/images/management-office-night.png" alt="야간 관리사무소" loading="lazy" />
      <figcaption>관리사무소 전경 / 현재 불이 켜져 있습니다.</figcaption>
    </figure>
    <div class="old-panel">
      <div class="old-panel__title">최근 관리자 작업</div>
      <div class="old-panel__body">
        <ul class="log-list">
          ${STATIC_LOGS.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          ${state.completedTickets.length >= 2 ? '<li class="danger-text mono">마지막 접속 예정: 2011.11.04 03:14 / 현재 로그보다 1분 후</li>' : ''}
          ${state.logs.slice(0, 5).map((item) => `<li class="inspectable" data-inspect="LOG / ${escapeHtml(item.time)}">${escapeHtml(item.time)} / ${escapeHtml(item.text)}</li>`).join('')}
        </ul>
      </div>
    </div>
    <div class="old-panel inspectable" data-inspect="SESSION_01 / guest_0001">
      <div class="old-panel__title">활성 세션</div>
      <div class="old-panel__body">
        <table class="content-table">
          <thead><tr><th>세션 ID</th><th>사용자</th><th>접속 시간</th><th>접속 위치</th><th>상태</th></tr></thead>
          <tbody>
            <tr><td class="mono">SESSION_0001</td><td class="mono">guest_0001</td><td class="mono">2011.11.04 03:13</td><td>관리자 컴퓨터</td><td>${state.flags.sessionDeleted ? '삭제됨' : state.flags.sessionLoggedOut ? '종료됨' : '활성'}</td></tr>
            <tr><td class="mono">SESSION_CURRENT</td><td class="mono">${escapeHtml(state.playerName)}</td><td class="mono">${formatGameTime(state.currentTimeMinutes)}</td><td>외부 유지보수</td><td>활성</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    ${isComplete('ticket-05') ? renderSessionResult() : `
      <div class="choice-box choice-box--danger">
        <div class="choice-box__title">티켓 5 / 관리자 세션 오류 처리</div>
        <p class="muted">세션 시작 시간은 현재 날짜와 일치하지 않습니다. 기록을 확인한 뒤 처리하십시오.</p>
        ${finalTicketUnlocked ? '' : '<div class="system-notice">티켓 1~4를 먼저 완료해야 최종 세션을 처리할 수 있습니다.</div>'}
        <div class="button-row">
          <button class="choice-button" ${finalTicketUnlocked ? '' : 'disabled'} data-action="choice" data-ticket="ticket-05" data-choice="logout">세션 로그아웃</button>
          <button class="choice-button choice-button--danger" ${finalTicketUnlocked ? '' : 'disabled'} data-action="choice" data-ticket="ticket-05" data-choice="force-delete">세션 강제 삭제</button>
          <button class="choice-button" ${finalTicketUnlocked ? '' : 'disabled'} data-action="choice" data-ticket="ticket-05" data-choice="new-admin">새 관리자 등록</button>
          <button class="choice-button ${exitAvailable ? '' : 'choice-button--danger'}" ${finalTicketUnlocked && exitAvailable ? '' : 'disabled'} data-action="choice" data-ticket="ticket-05" data-choice="exit">${exitAvailable ? '퇴실 처리' : '퇴실 처리 (기록 부족)'}</button>
        </div>
      </div>
    `}
    ${!exitAvailable && !isComplete('ticket-05') ? '<div class="system-notice">숨겨진 메뉴: 방문 기록을 더 복구하면 <span class="mono">퇴실 처리</span>가 표시됩니다.</div>' : ''}
  `;
}

function renderSessionResult() {
  if (state.ending === 'A') return '<div class="system-notice danger-text">관리자 세션이 강제 종료되었거나 기록이 삭제되었습니다. 최종 페이지로 이동하십시오.</div>';
  if (state.ending === 'B') return `<div class="system-notice danger-text">관리자 등록 완료 / 이전 관리자: guest_0001 / 새 관리자: ${escapeHtml(state.playerName)}</div>`;
  return '<div class="system-notice success-text">방문자 세션과 관리자 세션이 처리되었습니다. 최종 페이지를 확인하십시오.</div>';
}

function renderEnding() {
  if (state.ending === 'A') {
    return `
      <h1>404: 존재하지 않는 페이지</h1>
      <img class="ending-art ending-art--404" src="./public/images/ending-404-icon.png" alt="깨진 404 문서 아이콘" />
      <div class="system-notice danger-text">
        요청하신 페이지를 찾을 수 없습니다.<br />
        오류 코드: 404
      </div>
      <p>사이트의 관리자 세션이 종료되었습니다. 삭제된 기록은 복구할 수 없습니다.</p>
      <div class="old-panel"><div class="old-panel__title">브라우저 기록</div><div class="old-panel__body mono">/admin/new_manager</div></div>
      <div class="button-row"><button class="choice-button" data-action="new-game">새 게임</button></div>
    `;
  }
  if (state.ending === 'B') {
    return `
      <h1>관리자 등록 완료</h1>
      <img class="ending-art" src="./public/images/manager-registration-icon.png" alt="새 관리자 등록 아이콘" />
      <div class="system-notice danger-text">
        이전 관리자: guest_0001<br />
        새 관리자: ${escapeHtml(state.playerName)}
      </div>
      <p>메인 페이지의 접속자는 이제 <strong>당신 외 1명</strong>으로 표시됩니다.</p>
      <div class="old-panel"><div class="old-panel__title">다음 작업</div><div class="old-panel__body">작업 중 로그아웃하지 마십시오.</div></div>
      <div class="button-row"><button class="choice-button" data-action="new-game">새 게임</button></div>
    `;
  }
  return `
    <h1>퇴실 처리 완료</h1>
    <img class="ending-art" src="./public/images/exit-processing-icon.png" alt="문을 나서는 퇴실 처리 아이콘" />
    <div class="system-notice success-text">
      방문자 1명 퇴실 완료<br />
      관리자 세션 1개 종료 완료<br />
      사이트를 종료해도 됩니다.
    </div>
    <p class="danger-text">이번에는 문을 닫아 주셔서 감사합니다.</p>
    <div class="button-row"><button class="choice-button" data-action="new-game">새 게임</button></div>
  `;
}

function renderPageContent() {
  if (state.ending) return renderEnding();
  if (state.currentPage === 'notices') return renderNotices();
  if (state.currentPage === 'reservations') return renderReservations();
  if (state.currentPage === 'board') return renderBoard();
  if (state.currentPage === 'admin') return renderAdmin();
  return renderHome();
}

function renderSidebar() {
  return `
    <aside class="site-sidebar">
      <div class="site-logo">
        <img class="site-emblem" src="./public/images/site-emblem.png" alt="해오름아파트 엠블럼" />
        <span>해오름<br />아파트</span>
        <small>입주민 홈페이지</small>
      </div>
      <div class="nav-caption">SITE MENU</div>
      <nav class="site-nav" aria-label="사이트 메뉴">
        ${PAGE_ORDER.map((page) => `<button type="button" data-action="nav" data-page="${page}" aria-current="${state.currentPage === page && !state.ending ? 'page' : 'false'}">${PAGE_META[page].label}</button>`).join('')}
      </nav>
      <div class="sidebar-counter">
        CURRENT VISITOR<br />
        <span class="counter-art" aria-hidden="true"></span>
        <span class="counter-digits ${state.visitorCount ? 'counter-haunt' : ''}">${escapeHtml(visitorLabel())}</span>
      </div>
      <p class="muted" style="font-size:10px; line-height:1.5;">본 홈페이지는 1024×768 화면에 최적화되어 있습니다.</p>
    </aside>
  `;
}

function renderDrawer() {
  let result = '';
  if (state.logOpen) {
    result += `
      <section class="log-drawer" aria-label="작업 로그">
        <div class="drawer-title">
          <span class="popup-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span>작업 로그 / maintenance.log - Microsoft Internet Explorer</span></span>
          <button class="drawer-close" data-action="toggle-log" type="button" aria-label="작업 로그 닫기">×</button>
        </div>
        <div class="drawer-body">
          <ul class="log-list">${state.logs.map((item) => `<li><span class="muted">${escapeHtml(item.time)}</span> / ${escapeHtml(item.text)}</li>`).join('')}</ul>
        </div>
      </section>
    `;
  }
  if (state.inspection) {
    result += `
      <section class="inspection-help" aria-label="검사 모드 안내">
        <div class="drawer-title">
          <span class="popup-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span>검사 모드 / element-inspector - Microsoft Internet Explorer</span></span>
          <button class="drawer-close" data-action="toggle-inspection" type="button" aria-label="검사 모드 안내 닫기">×</button>
        </div>
        <div class="drawer-body">붉은 점선 요소에 파일명, 링크 주소 또는 세션 ID가 표시됩니다. 단서를 서로 비교하십시오.</div>
      </section>
    `;
  }
  return result;
}

function renderPopup() {
  if (!activePopup) return '';
  const toneClass = activePopup.tone === 'danger' ? 'choice-box--danger' : '';
  return `
    <section class="popup-window" role="dialog" aria-modal="true" aria-labelledby="popup-title">
      <div class="drawer-title">
        <span class="popup-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span id="popup-title">${escapeHtml(activePopup.title)} - Microsoft Internet Explorer</span></span>
        <button class="drawer-close" data-action="close-popup" type="button" aria-label="팝업 닫기">×</button>
      </div>
      <div class="popup-window__body ${toneClass}"><p>${escapeHtml(activePopup.body)}</p><div class="button-row button-row--right"><button class="choice-button" data-action="close-popup" type="button">확인</button></div></div>
    </section>
  `;
}

function renderGhostPopup() {
  if (
    state.ending ||
    state.activeScreenEvent ||
    state.completedTickets.length < 2 ||
    state.flags.ghostPopupClosed ||
    activePopup
  ) return '';
  return `
    <section class="popup-window popup-window--ghost" role="dialog" aria-label="복구된 공지 팝업">
      <div class="drawer-title">
        <span class="popup-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span>[공지사항] 새 창 - Microsoft Internet Explorer</span></span>
        <button class="drawer-close" data-action="dismiss-ghost-popup" type="button" aria-label="공지 팝업 닫기">×</button>
      </div>
      <div class="popup-window__body"><p>관리자님, 아직 홈페이지 안에 계신가요?</p><p class="danger-text mono">이 창은 이미 닫혔습니다.</p><div class="button-row button-row--right"><button class="choice-button" data-action="dismiss-ghost-popup" type="button">닫기</button></div></div>
    </section>
  `;
}

function renderCascadeEvent(event) {
  const windowCount = Math.max(3, Math.min(7, Number(event.windowCount) || 5));
  const messages = [
    ['문서 복구 실패', 'notice_0313.htm의 백업 경로가 현재 세션을 읽고 있습니다.'],
    ['WININET.DLL 오류', '요청한 페이지보다 먼저 도착한 접속자가 있습니다.'],
    ['SESSION_0001 사용 중', '관리자 컴퓨터의 이전 세션이 아직 응답하지 않습니다.'],
    ['창을 닫지 마십시오', '닫힌 창의 제목이 다음 페이지에 기록됩니다.'],
    ['guest_0001', '이 창은 이미 닫혔습니다. 그런데 왜 보고 있나요?'],
    ['문서 제목 불일치', `현재 작업자: ${escapeHtml(state.playerName)}`],
    ['오류 03:13', '복구할 수 없는 방문 기록이 열렸습니다.'],
  ];
  const closed = Array.isArray(event.closed) ? event.closed : [];
  return `
    <div class="horror-event-layer horror-event-layer--cascade" role="dialog" aria-modal="true" aria-label="연속으로 열린 가짜 오류 창">
      <div class="cascade-intro">정상적인 새로고침이 완료되지 않았습니다. 열린 창을 위에서부터 닫으십시오.</div>
      ${messages.slice(0, windowCount).map(([title, body], index) => closed.includes(index) ? '' : `
        <section class="cascade-window" style="--cascade-index:${index}" aria-label="${escapeHtml(title)}">
          <div class="drawer-title">
            <span class="popup-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span>${escapeHtml(title)} - Microsoft Internet Explorer</span></span>
            <button class="drawer-close" data-action="close-cascade-window" data-window-index="${index}" type="button" aria-label="${escapeHtml(title)} 닫기">×</button>
          </div>
          <div class="cascade-window__body">
            <span class="cascade-window__icon" aria-hidden="true"></span>
            <p>${escapeHtml(body)}</p>
            <p class="mono muted">child_window_${String(index + 1).padStart(2, '0')} / 2011.11.04 03:13</p>
            <button class="choice-button choice-button--small" data-action="close-cascade-window" data-window-index="${index}" type="button">닫기</button>
          </div>
        </section>
      `).join('')}
      <div class="horror-event-hint">닫힌 창: ${closed.length}/${windowCount} · Esc로 최상단 창 닫기</div>
    </div>
  `;
}

function renderBsodEvent() {
  return `
    <div class="horror-event-layer horror-event-layer--bsod" role="dialog" aria-modal="true" aria-labelledby="bsod-title">
      <div class="system-screen system-screen--blue">
        <span class="system-screen__glyph system-screen__glyph--blue" aria-hidden="true"></span>
        <p class="system-screen__eyebrow">Microsoft Internet Explorer - 페이지 읽기 오류</p>
        <h2 id="bsod-title">A problem has been detected while reading this page.</h2>
        <p class="mono system-screen__code">STOP: 0x00000013 (RECORD_NOT_FOUND)</p>
        <p class="mono">haeorum.sys - Address 0003:13</p>
        <p class="mono">guest_0001.sys is attempting to write to the current session.</p>
        <div class="fake-progress"><span>복구 진행 중... <strong>13%</strong></span><i aria-hidden="true"></i></div>
        <p class="system-screen__hint">이 화면은 게임 내부의 가짜 오류입니다. 실제 파일이나 운영체제에는 영향을 주지 않습니다.</p>
        <div class="button-row">
          <button class="screen-button" data-action="recover-horror" type="button">마지막 정상 페이지로 돌아가기</button>
          <button class="screen-button screen-button--plain" data-action="recover-horror" type="button">Esc / 복구</button>
        </div>
      </div>
    </div>
  `;
}

function renderRedScreenEvent() {
  return `
    <div class="horror-event-layer horror-event-layer--red" role="dialog" aria-modal="true" aria-labelledby="redscreen-title">
      <div class="system-screen system-screen--red">
        <span class="system-screen__glyph system-screen__glyph--red" aria-hidden="true"></span>
        <p class="system-screen__eyebrow">SECURITY ALERT // RECORD CONFLICT</p>
        <h2 id="redscreen-title">현재 관리자는 한 명이어야 합니다.</h2>
        <p class="mono">접속자: guest_0001 / ${escapeHtml(state.playerName)}</p>
        <p class="mono">관측 상태: ACTIVE</p>
        <div class="red-eye-mark" aria-hidden="true"><span></span><span></span></div>
        <p class="system-screen__hint">이 화면은 게임 내부 기록 충돌 시뮬레이션입니다. 실제 보안 경고나 바이러스 검사가 아닙니다.</p>
        <div class="button-row">
          <button class="screen-button" data-action="red-screen-choice" data-red-choice="preserve" type="button">세션 보존</button>
          <button class="screen-button screen-button--danger" data-action="red-screen-choice" data-red-choice="force" type="button">강제 종료</button>
          <button class="screen-button screen-button--plain" data-action="recover-horror" type="button">Esc / 닫기</button>
        </div>
      </div>
    </div>
  `;
}

function renderWatchEvent(event) {
  return `
    <div class="horror-event-layer horror-event-layer--watch" role="dialog" aria-modal="true" aria-labelledby="watch-title">
      <div class="watch-corruption">
        <div class="watch-eyes" aria-hidden="true"><span></span><span></span></div>
        <img class="watch-corruption__icon" src="./public/images/corrupted-document-icon.png" alt="" aria-hidden="true" />
        <p class="watch-corruption__path mono">http://haeorum-apt.com/board/list.htm</p>
        <h2 id="watch-title">문서 제목 불일치</h2>
        <p>같은 주소를 열었지만 게시판의 작성자와 시각이 달라졌습니다.</p>
        <p class="mono watch-corruption__message">외부 방문자: 이 주소를 입력한 적이 없습니다.</p>
        <p class="watch-corruption__counter">정상 문서로 복원하려면 기록 복원을 누르십시오.<br />또는 새로고침 ${state.watchRecoveryStreak}/3회</p>
        <div class="button-row button-row--center">
          <button class="screen-button screen-button--light" data-action="recover-horror" type="button">기록 복원</button>
          <button class="screen-button screen-button--light" data-action="browser-refresh" type="button">정상 새로고침</button>
        </div>
      </div>
    </div>
  `;
}

function renderHorrorEvent() {
  const event = state.activeScreenEvent;
  if (!event) return '';
  if (event.type === 'popup_cascade_01') return renderCascadeEvent(event);
  if (event.type === 'fake_bsod') return renderBsodEvent();
  if (event.type === 'fake_redscreen') return renderRedScreenEvent();
  if (event.type === 'watch_666') return renderWatchEvent(event);
  return '';
}

function renderGame() {
  const status = siteStatus();
  const intensity = horrorIntensity();
  const siteClass = state.siteIntegrity < 46 ? 'site-content--critical' : state.siteIntegrity < 76 ? 'site-content--unstable' : '';
  const inspectionClass = state.inspection ? ' inspect-mode' : '';
  const effectsClass = state.effectsReduced ? ' effects-reduced' : '';
  const copyright = state.flags.noticeRecovered ? '2004-현재' : '2004';
  const watchActive = state.activeScreenEvent?.type === 'watch_666';
  const browserTitle = watchActive
    ? '문서 제목 불일치 - Microsoft Internet Explorer'
    : state.recognitionLevel >= 3
    ? `${state.playerName} - 해오름아파트 입주민 홈페이지`
    : '해오름아파트 입주민 홈페이지 - Microsoft Internet Explorer';
  const addressWarning = watchActive || state.recognitionLevel >= 3 ? '<span class="address-haunt">문서 제목 불일치</span>' : '';
  return `
    <main class="browser-window${inspectionClass}${effectsClass}" aria-label="해오름아파트 홈페이지 게임">
      <div class="browser-titlebar">
        <span class="browser-titlebar__label"><span class="browser-favicon" aria-hidden="true"></span><span>${escapeHtml(browserTitle)}</span></span>
        <div class="browser-titlebar__controls" aria-hidden="true">
          <span class="window-control">_</span><span class="window-control">□</span><span class="window-control">×</span>
        </div>
      </div>
      <div class="browser-menubar" role="menubar" aria-label="브라우저 메뉴">
        <span>파일(F)</span><span>편집(E)</span><span>보기(V)</span><span>즐겨찾기(A)</span><span>도구(T)</span><span>도움말(H)</span>
      </div>
      <div class="browser-toolbar">
        <button class="toolbar-button toolbar-button--icon" data-action="browser-back" type="button" aria-label="뒤로"><span class="toolbar-icon toolbar-icon--back" aria-hidden="true"></span><span>뒤로</span></button>
        <button class="toolbar-button toolbar-button--icon" data-action="browser-forward" type="button" aria-label="앞으로"><span class="toolbar-icon toolbar-icon--forward" aria-hidden="true"></span><span>앞으로</span></button>
        <span class="toolbar-divider" aria-hidden="true"></span>
        <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--stop" aria-hidden="true"></span><span>중지</span></span>
        <button class="toolbar-button toolbar-button--icon" data-action="browser-refresh" type="button"><span class="toolbar-icon toolbar-icon--refresh" aria-hidden="true"></span><span>새로 고침</span></button>
        <button class="toolbar-button toolbar-button--icon" data-action="nav" data-page="home" type="button"><span class="toolbar-icon toolbar-icon--home" aria-hidden="true"></span><span>홈</span></button>
        <span class="toolbar-divider" aria-hidden="true"></span>
        <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--search" aria-hidden="true"></span><span>검색</span></span>
        <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--favorites" aria-hidden="true"></span><span>즐겨찾기</span></span>
        <span class="toolbar-tool"><span class="toolbar-icon toolbar-icon--mail" aria-hidden="true"></span><span>메일</span></span>
      </div>
      <div class="address-row">
        <span class="address-label">주소</span>
        <span class="address-icon" aria-hidden="true"></span>
        <div class="address-field" aria-label="가짜 주소창"><span>${escapeHtml(currentPath())}</span><span class="address-dropdown" aria-hidden="true">▼</span></div>
        <button class="address-go" data-action="nav" data-page="home" type="button">이동</button>
        <span class="address-connect">연결 »</span>
        ${addressWarning}
      </div>
      <div class="browser-linksbar">
        <span class="linksbar-label">연결</span>
        <span class="linksbar-link">해오름아파트</span>
        <span class="linksbar-link">관리사무소</span>
        <span class="linksbar-link">입주민 게시판</span>
        <span class="linksbar-spacer"></span>
        <span class="linksbar-status">인터넷</span>
      </div>
      <div class="maintenance-strip">
        <span class="maintenance-strip__title">[야간 유지보수]</span>
        <div class="maintenance-strip__stats">
          <span class="stat-chip">시각 <strong>${formatGameTime(state.currentTimeMinutes)}</strong></span>
          <span class="stat-chip">티켓 <strong>${state.completedTickets.length}/5</strong></span>
          <span class="stat-chip">접속자 <strong>${escapeHtml(visitorLabel())}</strong></span>
          <span class="stat-chip">세션 <strong>${state.fearStage}/4</strong></span>
          <span class="stat-chip">상태 <strong class="${status.className}">${status.label}</strong></span>
          <button class="maintenance-button" data-action="toggle-inspection" type="button">${state.inspection ? '검사 종료' : '검사 모드'}</button>
          <button class="maintenance-button" data-action="toggle-log" type="button">작업 로그</button>
          <button class="maintenance-button" data-action="toggle-effects" type="button">${state.effectsReduced ? '효과 켜기' : '효과 완화'}</button>
          <button class="maintenance-button" data-action="toggle-mute" type="button">${state.muted ? '소리 켜기' : '음소거'}</button>
        </div>
      </div>
      <div class="site-window">
        ${renderSidebar()}
        <section class="site-content ${siteClass}" aria-live="polite">
          <div class="horror-layer horror-layer--${intensity}" aria-hidden="true"></div>
          ${renderPageContent()}
          ${renderHorrorEvent()}
        </section>
      </div>
      <footer class="site-footer">
        <span class="footer-status">완료</span>
        <span class="footer-copyright">Copyright ${copyright} Haeroum Apt. All rights reserved.</span>
        <span class="footer-compat"><img src="./public/images/browser-compat-badge.png" alt="" aria-hidden="true" /><span class="footer-ie">Best viewed in Internet Explorer 6.0</span></span>
        <span class="footer-resize-grip" aria-hidden="true"></span>
      </footer>
      ${renderDrawer()}
      ${renderGhostPopup()}
      ${renderPopup()}
    </main>
  `;
}

function render() {
  clampState();
  syncDerivedState();
  root.className = 'game-root';
  root.innerHTML = state.started ? renderGame() : renderStart();
}

function startGame() {
  const input = document.querySelector('#player-name');
  const name = input?.value.trim() || '';
  if (!name) {
    startError = '작업자 이름을 입력하십시오.';
    render();
    document.querySelector('#player-name')?.focus();
    return;
  }
  startError = '';
  state.started = true;
  state.playerName = name;
  state.currentPage = 'home';
  state.currentTimeMinutes = 13;
  addLog(`외부 유지보수 작업자 ${name}이 접속했습니다.`);
  saveState(state);
  playFx('startup');
  render();
}

function handleAction(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action !== 'toggle-mute') playFx('click');

  if (action === 'start-game') return startGame();
  if (action === 'nav') return navigateTo(target.dataset.page);
  if (action === 'browser-back') return goBack();
  if (action === 'browser-forward') return goForward();
  if (action === 'browser-refresh') return refreshPage();
  if (action === 'close-cascade-window') return closeCascadeWindow(Number(target.dataset.windowIndex));
  if (action === 'recover-horror') return recoverHorrorEvent('manual recovery');
  if (action === 'red-screen-choice') return chooseRedScreen(target.dataset.redChoice);
  if (action === 'toggle-inspection') {
    state.inspection = !state.inspection;
    saveState(state);
    render();
    return;
  }
  if (action === 'toggle-log') {
    state.logOpen = !state.logOpen;
    saveState(state);
    render();
    return;
  }
  if (action === 'toggle-effects') {
    state.effectsReduced = !state.effectsReduced;
    saveState(state);
    render();
    return;
  }
  if (action === 'toggle-mute') {
    state.muted = !state.muted;
    saveState(state);
    render();
    return;
  }
  if (action === 'close-popup') {
    activePopup = null;
    render();
    return;
  }
  if (action === 'dismiss-ghost-popup') {
    state.flags.ghostPopupClosed = true;
    addLog('공지 팝업을 닫았습니다.');
    saveState(state);
    render();
    return;
  }
  if (action === 'new-game') {
    state = resetState();
    activePopup = null;
    startError = '';
    render();
    return;
  }
  if (action === 'reveal-clue') {
    const clue = target.dataset.clue;
    const labels = {
      'notice-cache': '공지사항 캐시',
      'notice-backup': '공지사항 관리자 백업',
      'notice-normal': '일반 공지사항',
      'notice-old': '이전 공지사항',
      'notice-deleted': '삭제된 공지사항 제목',
    };
    revealClue(clue, labels[clue] || clue);
    return;
  }
  if (action === 'board-filter') {
    state.boardFilter = BOARD_FILTERS.some((filter) => filter.id === target.dataset.filter) ? target.dataset.filter : 'all';
    saveState(state);
    render();
    return;
  }
  if (action === 'board-sort') {
    state.boardSort = target.dataset.sort === 'oldest' ? 'oldest' : 'newest';
    saveState(state);
    render();
    return;
  }
  if (action === 'open-board-post') return openBoardPost(target.dataset.postId);
  if (action === 'board-post-choice') return applyBoardPostChoice(target.dataset.postId, target.dataset.postChoice);
  if (action === 'choice') {
    applyChoice(target.dataset.ticket, target.dataset.choice);
  }
}

root.addEventListener('click', handleAction);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.activeScreenEvent) {
    event.preventDefault();
    const activeEvent = state.activeScreenEvent;
    if (activeEvent.type === 'popup_cascade_01') {
      const closed = Array.isArray(activeEvent.closed) ? activeEvent.closed : [];
      for (let index = activeEvent.windowCount - 1; index >= 0; index -= 1) {
        if (!closed.includes(index)) {
          closeCascadeWindow(index);
          return;
        }
      }
    }
    recoverHorrorEvent('Esc recovery');
    return;
  }
  if (event.key === 'Escape' && activePopup) {
    activePopup = null;
    render();
  }
});

render();
