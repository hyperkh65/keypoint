# Vercel Deployment Guide

## 1. Database Setup (Supabase)
Vercel's ephemeral storage means SQLite will not work. You must use a persistent PostgreSQL database.
1. Create a project at [Supabase](https://supabase.com).
2. Go to **Settings > Database** and copy the **Connection string (Transaction mode)**.
3. In `prisma/schema.prisma`, change the provider to `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Run `npx prisma db push` to sync the schema to Supabase.

## 2. Environment Variables in Vercel
Add the following keys in your Vercel Project Settings:
- `DATABASE_URL`: Your Supabase connection string.
- `NOTION_TOKEN`: From Notion Integrations.
- `NOTION_DATABASE_ID`: The 32-character ID of your target Notion DB.
- `GEMINI_API_KEY`: From Google AI Studio.
- `APP_PASSWORD`: Access code for the dashboard (Default: 7759).

## 3. Build Settings
- **Framework Preset**: Next.js
- **Install Command**: `npm install`
- **Build Command**: `next build`

## 4. Timeout Note
The "Generate Report" task is heavy. On Vercel Hobby, it may timeout (30-60s limit). 
For the best experience, a Pro account or an external worker (like Inngest) is recommended for long-running scraping tasks. 
However, the current code is optimized with **parallel batching** to stay within limits as much as possible.
