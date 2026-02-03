import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    const jobs = await prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(jobs);
}

export async function POST(req: Request) {
    const { keyword } = await req.json();

    const job = await prisma.job.create({
        data: {
            keyword,
            status: 'PENDING',
        }
    });

    // Trigger automation in background (non-blocking)
    const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

    fetch(`${baseUrl}/api/jobs/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
    }).catch(err => console.error('Background job trigger failed:', err));

    return NextResponse.json(job);
}
