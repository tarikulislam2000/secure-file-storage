# 🏛 System Design & Architecture

## 1. Overview

Secure File Storage is a full-stack file management platform that enables authenticated users to securely upload, manage, and share files up to 100 MB. A Next.js 16.0.3 monolith handles authentication, authorization, and PostgreSQL database operations, while all heavy binary file payloads stream directly between the client browser and AWS S3 via time-limited Presigned URLs.

---

## 2. Architecture Diagram

+-------------------------+
| Client Browser |
+------------+------------+
| 1. POST /api/files/upload-url (Auth + Metadata)
|
v
+-----------------------------------------------------------------------+
| Next.js Monolith (Node.js App Router) |
| |
| +---------------------------+ +-----------------------------+ |
| | JWT / Cookie Middleware | | Prisma ORM Client | |
| +-------------+-------------+ +--------------+--------------+ |
+----------------|------------------------------------|-----------------+
| |
| 2. Returns Presigned PUT URL | 4. Saves File Record
v v
+-------------------+ +--------------------+
| AWS S3 Bucket | | Supabase Postgres |
+---------+---------+ +--------------------+
^
| 3. Direct Binary Upload (PUT Request with Progress)

### End-to-End Request Flow:

1. **Request Upload Permission:** Client sends file metadata (`filename`, `fileSize`, `mimeType`) with JWT cookies to `POST /api/files/upload-url`.
2. **Authorization & URL Generation:** Next.js validates session and size limits ($\le 100\text{ MB}$), generates an S3 Presigned `PUT` URL via AWS SDK, and returns it.
3. **Direct Binary Stream:** Browser streams raw file bytes directly to AWS S3 using the Presigned URL, executing Axios `onUploadProgress` callbacks.
4. **Metadata Commit:** Upon S3 HTTP 200 response, client calls `POST /api/files/confirm` to record the persistent metadata into PostgreSQL via Prisma.
5. **Private Access:** Client requests `GET /api/files/[id]/download`. Backend verifies owner ownership and generates a 60-minute S3 Presigned `GET` URL.

---

## 3. Key Decisions and Rationale

### 3.1 Deployment Topology: Monolith vs. Split Services

- **Decision:** Next.js Full-Stack Monolith (App Router + Route Handlers).
- **Alternatives:** Decoupled Express.js REST API + React SPA (or microservices).
- **Rationale:** Eliminates CORS complexity, dual deployment pipelines, and latency between auth middleware and route logic. Allows full end-to-end TypeScript type safety while meeting the speed requirements of this project scope.

### 3.2 File Transfer: Presigned URLs vs. Proxying Through Backend

- **Decision:** Direct browser-to-S3 upload via AWS S3 Presigned `PUT` URLs.
- **Alternatives:** Streaming file streams through Next.js/Express API routes to S3.
- **Rationale:** Uploading 100 MB files through Node.js consumes server memory (RAM buffers) and risks serverless function payload limits (Vercel has a 4.5 MB request payload limit). Direct S3 presigned uploads bypass the application server entirely for binary transport, ensuring unlimited upload concurrency and reduced bandwidth costs.

### 3.3 Auth: JWT in httpOnly Cookies vs. Redis Sessions vs. Managed Auth

- **Decision:** JWTs stored in `httpOnly`, `SameSite=Lax`, `Secure` HTTP cookies.
- **Alternatives:** Server-side sessions in Redis, Supabase Auth SDK, or NextAuth/Auth.js.
- **Rationale:** Avoids state management overhead and external session store network calls (e.g., Redis lookups) on every API invocation. Storing JWTs in `httpOnly` cookies prevents Cross-Site Scripting (XSS) token theft while enabling stateless middleware verification.

### 3.4 Database Access: Prisma vs. Raw SQL

- **Decision:** Prisma ORM 7 with PostgreSQL.
- **Alternatives:** Kysely, Drizzle ORM, or Raw SQL via `pg`.
- **Rationale:** Delivers type-safe database access out-of-the-box, automatic schema migrations, and relational mapping between `User` and `File` models, reducing query-level security bugs like SQL injection.

### 3.5 Public/Private File Access: Presigned GET URLs vs. Bucket Policy

