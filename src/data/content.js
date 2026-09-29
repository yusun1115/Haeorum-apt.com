export const TICKETS = [
  { id: 'ticket-01', number: 1, title: '메인 배너 이미지 오류', page: 'home' },
  { id: 'ticket-02', number: 2, title: '삭제된 공지사항', page: 'notices' },
  { id: 'ticket-03', number: 3, title: '방문 차량 예약 오류', page: 'reservations' },
  { id: 'ticket-04', number: 4, title: '답변되지 않은 민원', page: 'board' },
  { id: 'ticket-05', number: 5, title: '관리자 세션 오류', page: 'admin' },
];

export const STATIC_LOGS = [
  '2004.06.12 / 홈페이지 개설',
  '2011.11.04 / 관리사무소 야간 점검 예정',
  '2011.11.04 / 외부 유지보수 업체 접속 대기',
];

export const REPLIES = [
  { id: 'confirmed', label: '확인했습니다.', tone: 'neutral' },
  { id: 'not-admin', label: '관리자가 아닙니다.', tone: 'warning' },
  { id: 'leaving', label: '곧 나가겠습니다.', tone: 'danger' },
];
