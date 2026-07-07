# 학생 수행평가 확인 서비스 (Student Assessment Checker)

학생/학부모/교사가 수행평가 등록, 채점, 결과 확인을 할 수 있는 웹 서비스.

## 사용자 유형

- **학생**: 본인 수행평가 결과 조회
- **학부모**: 자녀(1명 이상) 수행평가 결과 조회
- **교사**: 학급/평가 항목 등록, 채점, 결과 공개

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Prisma 7 (`@prisma/adapter-pg` 드라이버 어댑터) + PostgreSQL
- 인증: `jose` (JWT 세션 쿠키, httpOnly/secure) + `bcryptjs` (비밀번호 해시)
- 검증: `zod`
- 테스트: `vitest`

## 프로젝트 구조

```
prisma/
  schema.prisma          # User/Class/Enrollment/Assessment/Submission/Score/ParentChild 등 데이터 모델
  migrations/             # 마이그레이션 이력 (아래 "로컬 개발 DB" 참고)
  seed.ts                 # 테스트용 시드 데이터
src/
  app/                    # Next.js App Router 페이지 및 API 라우트
  lib/
    prisma.ts             # Prisma Client 싱글턴 (adapter 방식)
    session.ts            # JWT 세션 encrypt/decrypt/생성/삭제
    dal.ts                # Data Access Layer — 세션 검증, 인가 로직의 단일 진입점
    services/             # 역할별 권한 체크가 포함된 비즈니스 로직 (Prisma 접근은 여기서만)
  proxy.ts                # 최적화된(optimistic) 인증 리다이렉트 (구 middleware.ts)
  generated/prisma/       # `prisma generate` 산출물 (git 추적 안 함)
```

## 로컬 개발 환경 설정

1. 의존성 설치
   ```bash
   npm install
   ```
2. `.env` 파일 생성 (`.env.example` 참고)
3. 로컬 PostgreSQL 준비. 별도 DB가 없다면 Prisma가 제공하는 로컬 개발용 Postgres를 사용할 수 있습니다:
   ```bash
   npx prisma dev -d
   ```
   실행 후 출력되는 연결 문자열을 `.env`의 `DATABASE_URL`에 넣으세요.
