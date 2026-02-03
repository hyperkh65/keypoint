import { prisma } from '@/lib/db';
import { AutomationManager } from '@/lib/automation/manager';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { jobId } = await req.json();

    // Actually run the job in the background
    // We don't await this to return to the UI immediately
    const manager = new AutomationManager();
    manager.runJob(jobId).catch(console.error);

    return NextResponse.json({ success: true });
}
