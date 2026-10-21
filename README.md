# 404: 존재하지 않는 방문자

해오름아파트 입주민 홈페이지를 수리하는 동안, 오래된 웹사이트의 기록과 방문자 세션을 추적하는 아날로그 호러 웹게임입니다.

## 바로 플레이

**[게임 시작 — 404: 존재하지 않는 방문자](https://yusun1115.github.io/Haeorum-apt.com/)**

설치 없이 브라우저에서 플레이할 수 있습니다. 데스크톱 Chrome 또는 Edge, 1024×768 이상의 화면을 권장합니다.

## 로컬 실행

별도 빌드 도구나 백엔드가 필요하지 않습니다. Windows에서는 프로젝트 폴더에서 다음 명령을 실행합니다.

```powershell
py -m http.server 4173
```

그 다음 브라우저에서 [http://localhost:4173/](http://localhost:4173/)을 엽니다.

## 배포용 빌드

Node.js 22 이상에서 다음 명령을 실행합니다. 외부 패키지 설치는 필요하지 않습니다.

```sh
node scripts/build.mjs
```

`npm run build`도 같은 빌드를 실행합니다. 생성된 `dist/`에 게임 실행에 필요한 HTML, JavaScript, CSS, 이미지, 폰트만 포함됩니다. 모든 리소스의 상대 경로를 유지하므로 GitHub Pages의 `/Haeorum-apt.com/` 경로에서도 실행됩니다.

빌드 결과를 로컬에서 확인하려면 다음 명령을 실행한 뒤 [http://localhost:4173/](http://localhost:4173/)을 엽니다.

```powershell
py -m http.server 4173 --directory dist
```

## GitHub Pages 자동 배포

`.github/workflows/deploy-pages.yml`은 `main` 브랜치에 푸시할 때 게임을 빌드하고 `dist/`를 GitHub Pages에 배포합니다. GitHub의 Actions 탭에서 수동으로 실행할 수도 있습니다.

저장소의 **Settings → Pages → Build and deployment → Source**는 **GitHub Actions**로 설정합니다. 배포 진행 상태는 [GitHub Actions](https://github.com/yusun1115/Haeorum-apt.com/actions/workflows/deploy-pages.yml)에서 확인할 수 있습니다.

## 조작

- 시작 화면에서 게임 안에서 사용할 작업자명을 입력합니다.
- 좌측 메뉴와 가짜 브라우저의 뒤로·앞으로·새로고침 버튼으로 페이지를 조사합니다.
- `검사 모드`는 파일명·링크·세션 ID 단서를 표시합니다.
- `작업 로그`는 페이지 이동과 티켓 처리 기록을 보여줍니다.
- `효과 완화`는 글리치·노이즈·깜빡임을 줄이고, `음소거`는 Web Audio 효과음을 끕니다.
- 엔딩 화면의 `새 게임` 버튼으로 저장 상태를 초기화할 수 있습니다.

## 저장 데이터 초기화

게임 내부의 `새 게임` 버튼을 사용하거나, 개발자 도구 콘솔에서 다음을 실행합니다.

```js
localStorage.removeItem('haeroum-apt-game-v1');
location.reload();
```

## 리소스

- `public/images/`: 아파트 전경, 복도, 관리사무소, 주차장, 픽셀 UI 및 엔딩 아트 에셋
- 추가 아트 에셋: 101호 현관 단서, XP 제목 표시줄·창 컨트롤·파비콘, 게시판 분류 배지, 오류·복구·오염 문서 아이콘, 상태 표시줄 그립
- `src/fonts/Galmuri9.ttf`: 본문·메뉴·버튼·로그용 사용자 제공 폰트
- `src/fonts/Galmuri11.ttf`: 제목·로고·배너·팝업용 사용자 제공 폰트
- 효과음: 별도 음원 파일 대신 첫 사용자 입력 이후 Web Audio API로 합성

## 현재 범위와 제한

- 현재 구현: XP 시절 IE풍 브라우저 크롬, 5개 유지보수 티켓, 검사 모드, 작업 로그, 3개 엔딩, `localStorage` 저장, 호러 효과 완화 옵션, 침입도 기반 공포 이벤트, 내부 팝업 폭주, 가짜 블루스크린·레드스크린, `WATCH_666` 오염 페이지, 주민·외부인 게시판 확장
- 위 확장 연출은 실제 브라우저/운영체제 오류나 바이러스가 아니라 게임 내부 DOM 시뮬레이션으로만 구현합니다. 새 창·탭, `alert`, 파일 접근, 브라우저 잠금, 카메라·마이크 권한 요청은 사용하지 않습니다.
- 데스크톱 1024×768 기준의 고정 폭 레이아웃이며, 1024px 미만에서는 가로 스크롤을 사용합니다.
- 추가 과거 페이지, 다회차 콘텐츠, 음성 메시지, 네 번째 엔딩은 MVP 이후 범위입니다.
- 브라우저 실기기 검증은 현재 로컬 Chromium 기반 환경에서 완료했습니다.
