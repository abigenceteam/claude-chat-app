# Claude Chat App

A clean ChatGPT-style chat UI powered directly by Anthropic's API.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn-style `components/ui` structure
- Anthropic TypeScript SDK
- Vercel-ready streaming API route

## Run locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

Add your Anthropic key to `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

Then:

```bash
npm run dev
```

Open http://localhost:3000

## Important

The Anthropic API key is used only inside `/app/api/chat/route.ts`. Do not put it in a `NEXT_PUBLIC_*` variable and do not call Anthropic directly from the browser.

## Next production phases

1. Authentication
2. PostgreSQL + Drizzle
3. Persistent conversations/messages
4. File uploads and document context
5. Markdown + syntax highlighting
6. Regenerate/edit/copy responses
7. Search conversations
8. Usage and token accounting
9. Rate limiting
10. Billing/subscriptions
11. Admin dashboard
12. Vercel production deployment
