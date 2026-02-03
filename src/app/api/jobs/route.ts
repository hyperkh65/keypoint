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

    // Start automation in background (not blocking)
    // In a real production app, use a worker, but for this agentic demo, we'll trigger an internal API or just start it.

    return NextResponse.json(job);
}
