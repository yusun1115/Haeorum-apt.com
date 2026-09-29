export const PAGE_ORDER = ['home', 'notices', 'reservations', 'board', 'admin'];

export const PAGE_META = {
  home: { label: 'HOME', path: 'http://haeorum-apt.com/' },
  notices: { label: '공지사항', path: 'http://haeorum-apt.com/notice/' },
  reservations: { label: '방문 예약', path: 'http://haeorum-apt.com/visit/' },
  board: { label: '민원 게시판', path: 'http://haeorum-apt.com/board/' },
  admin: { label: '관리자 로그인', path: 'http://haeorum-apt.com/admin/' },
};

export function getPageMeta(page) {
  return PAGE_META[page] || PAGE_META.home;
}
