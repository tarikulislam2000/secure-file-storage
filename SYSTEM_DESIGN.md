# 🏛 System Design & Architecture

## 1. Overview

Secure File Storage is a full-stack file management platform where authenticated users upload, organise and share files of up to 100 MB. A Next.js 16 monolith owns authentication, authorisation and all PostgreSQL access, while every binary payload streams directly between the client browser and AWS S3 through time-limited presigned URLs.

The central constraint shaping the design: **a 100 MB request body cannot pass through a serverless function.** Vercel caps request bodies at 4.5 MB, and buffering 100 MB in a function's memory would be wasteful even where it is allowed. Everything below follows from routing file bytes around the application server rather than through it.

---

## 2. Architecture

```text
                        ┌──────────────────────────────┐
                        │        Client Browser        │
                        └───────┬──────────────────┬───┘
                                │                  │
       1. POST /api/files/upload-url               │  3. PUT file body
          (session cookie + metadata)              │     (direct, with progress)
                                │                  │
                                ▼                  │
  ┌─────────────────────────────────────────────┐  │
  │        Next.js Monolith (Node.js)           │  │
  │                                             │  │
  │  proxy.ts ──► Route Handlers ──► Prisma 7   │  │
  │  (route guard)   (authorisation)  (+ pg)    │  │
  └────────┬───────────────────────────┬────────┘  │
           │                           │           │
  2. presigned PUT URL          5. INSERT row      │
     + signed upload ticket            │           │
           │                           ▼           ▼
           │              ┌────────────────┐  ┌──────────┐
           └─────────────►│ Supabase       │  │ AWS  S3  │
                          │ PostgreSQL     │  │ (private)│
                          └────────────────┘  └────┬─────┘
                                    ▲               │
                          4. POST /api/files/confirm│
                             └── HeadObject ────────┘
                                (real size + type)
```

### End-to-end upload flow

1. **Presign request.** Client sends `filename`, `fileSize`, `mimeType` with its session cookie. The API verifies the session, enforces the per-file limit and the account's storage quota, then signs a `PUT` URL for a server-generated key (`uploads/{ownerId}/{uuid}.{ext}`).
2. **Ticket issued.** Alongside the URL, the API returns a short-lived signed JWT containing `{ key, ownerId, filename }`. The client treats it as opaque.
3. **Direct transfer.** The browser `PUT`s the bytes to S3, driving an `onUploadProgress` bar. `Content-Type` is part of the signature, so the object cannot be stored under a different type than the one presigned.
4. **Confirmation.** The client posts the ticket back. The server calls `HeadObject` to read the object's real size and content type.
5. **Commit.** The row is written from the ticket (identity) and the `HeadObject` result (facts). Anything that fails validation at this point is deleted from S3 rather than recorded.

### Download flow

`GET /api/files/[id]/download` verifies ownership, then mints a 60-minute presigned `GET`. Public share links resolve a random token to a 15-minute presigned `GET`. The bucket itself is never readable.

---

## 3. Key Decisions and Rationale

### 3.1 Deployment topology: monolith vs. split services

- **Decision:** Next.js full-stack monolith (App Router + Route Handlers).
- **Alternatives:** Decoupled Express REST API + React SPA; microservices.
- **Rationale:** Removes CORS surface, dual pipelines, and the latency between the auth layer and route logic, while keeping end-to-end TypeScript types from Prisma model to React prop. The workload here is I/O-bound coordination, not CPU work that needs isolating.

### 3.2 File transfer: presigned URLs vs. proxying

- **Decision:** Direct browser-to-S3 via presigned `PUT`.
- **Alternatives:** Streaming through the API to S3.
- **Rationale:** The 4.5 MB serverless body limit makes proxying impossible for the target file size, and buffering 100 MB per concurrent upload would tie application memory to user bandwidth. Direct upload makes concurrency a function of S3, not of our instance count.

### 3.3 Trusting the upload: signed ticket + `HeadObject`