- **Decision:** All file downloads (both public and private) route through the backend to generate short-lived S3 Presigned `GET` URLs.
- **Alternatives:** Making the AWS S3 Bucket publicly readable via S3 Bucket Policy for public files.
- **Rationale:** Keeps the S3 bucket 100% private (`Block Public Access` enabled). Prevents hotlinking, scraping, and unexpected S3 egress bandwidth bills. Public files receive a unique shareable token checked by the backend before issuing a presigned `GET` URL.

---

## 4. Data Model

### User Model

- `id` (`String`, Primary Key, UUIDv4): Unique user identifier.
- `email` (`String`, Unique): User's primary email for login.
- `password` (`String`): Salted and hashed password string (`bcryptjs` cost factor 12).
- `createdAt` / `updatedAt` (`DateTime`): Timestamp tracking.

### File Model

- `id` (`String`, Primary Key, UUIDv4): Internal database identifier.
- `filename` (`String`): Original file display name (e.g., `document.pdf`).
- `s3Key` (`String`, Unique): Random, non-colliding storage key path in S3 (`uploads/{userId}/{uuid}-{filename}`).
- `fileSize` (`Int`): File size in bytes.
- `mimeType` (`String`): MIME content-type string.
- `isPublic` (`Boolean`, default: `false`): Visibility control flag.
- `shareToken` (`String`, Unique, Optional): Random cryptographic token generated for public access links (kept separate from database `id` to prevent primary key enumeration attacks).
- `ownerId` (`String`, Foreign Key): Relates to `User.id` with `ON DELETE CASCADE`.

---

## 5. Security Considerations & OWASP Implementation

- **OWASP File Upload Mitigation:**
  - **Randomized S3 Keys:** User files are renamed upon upload to prevent directory traversal and path manipulation attacks.
  - **Client & Server Double Size Validation:** Enforced both on the client UI and validated on the backend before generating presigned URLs.
  - **Bucket Lock Security:** S3 `Block Public Access` is enforced; no file is accessible via standard public S3 HTTP URLs.
- **Cryptographic Security:** Passwords hashed using `bcryptjs` with 12 salt rounds.
- **Authorization Checks:** Every mutating (`DELETE`, `PATCH`) or private read operation verifies that `file.ownerId === request.user.id`.
- **Information Disclosure Prevention:** Invalid or private share tokens return generic `404 Not Found` responses instead of `403 Forbidden` to prevent resource enumeration.
- **Least Privilege IAM:** AWS IAM programmatic access keys are restricted exclusively to `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions scoped to the target bucket.

---

## 6. Trade-Offs & Scaling Considerations

- **Session Revocation:** _Trigger:_ Requirement for immediate global session invalidation across multiple active devices $\rightarrow$ Transition from stateless JWTs to Redis-backed active session stores.
- **Post-Upload Processing:** _Trigger:_ Requirement for automatic image thumbnail generation, virus scanning, or metadata extraction $\rightarrow$ Introduce an asynchronous event queue (AWS S3 Event Notifications $\rightarrow$ AWS SQS $\rightarrow$ AWS Lambda).
- **Heavy Public Read Traffic:** _Trigger:_ High bandwidth consumption and download latency for viral public files $\rightarrow$ Place AWS CloudFront (CDN) in front of S3 with signed cookies/URLs.
- **Upload Confirmation Reliability:** _Trigger:_ User closes browser tab mid-upload causing orphan files in S3 without DB records $\rightarrow$ Implement an automated lifecycle rule in S3 bucket along with a daily cron job comparing S3 object keys with Postgres DB keys.
- **Team & Deploy Independence:** _Trigger:_ Engineering team growth beyond a single full-stack squad $\rightarrow$ Decouple Next.js frontend to Vercel and spin up dedicated Node.js microservices on AWS ECS/Fargate.

---

## 7. Future Enhancements (With More Scope)

- **Automated Testing Suite:** End-to-End upload testing with Playwright and API unit tests using Vitest.
- **MIME-Type Magic Bytes Inspection:** Serverless worker checking magic byte signatures rather than trusting client-provided `Content-Type` headers.
- **Rate Limiting:** Sliding-window rate limiting on presigned URL requests using `@upstash/ratelimit` and Redis.
- **Chunked Multipart Uploads:** S3 Multipart upload support for continuous resumable uploads of multi-gigabyte files.
