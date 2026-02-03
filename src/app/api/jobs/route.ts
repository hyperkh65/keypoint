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

    // Start automation immediately (fire and forget)
    const { AutomationManager } = await import('@/lib/automation/manager');
    const manager = new AutomationManager();
    manager.runJob(job.id).catch(err => {
        console.error('Job execution error:', err);
    });

    return NextResponse.json(job);
}
