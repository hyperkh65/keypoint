import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    const settings = await prisma.setting.findMany();
    return NextResponse.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
}

export async function POST(req: Request) {
    const data = await req.json();
    const entries = Object.entries(data);

    for (const [key, value] of entries) {
        await prisma.setting.upsert({
            where: { key },
            update: { value: value as string },
            create: { key, value: value as string }
        });
    }

    return NextResponse.json({ success: true });
}
