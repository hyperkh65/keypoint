import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const settings = [
        { key: 'NOTION_TOKEN', value: 'your_notion_token_here' },
        { key: 'NOTION_DATABASE_ID', value: 'your_database_id_here' }
    ];

    for (const s of settings) {
        await prisma.setting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value }
        });
    }

    console.log('Notion settings initialized successfully.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
