export const STORAGE_KEY = 'haeroum-apt-game-v1';

export const DEFAULT_FLAGS = {
  bannerRestored: false,
  bannerOld: false,
  bannerHidden: false,
  bannerDeleted: false,
  noticeRecovered: false,
  noticeHidden: false,
  noticeDeleted: false,
  guestReservationApproved: false,
  guestReservationCanceled: false,
  guestReservationHidden: false,
  guestReply: '',
  guestTracked: false,
  sessionLoggedOut: false,
  sessionDeleted: false,
  newAdmin: false,
  exitFound: false,
  criticalDeletion: false,
};

export function createInitialState() {
  return {
    version: 1,
    started: false,
    playerName: '',
    currentPage: 'home',
    history: [],
    forward: [],
    currentTimeMinutes: 13,
    completedTickets: [],
    siteIntegrity: 100,
    visitorCount: 0,
    recordRecovery: 0,
    recognitionLevel: 0,
    inspection: false,
    logOpen: false,
    muted: false,
    ending: null,
    revealedClues: [],
    triggeredEvents: [],
    logs: [
      { time: '00:13', text: '유지보수 세션이 시작되었습니다.' },
    ],
    flags: { ...DEFAULT_FLAGS },
  };
}

function mergeState(raw) {
  const base = createInitialState();
  const merged = {
    ...base,
    ...raw,
    flags: { ...base.flags, ...(raw?.flags || {}) },
    logs: Array.isArray(raw?.logs) && raw.logs.length ? raw.logs : base.logs,
    completedTickets: Array.isArray(raw?.completedTickets) ? raw.completedTickets : [],
    revealedClues: Array.isArray(raw?.revealedClues) ? raw.revealedClues : [],
    triggeredEvents: Array.isArray(raw?.triggeredEvents) ? raw.triggeredEvents : [],
    history: Array.isArray(raw?.history) ? raw.history : [],
    forward: Array.isArray(raw?.forward) ? raw.forward : [],
  };

  if (typeof merged.playerName !== 'string') merged.playerName = '';
  if (!Number.isFinite(merged.currentTimeMinutes)) merged.currentTimeMinutes = 13;
  if (!Number.isFinite(merged.siteIntegrity)) merged.siteIntegrity = 100;
  if (!Number.isFinite(merged.visitorCount)) merged.visitorCount = 0;
  if (!Number.isFinite(merged.recordRecovery)) merged.recordRecovery = 0;
  if (!Number.isFinite(merged.recognitionLevel)) merged.recognitionLevel = 0;
  return merged;
}

export function loadState() {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return createInitialState();
    return mergeState(JSON.parse(serialized));
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

export function resetState() {
  const state = createInitialState();
  saveState(state);
  return state;
}

export function formatGameTime(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
