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

export const BOARD_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'resident', label: '주민' },
  { id: 'management', label: '관리사무소' },
  { id: 'deleted', label: '삭제됨' },
  { id: 'external', label: '외부' },
];

export const BOARD_POSTS = [
  {
    id: 'POST-302-0312', category: 'resident', author: '302호 주민', location: '302호',
    title: '복도에서 자꾸 이상한 소리가 나요',
    body: '발자국이 아니라 마우스 클릭 소리입니다. 누가 복도에서 홈페이지를 보고 있는 건가요?',
    createdAt: '2011.11.04 03:12', updatedAt: '2011.11.04 03:13', reveal: 'always',
  },
  {
    id: 'POST-508-0301', category: 'resident', author: '508호 주민', location: '508호',
    title: '엘리베이터가 없는 4층에서 멈춰요',
    body: '문이 열리면 안에서 홈페이지 소리가 들립니다. 우리 동에는 4층이 없는데요.',
    createdAt: '2011.11.04 03:01', updatedAt: '2011.11.04 03:01', reveal: 'ticket-02',
  },
  {
    id: 'POST-101-0228', category: 'resident', author: '101호 주민', location: '101호',
    title: '현관 사진이 로그인 화면에 올라와 있어요',
    body: '관리사무소에 보낸 적 없는 사진입니다. 파일명에는 제 호수가 없는데 사진은 우리 집입니다.',
    createdAt: '2011.11.03 22:28', updatedAt: '2011.11.04 03:13', reveal: 'ticket-01',
  },
  {
    id: 'POST-MGMT-0007', category: 'management', author: '관리사무소', location: '관리사무소',
    title: '새벽 방문자 확인 절차',
    body: '새벽 방문자는 이름과 차량 번호를 반드시 남겨 주세요. 차량 번호가 없는 방문자는 입장시키지 않습니다.',
    createdAt: '2011.11.04 02:55', updatedAt: '2011.11.04 02:55', reveal: 'always',
  },
  {
    id: 'POST-GUEST-0001', category: 'external', author: 'guest_0001', location: '확인 불가',
    title: '관리자님, 아직 홈페이지 안에 계신가요?',
    body: '밖에는 아무도 없는데 접속자가 계속 늘어나요.\n관리자님이 답변을 달면 나갈 수 있다고 했잖아요.',
    createdAt: '2011.11.04 03:12', updatedAt: '2011.11.04 03:12', reveal: 'always', featured: true,
  },
  {
    id: 'POST-404-0313', category: 'resident', author: '404호 주민', location: '404호',
    title: '초인종을 눌렀는데 안에서 컴퓨터 부팅 소리가 났습니다',
    body: '세 번 울리고 멈췄습니다. 문 안에는 아무도 없다고 했는데, 홈페이지 접속음이 같이 났어요.',
    createdAt: '2011.11.04 03:13', updatedAt: '2011.11.04 03:13', reveal: 'ticket-03-cancel',
  },
  {
    id: 'POST-UNKNOWN-13', category: 'external', author: '알 수 없음', location: '외부 / 203.0.113.13',
    title: '이 글은 주민 게시판이 아닙니다',
    body: '주소를 잘못 입력했는데도 계속 같은 페이지가 열립니다. 뒤로가기를 눌러도 글이 먼저 읽고 있습니다.',
    createdAt: '2011.11.04 03:13', updatedAt: '2011.11.04 03:13', reveal: 'intrusion',
  },
  {
    id: 'POST-VISITOR-000', category: 'external', author: '외부 방문자', location: '외부',
    title: '여기 주소가 아닌데 홈페이지가 열립니다',
    body: '이 주소를 입력한 적이 없습니다. 뒤로가기를 눌러도 같은 주소입니다. 답변 버튼이 없어요.',
    createdAt: '2011.11.04 03:14', updatedAt: '2011.11.04 03:14', reveal: 'watch-666',
  },
  {
    id: 'POST-DELETED-OLD', category: 'deleted', author: '삭제된 사용자', location: '기록 없음',
    title: '창을 닫으면 안 됩니다',
    body: '닫은 사람의 이름으로 다음 글이 올라옵니다. 이 글을 삭제한 사람도 이미 목록에 있습니다.',
    createdAt: '2011.11.04 01:09', updatedAt: '2011.11.04 03:13', reveal: 'notice-deleted',
  },
  {
    id: 'POST-COUNTER-01', category: 'management', author: '관리자', location: '관리자 컴퓨터',
    title: '접속자 숫자는 사람 수가 아닌 것 같습니다',
    body: '열린 창의 수를 세는 것 같습니다. 창을 닫으면 숫자가 줄지만, 닫은 창의 제목은 로그에 남습니다.',
    createdAt: '2011.11.04 03:13', updatedAt: '2011.11.04 03:13', reveal: 'redscreen',
  },
];