4. 스키마 반영 및 시드 데이터 생성
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. 개발 서버 실행
   ```bash
   npm run dev
   ```
   [http://localhost:3000](http://localhost:3000) 접속.

## 환경 변수

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `SHADOW_DATABASE_URL` | `prisma migrate dev`/`migrate diff` 실행 시에만 필요한 shadow DB. `npx prisma dev` 사용 시 출력되는 값을 사용 |
| `SESSION_SECRET` | 세션 JWT 서명 키. `openssl rand -base64 32`로 생성 |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` | 알림 메일 발송용 SMTP 설정. 비워두면 로컬 개발 시 메일을 실제로 보내지 않고 로그로만 출력 |
| `APP_URL` | 알림 메일에 포함되는 링크의 기준 URL |
| `CRON_SECRET` | 마감임박/미제출 알림을 트리거하는 API(`/api/notifications/run-reminders`)를 보호하는 공유 비밀값 |

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` / `npm run start` | 프로덕션 빌드/실행 |
| `npm run lint` | ESLint |
| `npm test` | Vitest 테스트 실행 |
| `npm run db:push` | 스키마를 DB에 직접 반영 (로컬 개발용, 마이그레이션 이력 없음) |
| `npm run db:migrate` | `prisma migrate dev` (실제 PostgreSQL 대상. 로컬 번들 DB에서는 아래 주의사항 참고) |
| `npm run db:deploy` | `prisma migrate deploy` (프로덕션/CI) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | 시드 데이터 생성 |

## 로컬 개발 DB(`npx prisma dev`) 관련 주의사항

`npx prisma dev`가 제공하는 번들 Postgres는 경량 구현으로, `prisma migrate dev` / `prisma migrate resolve` 실행 시 `P1017 Server has closed the connection` 오류가 발생할 수 있습니다 (schema-engine이 요구하는 일부 기능 미지원). 이 환경에서는:

1. 스키마 변경 후 `npm run db:push`로 로컬 DB에 반영
2. `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`로 마이그레이션 SQL 파일을 생성해 `prisma/migrations/`에 커밋 (이력 보존용)
3. 필요 시 `_prisma_migrations` 테이블에 해당 마이그레이션을 적용됨으로 수동 기록

실제 PostgreSQL(프로덕션, CI, Docker 등)에서는 이런 제약이 없으며 `prisma migrate dev`/`migrate deploy`가 정상 동작합니다.

## 배포 체크리스트

- [ ] 실제 PostgreSQL 인스턴스 준비, `DATABASE_URL` 설정
- [ ] `SESSION_SECRET`을 강력한 랜덤 값으로 설정 (개발용 기본값 사용 금지)
- [ ] SMTP 자격 증명 설정 (미설정 시 알림 메일이 발송되지 않고 로그로만 남음)
- [ ] `CRON_SECRET` 설정 및 외부 스케줄러(예: Vercel Cron, GitHub Actions 스케줄, OS cron)에서 `/api/notifications/run-reminders`를 주기적으로 호출하도록 구성 — Next.js 자체에는 내장 스케줄러가 없음
- [ ] `npm run build` 성공 확인
- [ ] `npm run db:deploy`로 마이그레이션 적용
- [ ] `npm test` / CI(`.github/workflows/ci.yml`) 통과 확인
- [ ] `docs/qa-checklist.md` 수동 QA 시나리오 점검

## Vercel 배포

이 저장소는 Vercel 배포에 필요한 설정을 포함하고 있습니다: `vercel.json`(빌드 명령 + 알림 Cron Job),
`vercel-build` 스크립트(마이그레이션 자동 적용), `.env.production.example`(운영 환경변수 목록).

### 1. 데이터베이스 준비

Vercel의 서버리스 함수에서 접근 가능한 PostgreSQL이 필요합니다 (Vercel Postgres, Neon, Supabase,
Railway 등 중 택1). 연결 풀링(pgbouncer 등)을 쓰는 provider도 `@prisma/adapter-pg`(`pg` 드라이버)가
표준 Postgres 프로토콜을 사용하므로 문제없이 동작합니다.

### 2. 프로젝트 연결 및 환경변수 설정

1. Vercel에서 이 GitHub 저장소를 Import (프레임워크는 Next.js로 자동 감지됨).
2. Project Settings → Environment Variables에 `.env.production.example`에 정리된 변수를 모두
   **Production**(필요 시 Preview에도) 환경에 등록합니다: `DATABASE_URL`, `SESSION_SECRET`,
   `SMTP_*`, `APP_URL`, `CRON_SECRET`.
   - `SESSION_SECRET`, `CRON_SECRET`은 각각 `openssl rand -base64 32`로 생성한 값을 사용하고,
     로컬 개발용 값과 절대 공유하지 않습니다.
   - `APP_URL`은 실제 배포 도메인(예: `https://your-app.vercel.app`)으로 설정합니다.

### 3. 빌드 시 마이그레이션 자동 적용

Vercel은 `package.json`에 `vercel-build` 스크립트가 있으면 기본 빌드 명령 대신 이를 사용합니다.
이 저장소의 `vercel-build`는 다음과 같이 정의되어 있습니다:

```json
"vercel-build": "prisma migrate deploy && next build"
```

즉, 매 배포마다 `prisma/migrations`의 미확인 마이그레이션이 프로덕션 DB에 먼저 적용된 뒤
빌드가 진행되며, 마이그레이션이 실패하면 배포도 실패합니다(운영 DB에 검증되지 않은 스키마가
반영되는 것을 방지). `vercel.json`의 `buildCommand`도 `npm run vercel-build`로 명시되어 있어
Dashboard에서 빌드 명령을 별도로 바꾸지 않아도 됩니다.

### 4. 알림 Cron Job

`vercel.json`에 아래와 같이 마감임박/미제출 알림용 Cron Job이 등록되어 있습니다:

```json
"crons": [{ "path": "/api/notifications/run-reminders", "schedule": "0 0 * * *" }]
```

Vercel은 `CRON_SECRET`이라는 이름의 환경변수가 설정되어 있으면 Cron Job 호출 시 자동으로
`Authorization: Bearer $CRON_SECRET` 헤더를 붙여 보내므로, 위 2번 단계에서 `CRON_SECRET`을
설정하기만 하면 별도 인증 설정 없이 안전하게 동작합니다. 스케줄(`0 0 * * *`, 매일 UTC 00시)은
Hobby 플랜의 1일 1회 제한에 맞춘 기본값이며, Pro 플랜 이상에서는 더 잦은 주기로 조정할 수
있습니다.

### 5. 배포 전 CI 게이트

`.github/workflows/ci.yml`이 push/PR마다 lint → 마이그레이션 적용 → test → 프로덕션 빌드 검증을
순서대로 실행합니다. GitHub 저장소의 **Settings → Branches → Branch protection rules**에서
`main` 브랜치에 이 워크플로우(`lint-and-test`)를 필수 상태 검사(required status check)로 지정하면,
CI를 통과하지 못한 변경은 `main`에 머지될 수 없고 따라서 Vercel의 Git 연동 자동 배포도 트리거되지
않습니다.

### 6. 배포 확인

1. `main`에 push (또는 PR 머지) → Vercel이 자동으로 빌드/배포.
2. 배포된 URL에서 로그인/회원가입, 채점, 결과 확인 플로우를 한 번씩 수동 점검
   (`docs/qa-checklist.md` 참고).
3. `curl -X POST https://<배포-URL>/api/notifications/run-reminders -H "x-cron-secret: $CRON_SECRET"`
   로 알림 API가 정상 응답하는지 확인.