- **Decision:** `confirm` accepts only a signed ticket, and reads size and content type back from S3.
- **Alternatives:** Accepting `{ key, size, mimeType }` from the client and validating the key prefix.
- **Rationale:** A presigned URL does not constrain body size — a client can declare 1 KB and upload 101 MB, and S3 will accept it. Any size the client reports is therefore unverifiable. `HeadObject` is the only account of the upload that cannot be fabricated, and the signed ticket removes the need to parse or trust a client-supplied object key at all.

### 3.4 Auth: JWT in `httpOnly` cookies

- **Decision:** HS256 JWTs in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies, 7-day expiry.
- **Alternatives:** Redis-backed server sessions; Supabase Auth; NextAuth.
- **Rationale:** Stateless verification costs no network round trip per request, which matters when every route re-verifies. `httpOnly` puts the token out of reach of XSS, and `SameSite=Lax` keeps it off cross-site POSTs. The token pins `algorithms: ["HS256"]`, plus issuer and audience, so a forged `alg: none` header cannot bypass verification. Cost: no instant global revocation — see §6.

### 3.5 Route guarding: `proxy.ts` is not the authorisation boundary

- **Decision:** `src/proxy.ts` (Next.js 16's rename of `middleware.ts`) performs full JWT verification and redirects, but every route handler independently calls `requireSession()`, and every file query is scoped by `ownerId` in its `where` clause.
- **Rationale:** The proxy decides *where to send a browser*; the database query decides *what data exists*. A request that somehow bypassed the proxy would still read nothing belonging to another user. Next.js's own guidance is explicitly against treating this layer as the security boundary.

### 3.6 Database access: Prisma 7 with a driver adapter

- **Decision:** Prisma 7 with the `prisma-client` generator and `@prisma/adapter-pg` over Supabase's transaction-mode pooler.
- **Rationale:** Prisma 7 ships no query engine binary, so a driver adapter is required rather than optional. The pool is deliberately small (`max: 5`, 10s idle reclaim) because serverless invocations are short-lived and PgBouncer, not the app, is doing the real pooling. Type-safe queries also eliminate the string-concatenation class of SQL injection.

### 3.7 Public sharing: tokens over bucket policy

- **Decision:** Public downloads still route through the API and receive a short-lived presigned `GET`.
- **Alternatives:** Making objects public with an S3 bucket policy.
- **Rationale:** Keeps Block Public Access on, so no file is ever reachable by guessing an S3 URL. It bounds hotlinking and egress: a scraped presigned URL dies in 15 minutes, whereas a public object URL is permanent. The share token is a random UUID held **separately from the primary key**, so a share link leaks nothing about the id space.

### 3.8 Revocation: rotate the token on un-publish

- **Decision:** Setting a file back to private regenerates its `shareToken`.
- **Rationale:** Without rotation, "make private" would only *pause* a link — anyone who saved it could use it again the moment the owner re-published. Rotating makes revocation permanent, which is what the action means to a user.

---

## 4. Data Model

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String              // bcrypt hash, cost 12
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  files     File[]
  @@map("users")
}

