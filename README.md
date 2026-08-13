# 🔒 Secure File Storage Service

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

A full-stack file management platform where large files stream **directly between the browser and AWS S3**, never through the application server. Built with Next.js 16, TypeScript, Prisma 7 and Supabase PostgreSQL for the Persist Ventures Full Stack Engineer assessment.

🌐 **Live Demo:** [https://secure-file-storage-tarikul.vercel.app](https://secure-file-storage-tarikul.vercel.app)
🏛 **Architecture:** See [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for the full technical design, security model, and scaling trade-offs.

---

## 🚀 Quick Access / Demo Account

Sign in with the pre-configured account below to explore the app immediately — or register your own, which takes a few seconds and no email confirmation.

| | |
| --------------- | ---------------------------------------------------------------------------------- |
| **Live App**    | [secure-file-storage-tarikul.vercel.app](https://secure-file-storage-tarikul.vercel.app) |
| **Email**       | `demo@example.com`                                                                   |
| **Password**    | `DemoPassword123!`                                                                   |

**Worth trying once you're in:**

1. **Upload** something large — the progress bar is driven by the real browser→S3 transfer, and the file body never touches the application server.
2. **Share** a file, then open its link in a private window. It works without a session, and the S3 bucket is still not public.
3. **Make it private again**, then reload that same link. It is dead permanently — re-publishing mints a new token rather than reviving the old one.
4. **Switch to grid view** for image and video thumbnails, and open a shared image, video or audio file to preview it inline.

> The demo account is shared, so its files are visible to anyone using it and may be cleared periodically. Please don't upload anything sensitive.

---

## ✨ Features

**Uploads**

- Files up to **100 MB**, streamed browser → S3 over a presigned `PUT`. The API only issues the URL; no file body ever passes through it.
- Real-time per-file progress, multi-file queue, and per-file cancellation.
- Client-side pre-flight validation (size, blocked extensions) with the server re-checking everything.
- Upload size and content type are read back **from S3** after the transfer, not trusted from the client.

**Access control**

- Email + password auth with `bcryptjs` (cost 12) and stateless JWTs in `httpOnly`, `SameSite=Lax` cookies.
- Private files are readable only by their owner, via a 60-minute presigned `GET` issued after an ownership check.
- Public files are shared through a random token, resolving to a 15-minute presigned `GET`. **The S3 bucket is never public.**
- Un-publishing a file **rotates its share token**, so a link already circulating is permanently dead.
- Fixed-window rate limiting on auth, presign, and public share endpoints.

**Dashboard**

- List and grid views, with image/video thumbnails.
- Search by name, filter by category and visibility, sort, and paginate.
- 1 GB storage quota per account with a live usage meter.

---

## 🛠 Tech Stack

| Layer          | Choice                                                              |
| -------------- | ------------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, Route Handlers, Node.js runtime)             |
| Language       | TypeScript (strict)                                                  |
| UI             | React 19, Tailwind CSS v4, Framer Motion, Lucide icons               |
| Database       | Supabase PostgreSQL via Prisma 7 + `@prisma/adapter-pg` driver adapter |
| Storage        | AWS S3 (presigned `PUT` / `GET`, Block Public Access enabled)        |
| Auth           | `jsonwebtoken` (HS256) + `bcryptjs`                                  |
| Validation     | Zod — schemas shared by the API and the forms that call it           |
| HTTP           | Axios (used for upload progress, which `fetch` still cannot report)  |
| Tooling        | ESLint, Husky, Commitlint (Conventional Commits), pnpm               |

---

## 🚀 How an upload works

```text
┌──────────────┐   1. POST /api/files/upload-url    ┌──────────────────────┐
│              │ ─────────────────────────────────► │  Next.js Route       │
│   Browser    │ ◄───────────────────────────────── │  Handler             │
│              │   2. presigned PUT URL + ticket    └──────────┬───────────┘
│              │                                               │
│              │   3. PUT file body (direct, with progress)    │ 5. verify + INSERT
│              │ ──────────────────────────────┐               ▼
└──────┬───────┘                               │    ┌──────────────────────┐
       │                                       ▼    │ Supabase PostgreSQL  │
       │  4. POST /api/files/confirm   ┌──────────┐ └──────────────────────┘
       └─────────────────────────────► │ AWS  S3  │ ◄── HeadObject (real size/type)
                                       └──────────┘
```

1. The client sends filename, size and type. The API authenticates the session, enforces the size limit and the storage quota, then signs a `PUT` URL scoped to a **server-generated** object key. It also returns a signed **upload ticket**.
2. The browser streams the bytes straight to S3, reporting progress. Content type is part of the signature, so the object cannot be stored as a different type.
3. The client posts the ticket back to `/api/files/confirm`. The server reads the object's **actual** size and content type from S3 with `HeadObject` before writing the row — an upload that lands over the limit is deleted from the bucket rather than recorded.

This is what makes 100 MB uploads work on a platform with a 4.5 MB serverless request-body limit.

---

## 📡 API

All routes return JSON. Errors share one envelope: `{ "error": { "code", "message", "details?" } }`.

| Method   | Endpoint                                | Auth   | Purpose                                            |
| -------- | --------------------------------------- | ------ | -------------------------------------------------- |
| `POST`   | `/api/auth/register`                    | –      | Create an account and sign in                      |
| `POST`   | `/api/auth/login`                       | –      | Sign in                                            |
| `POST`   | `/api/auth/logout`                      | –      | Clear the session cookie (idempotent)              |
| `GET`    | `/api/auth/me`                          | ✅     | Current user (the cookie is `httpOnly`)            |
| `POST`   | `/api/files/upload-url`                 | ✅     | Presigned `PUT` URL + upload ticket                |
| `POST`   | `/api/files/confirm`                    | ✅     | Commit metadata after a successful upload          |
| `GET`    | `/api/files`                            | ✅     | List own files — search, filter, sort, paginate    |
| `GET`    | `/api/files/[id]`                       | ✅     | Single file's metadata                             |
| `GET`    | `/api/files/[id]/download`              | ✅     | Presigned `GET` URL (60 min)                       |
| `PATCH`  | `/api/files/[id]/visibility`            | ✅     | Publish / un-publish (rotates the share token)     |
| `DELETE` | `/api/files/[id]`                       | ✅     | Delete from S3, then from PostgreSQL               |
| `GET`    | `/api/public/files/[token]`             | –      | Share-link metadata + a 15-minute download URL     |
| `GET`    | `/api/public/files/[token]/download`    | –      | `302` straight to a presigned URL                  |

Owner-scoped routes answer **`404`, never `403`**, for a file that does not exist *or* is not yours — so ids cannot be probed.

`GET /api/files` query parameters: `q`, `category` (`image`/`video`/`audio`/`document`/`archive`/`other`), `visibility` (`public`/`private`), `sort` (`createdAt`/`filename`/`fileSize`), `order` (`asc`/`desc`), `page`, `limit`. Unknown values fall back to defaults instead of erroring.

---

## ⚙️ Local Setup

### Prerequisites

- **Node.js ≥ 20.19** (required by Prisma 7)
- `pnpm` (`npm i -g pnpm`)
- A PostgreSQL database (this project uses Supabase)
- An AWS account with an S3 bucket and programmatic IAM credentials

### 1. Clone and install

```bash
git clone https://github.com/tarikulislam2000/secure-file-storage.git
cd secure-file-storage
pnpm install
```

### 2. Configure the environment

Create a `.env` file in the project root:

```dotenv
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth — must be at least 32 characters
JWT_SECRET=replace_me_with_a_long_random_string

# Postgres: pooled connection for the app…
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
# …and a direct connection for migrations
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
```

| Variable                | Used for                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`   | The origin baked into share links. **Set this in production**, or shared URLs will point at `localhost`. |
| `JWT_SECRET`            | Signs session cookies and upload tickets. Rejected at first use if shorter than 32 characters. |
| `DATABASE_URL`          | Runtime queries, through the transaction-mode pooler.                                  |
| `DIRECT_URL`            | Schema pushes and migrations, read by `prisma.config.ts`.                              |
| `AWS_*`                 | Presigning and object lifecycle.                                                       |

### 3. S3 bucket setup

- Keep **Block Public Access** fully enabled — every download is authorised by the API and served via a presigned URL.
- Add a CORS rule so the browser can `PUT` directly:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

- Scope the IAM user to `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on `arn:aws:s3:::your-bucket/*`.

### 4. Create the schema and run

```bash
pnpm exec prisma db push   # also runs `prisma generate`
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> The Prisma Client is generated into `src/generated/prisma`, which is git-ignored. `pnpm build` runs `prisma generate` first, so deployments regenerate it automatically.

---

## 📂 Project Structure

```text
src/
├── app/
│   ├── (auth)/            # /login and /register (route group)
│   ├── api/               # Route Handlers — auth, files, public share
│   ├── dashboard/         # Authenticated file manager
│   ├── s/[token]/         # Public share landing page
│   └── icon.tsx           # Generated favicon (ImageResponse)
├── components/            # ui/, auth/, dashboard/, landing/
├── hooks/                 # use-uploader, use-copy-link
├── lib/
│   ├── api.ts             # Error envelope, route wrapper, session guard
│   ├── auth.ts            # Password hashing + session cookie
│   ├── session.ts         # JWT sign/verify (also used by proxy.ts)
│   ├── s3.ts              # Presigning, HeadObject, delete
│   ├── files.ts           # Serialisation, quota, ownership guards
│   ├── upload-ticket.ts   # Signed presign → confirm hand-off
│   ├── rate-limit.ts      # Fixed-window limiter
│   └── validation.ts      # Zod schemas shared with the UI
└── proxy.ts               # Route guard (Next.js 16 renamed `middleware`)
```

## 📜 Scripts

| Command       | Description                                |
| ------------- | ------------------------------------------ |
| `pnpm dev`    | Development server                         |
| `pnpm build`  | `prisma generate` + production build       |
| `pnpm start`  | Serve the production build                 |
| `pnpm lint`   | ESLint                                     |

---

## 🧭 Conventional Commits

Enforced by Husky + Commitlint.

Format: `<type>(<scope>): <short description>`
Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

---

## 📄 License

Open source under the [MIT License](./LICENSE).
