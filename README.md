# MaplibreBoard (Self-Hosted)

## 📝 프로젝트 요약
Next.js(Pages Router + API Routes) 기반의 인터랙티브 지도 게시판입니다. **MapLibre GL**을 사용하여 그리드 단위로 보드를 시각화하며, **Prisma ORM**을 통해 로컬 서버에 직접 설치된 **PostgreSQL**에 데이터를 저장합니다. 외부 클라우드 의존성을 제거하고 독립적인 서버 환경에서 구동되도록 최적화되었습니다.

## 🌐 배포 및 접속 정보
- **배포 주소:** [https://pyeong.p-e.kr](https://pyeong.p-e.kr)
- **운영 환경:** Ubuntu (Linux) / Nginx (Reverse Proxy) / Node.js v24
- **데이터베이스:** 로컬 PostgreSQL (Self-managed)
- **프로세스 관리:** PM2 (무중단 운영)

## 🌿 브랜치 전략 (Branch Strategy)
이 저장소는 안전한 개발 및 무중단 배포를 위해 다음과 같은 브랜치 구조를 사용합니다.
- `main`: 운영 서버에 직접 무중단 배포되는 최신 안정 버전(Production) 브랜치입니다.
- `dev`: 신규 기능 테스트 및 활발한 개발이 이루어지는 메인 개발(Development) 브랜치입니다. 기능 추가 시 `dev` 브랜치에서 분기한 뒤 검증을 거쳐 `dev`로 병합합니다.

---

## 🚀 빠른 시작 (Local Server Setup)

### 1. 로컬 PostgreSQL 설치 및 권한 설정
서버에 데이터베이스를 설치하고 프로젝트 전용 사용자와 권한을 설정합니다.

```bash
# PostgreSQL 설치
sudo apt update && sudo apt install postgresql

# DB 및 사용자 생성 (sudo -u postgres psql 접속 후 실행)
CREATE DATABASE maplibre_db;
CREATE USER [DB_USER] WITH PASSWORD '[DB_PASSWORD]';
GRANT ALL PRIVILEGES ON DATABASE maplibre_db TO [DB_USER];

# 생성한 데이터베이스로 이동 (\c database_name)
\c maplibre_db

# 권한 설정 (PostgreSQL 15+ 대응)
GRANT ALL ON SCHEMA public TO [DB_USER];
ALTER SCHEMA public OWNER TO [DB_USER];
```

### 2. 환경 변수 설정 (.env)
> [!IMPORTANT]
> 이 프로젝트는 외부 DB를 사용하지 않고, **로컬 PostgreSQL DB**를 기본적으로 사용합니다.

프로젝트 루트 폴더에 `.env` 파일을 생성하고 로컬 DB 주소와 관리자 비밀번호를 입력합니다. (Git 제외 대상)

```env
DATABASE_URL="postgresql://[DB_USER]:[DB_PASSWORD]@localhost:5432/maplibre_db"
ADMIN_PASSWORD="your_admin_password_here"
```

### 3. 의존성 설치 및 DB 동기화
터미널에서 아래 명령어를 실행하여 테이블 구조를 생성합니다.

```bash
# 패키지 설치
npm install

# Prisma Client 생성 및 로컬 DB 테이블 생성
npx prisma generate
npx prisma db push
```

### 4. WSL (Ubuntu) 기반 로컬 테스트 및 검증
데이터베이스(PostgreSQL)가 WSL 환경에 기동되어 있는 경우, 아래 가이드를 통해 기능을 테스트할 수 있습니다.

1. **WSL 접속 및 PostgreSQL 실행**
   Windows 터미널에서 WSL Ubuntu를 실행하고 아래 명령어로 데이터베이스 서비스를 켭니다.
   ```bash
   sudo service postgresql start
   ```

2. **WSL 내에서 프로젝트 경로 이동 및 패키지 설치**
   마운트된 프로젝트 디렉토리로 이동한 뒤, 의존성 패키지를 최종 설치 및 정리합니다.
   ```bash
   cd /home/username/workspace/MaplibreBoard
   npm install
   ```

3. **DB 테이블 스키마 동기화**
   Prisma CLI를 통해 로컬 DB에 새로 추가된 컬럼(`image_url` 등)을 연동합니다.
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **로컬 개발 서버 실행 및 브라우저 테스트**
   ```bash
   npm run dev
   ```
   서버가 켜지면 브라우저를 통해 `http://localhost:3000/board?id=1` 혹은 격자 좌표로 접속하여 이미지 첨부, 글 작성 및 이미지 확대(Lightbox) 동작을 검증할 수 있습니다.

### 5. 빌드 및 배포 실행 (PM2)
```bash
# 프로젝트 빌드
npm run build

# PM2를 이용한 백그라운드 가동
pm2 start npm --name "map-board" -- start

# 서버 재부팅 시 자동 실행 저장
pm2 save
pm2 startup
```

### 6. 운영 서버 업데이트 및 무중단 배포 (SSH & PM2)
이미 가동 중인 원격 우분투 서버가 존재하고 SSH로만 접근이 가능한 상태에서 이미지 검열 갤러리 및 DB 업데이트 등을 안전하게 적용하는 방법입니다.

1. **로컬 작업 완료 후 원격 코드 갱신**
   로컬의 최신 커밋들을 깃허브 원격 저장소에 푸시하고, 서버로 SSH 접속하여 최신 소스를 동기화합니다.
   ```bash
   # [로컬 터미널] 코드 푸시
   git push origin main

   # [SSH 서버 터미널] 접속 및 소스 다운로드
   ssh user@your-server-ip
   cd /home/username/workspace/MaplibreBoard  # 실제 서버 경로로 이동
   git fetch --all
   git pull origin main
   ```

2. **패키지 설치 및 DB 스키마 마이그레이션**
   새로 도입된 이미지 저장 스키마 필드(`image_url` 등)를 로컬 PostgreSQL 데이터베이스에 무중단으로 반영합니다.
   ```bash
   # 패키지 설치
   npm install

   # Prisma 스키마 동기화 (기존 DB 데이터 유지됨)
   npx prisma generate
   npx prisma db push
   ```

3. **물리 업로드 디렉토리 권한 설정**
   업로드된 이미지들이 저장될 폴더를 마련하고, 백그라운드 Node 프로세스가 파일 생성 및 쓰기를 수행할 수 있도록 권한을 보장합니다.
   ```bash
   mkdir -p uploads
   chmod 755 uploads
   ```

4. **빌드 및 서비스 무중단 재로드**
   ```bash
   # Next.js 프로덕션 빌드
   npm run build

   # PM2 무중단 재로드
   pm2 reload map-board

   # 서버 작동 실시간 모니터링
   pm2 logs map-board
   ```

### 7. 피처 브랜치(Feature Branch) 서버 단독 테스트 방법
메인(`main`) 브랜치에 병합하기 전, 특정 개발 브랜치(예: `49-feature-...`)만 서버로 가져와 독립적으로 빌드하고 테스트하는 절차입니다.

1. **[로컬] 작업 내용 커밋 및 원격 피처 브랜치 푸시**
   ```bash
   git add .
   git commit -m "feat: 개발 내용 요약"
   git push origin [피처-브랜치-명]
   ```

2. **[서버] SSH 접속 및 피처 브랜치 체크아웃**
   서버에서 원격 저장소 정보를 최신화한 후 해당 피처 브랜치로 전환합니다.
   ```bash
   # 원격 브랜치 정보 갱신
   git fetch origin
   
   # 특정 피처 브랜치로 전환
   git checkout [피처-브랜치-명]
   ```

3. **[서버] 의존성 및 DB 동기화**
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```

4. **[서버] 빌드 및 PM2 재기동**
   ```bash
   npm run build
   pm2 reload map-board  # 혹은 pm2 restart map-board
   ```

5. **[서버] 메인 브랜치 업데이트 및 서비스 반영 (원클릭 복사 스크립트)**
   피처 브랜치 검증이 끝난 후, 또는 서버에서 메인(`main`) 브랜치만 신속히 불러와 전체 업데이트를 진행하려면 아래 명령어 블록을 전체 복사하여 서버 터미널에 붙여넣기 하시면 됩니다. (Prisma 클라이언트 생성 및 DB 마이그레이션 적용이 포함되어 있습니다.)
   ```bash
   git checkout main
   git pull origin main
   npm install
   npx prisma generate
   npx prisma db push
   npm run build
   pm2 reload map-board
   ```

---

## 🛠 핵심 기능

### 🗺️ 인터랙티브 지도 (MapLibre GL JS)
- **멀티 모드:** OSM(기본), Satellite(위성), Globe(지구본) 전환 지원
- **상태 유지:** 마지막 지도 뷰(좌표, 줌, 모드)를 localStorage에 저장하여 재접속 시 자동 복원
- **그리드 히트맵:** 게시물 수(`posts_count`)에 따라 그리드 색상을 실시간으로 시각화 (Blue ↔ Red)

### 🎯 그리드 보드 및 게시글
- **자동 생성:** 지도 클릭 시 해당 좌표에 보드가 없으면 DB에 즉시 생성 후 이동 (SQL INSERT 컬럼-값 누수 버그 수정 완료로 500 오류 없이 안정적으로 자동 생성됨)
- **보안 검증:** 게시글 수정/삭제 시 비밀번호 해싱(SHA-256) 기반 권한 검증 구현 완료 (PUT 요청 시 권한 검증 누락 우회 취약점 패치 적용)
- **인용 무결성 보존을 위한 소프트 딜리트 (NEW):** 글 삭제 시 데이터베이스에서 레코드를 하드 삭제하지 않고, 본문 내용을 `(이 글은 삭제되었습니다)`로 교체 및 닉네임, 패스워드, 이미지 링크 등의 정보를 청소하는 소프트 딜리트(Soft-delete) 구조로 개선했습니다. 이를 통해 타 게시글들이 가리키고 있는 인용(`>>글번호`) 및 역참조(Backlinks) 연결 구조가 깨지는 현상을 완벽히 방어합니다.
- **접근성:** 보드 ID 또는 그리드 좌표(X, Y) 쿼리 파라미터를 통한 유연한 페이지 접속
- **즉시 반영:** 새 글 작성 후 캐시를 비우고 즉시 목록을 다시 불러와 페이지를 새로고침할 때 지연 없이 최신 글이 표시됨 (날짜 표시 버그 수정 완료로 실제 작성 시간이 올바르게 표시됨)
- **이미지 업로드 및 Lightbox:** 게시물 작성 시 이미지를 첨부(Base64 업로드)하여 로컬 디렉토리에 저장하고, Lightbox를 통해 모달 형식의 확대 보기가 가능합니다. (MIME 확장자 allow-list 검증을 통해 허용되지 않는 확장자 및 SVG 파일 기반의 Stored XSS 보안 취약점 차단 완료. 모바일 기기의 HEIC/HEIF 이미지 자동 변환 및 대용량 이미지 클라이언트 측 압축 지원 추가 완료)
- **클립보드 이미지 붙여넣기 (NEW):** 글 작성 본문 영역에서 클립보드에 있는 이미지를 `Ctrl+V` 단축키로 직접 붙여넣어(Paste) 즉시 에셋으로 첨부할 수 있습니다. 텍스트로 된 파일명이나 이진 데이터 대신 실제 이미지를 분석하여 기존 파일 업로드 로직(HEIC 자동 변환, 클라이언트 측 용량 압축 등)과 동일하게 안전하고 유연하게 처리합니다.
- **글자 수 제한 및 실시간 카운터 (NEW):** 악성 도배 방지 및 UI 깨짐 예방을 위해 닉네임(최대 20자)과 본문(최대 1000자) 글자 수 제한을 프론트엔드와 API 서버 양측에 적용했습니다. 텍스트 입력창 아래에는 실시간 글자 수 카운터(유리 효과 디자인)가 표시되며 글자 수가 한계에 도달하면 주황색/빨간색 경고 색상 변화 및 흔들림 애니메이션 효과가 작동합니다.
- **자동 확장형 텍스트 필드 (NEW):** 글이 길어지더라도 스크롤바가 생기지 않고 입력란 높이가 텍스트 길이에 맞춰 자동으로 확장되는 유연한 텍스트 영역(Auto-resize Textarea)을 제공합니다.
- **맨 위로 이동 버튼 (NEW):** 스크롤이 길어질 경우 편리한 탐색을 위해 게시판(`/board`) 및 전체 피드(`/all`) 페이지의 우측 하단에 부드럽게 나타나는 플로팅 맨 위로 이동 버튼(Scroll to Top)을 추가했습니다. 400px 이상 스크롤 다운 시 페이드인 애니메이션과 함께 나타나며, 클릭 시 상단으로 부드럽게(smooth scroll) 스크롤됩니다.
- **글 작성 후 주소창 자동 동기화 및 최초 진입 시 해시 스크롤 (NEW):** 특정 글을 가리키는 해시(`#post-ID`) 주소로 진입하여 글을 읽던 중 새 글을 작성하면, 작성 완료 후 주소창의 해시를 페이지 새로고침 없이 제거하고 메인 게시판 주소인 `/board?id=BOARD_ID`로 깔끔하게 동기화(`router.replace`)합니다. 이를 통해 글을 새로 쓸 때마다 이전 해시 포스트 위치로 강제 스크롤되는 오작동을 해결하였습니다. 또한 해시 기준 자동 스크롤은 오직 페이지 최초 진입 및 새로고침 시에만 1회 동작하도록 예외 처리를 반영하였습니다.
- **글 고유 주소 공유 기능 (링크 복사) (NEW):** 게시판의 개별 포스트 카드와 전체 글 피드 카드 내에 `[공유]` 버튼을 추가했습니다. 클릭 시 해당 글의 고유 주소(`https://[domain]/board?id=BOARD_ID#post-POST_ID`)를 클립보드에 바로 복사하며, 화면 하단에 세련된 반투명(Glassmorphic) 토스트 창으로 "글 주소가 클립보드에 복사되었습니다." 알림을 부드러운 애니메이션과 함께 띄워 사용자 편의성을 극대화했습니다.
- **로컬스토리지 기반 닉네임 기억하기 (자동 완성/고정) (NEW):** 작성자의 편의성을 증대하고 서비스의 핵심 철학인 '완전한 익명성'을 수호하기 위해 브라우저의 `localStorage`를 연동한 클라이언트 레벨의 닉네임 기억 기능을 추가했습니다. 글 작성 시 `[닉네임 기억하기]` 체크박스를 활성화하면 작성 후에도 닉네임이 입력 칸에 보존되며 페이지 새로고침 시에도 자동 복원됩니다. 반면, 체크를 해제하면 스토리지 내 저장 내역이 즉시 폐기되고 글 작성 성공 시 필드도 빈칸으로 자동 클리어되어 의도하지 않은 필명 노출을 원천 차단합니다.

### 📊 전체 글 피드 (All Feed) (NEW)
- **통합 타임라인:** 모든 격자 게시판에 흩어져 있는 게시글들을 최신 시간순으로 통합하여 한눈에 확인할 수 있는 모아보기 기능입니다.
- **인터랙티브 그리드:** 뷰 전용 피드 카드 그리드를 제공하며, 카드를 클릭하면 해당 게시물이 작성된 실제 격자 게시판(`/board?id=BOARD_ID`)으로 즉시 이동합니다.
- **라이트박스 연동:** 피드 카드 내의 이미지를 클릭하면 페이지 이동 없이 그 자리에서 이미지를 확대해서 감상할 수 있는 라이트박스 뷰어가 실행됩니다.

### 🛡️ 어드민 대시보드 및 서버 모니터링 (NEW)
- **업로드 이미지 리스트 및 고립 파일(Orphaned File) 감지:** 서버의 물리적 업로드 디렉토리(`uploads/`)와 PostgreSQL DB를 정밀 분석하여 사용 중인 이미지 및 DB 연동이 유실된 무관한 이미지 파일을 유기적으로 매핑해 줍니다.
- **3단계 검열 처리 및 소프트 딜리트:** 
  1. *이미지 파일만 삭제*: 게시글 내용은 그대로 유지하되, 물리 파일을 삭제하고 DB `image_url` 필드를 `'censored'`로 설정하여 UI 상에 `🚫 이미지 검열됨` 박스가 렌더링되게 만듭니다.
  2. *전체 게시글 삭제*: 인용 관계 무결성을 위해 게시글을 물리 삭제하지 않고 본문을 `(이 글은 삭제되었습니다)`로 마킹하고, 연결된 이미지 파일을 함께 소거합니다.
  3. *파일 완전 삭제*: 게시글과 연결되지 않은 고립(Orphaned) 이미지 파일을 서버에서 안전하게 소거합니다.
- **검열 갤러리 내 게시글 앵커 네비게이션:** 대시보드 검열 화면 내 각 글 항목에 있는 바로가기 버튼을 새 탭(`target="_blank"`) 형식으로 열리도록 개선하고, 단순 보드 이동이 아닌 특정 글 번호 앵커(예: `#post-XX`) 경로로 곧바로 연결하여 대상 글로의 자동 포커스 및 스크롤을 구현했습니다.
- **보안 공격 Mitigation:** 이미지 파일 소거 요청 시 파일명의 디렉토리 경로 우회 패턴(Path Traversal) 검증 알고리즘을 도입하여 지정된 디렉토리 밖의 중요 서버 파일이 훼손되지 않도록 보호합니다.
- **어드민 페이지 새로고침 시 탭 상태 유지:** 어드민 대시보드 내에서 탭을 전환하면 주소창에 URL 쿼리 파라미터(예: `?tab=censorship`)가 실시간으로 동기화됩니다. 새로고침을 실행하더라도 주소창의 쿼리를 분석하여 이전에 작업 중이던 '이미지 검열 및 관리' 탭으로 바로 렌더링되도록 개선하여 작업 연속성을 크게 높였습니다.
- **실시간 서버 로그 모니터링 (PM2 연동):** 관리자 화면 내에서 서버의 실시간 PM2 로그(out, error)의 최근 200줄을 직접 스트리밍하여 모니터링할 수 있는 콘솔 터미널 탭을 제공합니다. 로그가 새로고침되거나 탭이 활성화될 때 스크롤이 자동으로 가장 아래로 이동되어 최신 로그 상태를 빠르게 볼 수 있습니다.
- **다중 사용자 로그 경로 유연화 (`PM2_USER`):** 각 배포 서버 및 개발 환경별로 PM2 로그의 홈 경로가 다를 수 있는 문제를 해결하기 위해, `.env` 파일에 `PM2_USER` 환경변수값(예: `PM2_USER="pyeongju"`)에 기반하여 로그 파일 경로(`~/.pm2/logs/...`)를 동적으로 추적할 수 있도록 지원합니다. (미지정 시 현재 실행 계정 홈 디렉토리 기본 사용)

### 📊 기기 및 위치 정보 분석 (GeoIP & UA Parser) (NEW)
- **접속 IP 기반 대략적인 위치 분석 (GeoIP):** 외부 API 의존성 없이 `geoip-lite` 라이브러리를 통해 로컬에서 클라이언트 IP 기준의 국가 및 도시 정보(`location`)를 실시간 매핑하여 데이터베이스에 함께 기록합니다. (로컬/사설망 대역은 `Local`로 자동 분류)
- **User-Agent 기반 기기/브라우저 식별:** 작성자가 글을 등록할 때의 User-Agent 헤더 정보를 분석하여 OS(Windows, Android, iOS, macOS, Linux) 및 브라우저(Whale, Opera, Edge, Chrome, Safari, Firefox, IE)를 명확히 분류한 후 각각 데이터베이스의 독립된 컬럼에 안전하게 보관합니다.
- **감사 및 모니터링 편의성 제공:** 일반 게시판 화면에는 개인 기기 정보 노출을 전면 방지(일반 API 응답 필드 배제)하며, 관리자 대시보드(`/admin`)의 게시글 관리 목록 테이블에서만 각 작성자의 IP 주소, 위치 정보 배지, 그리고 OS/브라우저 배지 형식을 일원화하여 한눈에 모니터링할 수 있도록 설계했습니다.

### 🔗 글 번호 기반 상호 참조 및 이동 (인용 기능) (NEW)
- **간편한 인용 기입:** 게시글 번호 배지(`No. XX`)를 클릭하면 글쓰기 본문에 자동으로 `>>XX` 인용 텍스트가 삽입됩니다.
- **클릭 스크롤 및 하이라이트:** 본문에 기입된 `>>XX` 혹은 `@XX` 인용 태그를 클릭하면 해당 게시글이 위치한 영역으로 화면이 부드럽게 스크롤되며, 대상 카드가 부드러운 푸른색 배경 점멸 이펙트(`.highlight-flash`)로 강조됩니다.
- **호버 팝오버 미리보기:** 인용 태그에 마우스를 올리면 원글의 작성자, 작성 시간, 본문 내용 및 보드 위치가 포함된 플로팅 미리보기 카드(Glassmorphism 테두리 빔 스타일)가 실시간으로 팝업됩니다.
- **타 보드 자동 이동:** 다른 게시판에 속한 글을 인용한 경우, 클릭 시 해당 보드 주소(예: `/board?id=Y#post-XX`)로 자동 리다이렉트되고 페이지 로드 후 즉시 대상 글로 스크롤 및 하이라이트 처리가 수행됩니다.
- **역참조(Backlinks) 표시:** 특정 게시글을 언급(인용)한 다른 글들의 번호 목록(`↳ 인용한 글: >>YY`)을 글 하단에 모아서 보여주어 글 사이의 연결 관계와 대화 흐름을 한눈에 파악할 수 있습니다.

---

## 🏗 시스템 아키텍처

- **Reverse Proxy:** Nginx가 80(HTTP)을 443(HTTPS)으로 리다이렉트하고 3000번 포트로 전달
- **App Server:** Next.js (PM2로 프로세스 관리)
- **DB Server:** 동일 서버 내 로컬 PostgreSQL (Prisma ORM 연결)

---

## 📂 프로젝트 구조
    MaplibreBoard/
    ├── prisma/            # DB 모델(schema.prisma)
    ├── backup/            # 게시판 데이터 CSV 백업 (날짜별 폴더 내 boards.csv, posts.csv 등)
    ├── pages/
    │   ├── api/           # 백엔드 API 핸들러
    │   │   ├── admin/     # 어드민 전용 API
    │   │   │   ├── images.js # 어드민 이미지 조회 및 검열 API (NEW)
    │   │   │   ├── logs.js   # 어드민 PM2 로그 실시간 조회 API (NEW)
    │   │   │   ├── posts.js  # 어드민 전체 게시글 목록(IP/기기 포함) 조회 API (NEW)
    │   │   │   └── verify.js # 관리자 비밀번호 서버 사이드 검증 API (NEW)
    │   │   ├── boards/    # 게시판 보조 API
    │   │   │   └── grid/[gridX]/[gridY]/ensure.js # 격자 좌표 기준 게시판 자동 생성 및 확인 API
    │   │   ├── posts/     # 게시글 보조 API
    │   │   │   └── verify.js # 개별 게시글 비밀번호 권한 검증 API (NEW)
    │   │   ├── uploads/   # 업로드 파일 서빙 API
    │   │   │   └── [...file].js # 업로드된 물리 이미지 파일 보안 서빙 API (NEW)
    │   │   ├── boards.js  # 게시판 기본 조회/생성 API
    │   │   ├── posts.js   # 게시글 CRUD 및 IP/기기 메타데이터 수집 API
    │   │   └── upload.js  # 이미지 파일 업로드 처리 API
    │   ├── index.js       # 랜딩 페이지 (전체 피드 버튼 추가)
    │   ├── map.js         # 메인 지도 인터페이스
    │   ├── rasterMap2.js  # 이전 주소(/map) 리다이렉트용
    │   ├── board.js       # 게시판 및 CRUD 로직 (날짜 필드 버그 수정)
    │   ├── all.js         # 전체 글 피드 페이지 (NEW)
    │   └── admin.js       # 관리자 페이지 (UI 갤러리 개편)
    ├── components/        # 리팩토링된 공통 React 컴포넌트 (NEW)
    │   ├── BoardSidebar.js # 게시판 정보 사이드바 컴포넌트
    │   ├── WriteForm.js    # 새 글 작성 폼 컴포넌트
    │   ├── PostCard.js     # 게시글 카드 뷰 컴포넌트
    │   ├── Lightbox.js     # 이미지 확대 라이트박스 모달
    │   ├── PostContent.js  # 본문 내 글 인용 파싱 및 안전한 이스케이프 렌더링 컴포넌트 (NEW)
    │   └── PostPreview.js  # 인용 호버 시 띄우는 플로팅 미리보기 컴포넌트 (NEW)
    ├── lib/               # 공통 DB 인스턴스 및 헬퍼 유틸리티
    │   ├── db.js          # pg DB 연결 인스턴스
    │   ├── utils.js       # 공통 텍스트/시간 헬퍼 유틸리티 (NEW)
    │   └── imageUtils.js  # 이미지 변환/압축 헬퍼 유틸리티 (NEW)
    ├── uploads/           # 업로드된 물리 이미지 파일 저장소 (NEW: public 폴더 외부로 이동)
    ├── public/            # 정적 파일 (아이콘 이미지 등)
    ├── styles/            # 전역 및 컴포넌트 스타일시트
    │   ├── globals.css    # 전역 스타일 초기화
    │   ├── index.css      # 메인 랜딩/지도 페이지 스타일시트
    │   ├── board.css      # 게시판 컴포넌트 스타일시트 (NEW)
    │   ├── all.css        # 전체 글 피드 스타일시트 (NEW)
    │   └── admin.css      # 어드민 페이지 스타일시트 (NEW)
    └── next.config.js     # Next.js 설정

---

## 🚨 확인된 이슈 및 향후 계획 (TODO)
- [x] 런타임 이미지 404 에러 해결 (캐시 우회 및 동적 서빙): [troubleshooting.md](./troubleshooting.md) 문서 참고
- [x] 모바일 환경 이미지 업로드 이슈 해결: 모바일 브라우저의 `<label>` 클릭 전달 버그 해결, HEIC/HEIF 이미지 자동 JPEG 변환 및 모바일 대용량 이미지 클라이언트 측 압축 적용
- [x] 백엔드 API 로그(console.log/console.error) 5W1H 감사 로깅 강화: 자세한 로깅 사양 및 구성은 [logging.md](./logging.md) 문서 참고
- [ ] 0,0 좌표 보정: 특정 좌표 클릭 시 비정상 이동 문제 디버깅
- [ ] 검색 기능 강화: 지명 검색을 통한 위치 이동(flyTo) 기능 도입
- [ ] 백업 자동화: 정기적인 데이터베이스 백업 스크립트 개선
- [x] 관리자 기능 확장: admin.js 이미지 검열 갤러리 뷰 도입 및 파일-DB 무결성 관리 구현
- [ ] 인증 고도화: 관리자 비밀번호 방식을 서버사이드 JWT 인증으로 교체


---

## 📄 라이선스 및 참고
- Map Library: MapLibre GL JS
- Map Tiles: OpenStreetMap, Esri World Imagery