model File {
  id         String   @id @default(uuid())
  filename   String              // sanitised display name
  s3Key      String   @unique    // uploads/{ownerId}/{uuid}.{ext} — never exposed
  fileSize   Int                 // bytes, as reported by S3
  mimeType   String              // content type, as reported by S3
  isPublic   Boolean  @default(false)
  shareToken String?  @unique @default(uuid())
  ownerId    String
  owner      User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([ownerId, createdAt(sort: Desc)])
  @@map("files")
}
```

**Indexing.** Every dashboard query is "this owner's files, newest first", so one composite index on `(ownerId, createdAt DESC)` serves both the filter and the sort in a single scan; it also covers plain `ownerId` lookups, making a standalone index redundant. `shareToken` is `@unique`, which already creates its own index — a second one would only add write cost.

**Cascade.** Deleting a user removes their file rows. S3 objects are removed explicitly by the delete route, which runs S3 first (recoverable if it fails) and PostgreSQL second.

---

## 5. Security Model

### OWASP file-upload mitigations

- **Server-generated keys.** Object keys are `uploads/{ownerId}/{uuid}`; the user's filename is stored only as a display label, after stripping path separators and control characters. Path traversal has nothing to act on.
- **Size validated three times:** in the browser (fast feedback), at presign (declared size), and after upload against S3's own `Content-Length` — the only one that is authoritative. Over-limit objects are deleted from the bucket.
- **Content type pinned to the signature.** `signableHeaders: ["content-type"]` puts the header inside the SigV4 signature; a mismatched `PUT` is rejected by S3 with `403`. Without this, `ContentType` on the command is advisory only.
- **Executable extensions blocked** (`.exe`, `.dll`, `.sh`, `.bat`, `.js`, …) so the service cannot be used as a malware host.
- **Downloads are always `Content-Disposition: attachment`**, with the filename re-sanitised at signing time, so an uploaded HTML or SVG file can never be rendered as a document.
- **Bucket is private.** Block Public Access stays enabled; there is no code path that makes an object public.

### Authentication and authorisation

- `bcryptjs` at cost 12, with the 72-byte input ceiling reflected in the password schema.
- **Login is timing-safe.** An unknown email still runs a bcrypt comparison against a real dummy hash, so response latency cannot be used to enumerate registered accounts. Measured at parity (~0.58 s either way).
- **Owner-scoped queries.** Ownership is part of the `where` clause, not a check applied after loading.
- **`404`, never `403`,** for files that are missing or not yours — and identically for unknown, revoked, or private share tokens. The API never confirms that a resource exists.
- **Rate limiting** (fixed-window, per client IP): register 5/15 min, login 10/15 min, presign 60/min, public share 60/min, public download 30/min.
- **Least-privilege IAM.** The deployed credentials should carry only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, scoped to the bucket ARN.

### Known limitations

- **Rate limit state is per-instance.** It lives in process memory, so with *n* warm serverless instances the effective ceiling is *n* × limit. It blunts credential stuffing from a single client; it is not a defence against a distributed attack. See §6.
- **Registration reveals whether an email exists** (`409 Conflict`). Avoiding this requires an email-verification flow, which is out of scope here. Login, which is the endpoint an attacker would actually probe, does not leak.
- **Content type is trusted from the client at presign.** It is pinned to the signature and read back from S3, so it cannot be *changed* after the fact — but a determined user can still label a file inaccurately. Magic-byte inspection is the fix (see §7).

---

## 6. Trade-Offs & Scaling Triggers

| Trigger | Response |
| ------- | -------- |
| Rate limiting must hold across instances, or survive a distributed attack | Move `checkRateLimit` behind Upstash Redis + `@upstash/ratelimit`; the call signature is already shaped for it |
| Sessions must be revocable instantly across devices | Replace stateless JWTs with a Redis session store, accepting a lookup per request |
| Thumbnails, virus scanning, or metadata extraction needed | S3 Event Notification → SQS → Lambda, keeping post-processing off the request path |
| Public files attract heavy read traffic | CloudFront in front of S3 with signed URLs/cookies, so egress is cached at the edge |
| Abandoned uploads accumulate in the bucket | S3 lifecycle rule on the `uploads/` prefix plus a reconciliation job diffing S3 keys against `files.s3Key` |
| Files exceed a few hundred MB, or resumability is required | S3 multipart upload with per-part presigned URLs |
| The team outgrows a single full-stack squad | Split the frontend from the API and deploy the API to ECS/Fargate |

---

## 7. Future Enhancements

- **Automated tests.** Playwright for the upload path, Vitest for the authorisation and validation units. Verification for this build was done by driving the real application against live S3 and PostgreSQL, which is not a substitute for a committed suite.
- **Magic-byte MIME inspection** in a post-upload worker, rather than trusting the declared content type.
- **Resumable multipart uploads** for multi-gigabyte files.
- **Folders and bulk actions**, plus shareable links with expiry dates and optional passwords.
- **Audit log** of downloads and visibility changes per file.
