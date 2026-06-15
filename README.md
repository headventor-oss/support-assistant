# CodersBrain Support Assistant

A GenAI support assistant accelerator. Admins upload an Excel file of known
Q&A pairs, map its columns (question / answer / category), and the chat UI
uses OpenAI to answer user questions from that knowledge base. If nothing
relevant is found, the user can raise a support ticket by email.

## Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Vercel Serverless Functions (`/api`)
- **Database**: Postgres (Vercel Postgres / Neon)
- **LLM**: OpenAI (`gpt-4o-mini` by default)
- **Excel parsing**: SheetJS (`xlsx`), done client-side in the browser
- **Ticket email**: Resend

## Local setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the values:
   - `DATABASE_URL` — Postgres connection string
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
   - `RESEND_API_KEY`, `SUPPORT_TEAM_EMAIL`, `TICKET_FROM_EMAIL` — for ticket emails
3. Initialize the database schema:
   ```
   npm run db:init
   ```
4. Run locally with Vercel CLI (serves both the Vite frontend and the `/api` functions):
   ```
   npx vercel dev
   ```

## Usage

1. Go to `/admin`, upload an Excel/CSV file, map the Question / Answer /
   (optional) Category columns, and save it as a dataset.
2. Activate the dataset using "Set Active" — only one dataset is active at a time.
3. Go to `/` and chat. The assistant answers using the active dataset.
4. If the assistant can't find a relevant answer, a "Raise a support ticket"
   button appears, pre-filled with the user's question and conversation.

## Deployment (Vercel)

1. Push this repo to GitHub and import it into Vercel.
2. Add a Postgres database (Storage tab → Postgres, free Hobby tier is enough)
   and connect it to the project — this sets `DATABASE_URL` automatically.
3. Set the remaining environment variables in Project Settings → Environment Variables:
   `OPENAI_API_KEY`, `OPENAI_MODEL`, `RESEND_API_KEY`, `SUPPORT_TEAM_EMAIL`, `TICKET_FROM_EMAIL`.
4. Run `npm run db:init` once (locally, pointed at the production `DATABASE_URL`,
   or via `vercel env pull` + `npm run db:init`) to create the tables.
5. Deploy. Vercel will build the Vite app and deploy the `/api` functions automatically.
