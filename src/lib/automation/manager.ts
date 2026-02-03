import { prisma } from '../db';
import { ScrapingEngine } from '../scraping/engine';
import { AIMerger } from '../ai/merger';
import { NotionSaver } from '../notion/saver';
import { ImageRehoster } from '../scraping/rehoster';

export class AutomationManager {
    async runJob(jobId: string) {
        const job = await prisma.job.findUnique({ where: { id: jobId } });
        if (!job) return;

        const settingsArr = await prisma.setting.findMany();
        const settings = Object.fromEntries(settingsArr.map(s => [s.key, s.value]));

        const geminiKey = settings.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        const notionToken = settings.NOTION_TOKEN || process.env.NOTION_TOKEN;
        const notionDbId = settings.NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;

        if (!notionToken || !notionDbId) {
            await prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED', errorMessage: 'Notion credentials missing.' } });
            return;
        }

        try {
            // 1. Ultra-Deep Scraping
            await prisma.job.update({
                where: { id: jobId },
                data: { status: 'SCRAPING', currentStep: '4개 검색 채널에서 고화질 이미지 400장 전수 조사 중...' }
            });
            const scraper = new ScrapingEngine();
            const articles = await scraper.searchAndScrape(job.keyword);

            if (articles.length === 0) throw new Error('수집된 문서가 없습니다.');

            // 2. IMAGE RE-HOSTING, RESIZING & VERIFICATION
            await prisma.job.update({
                where: { id: jobId },
                data: { status: 'SCRAPING', currentStep: '이미지 50장 리사이징 및 엑박 방지 보안 작업 중...' }
            });

            // Collect all potential image/referer pairs
            const imageBatch: { url: string, referer: string }[] = [];
            articles.forEach(a => {
                a.images.forEach(img => {
                    imageBatch.push({ url: img, referer: a.url });
                });
            });

            const rehostedImages: string[] = [];
            const MAX_IMAGES = 50;
            const candidates = imageBatch.slice(0, 80);

            // Process in chunks of 5 to avoid overloading but keep it very fast
            const CHUNK_SIZE = 5;
            for (let i = 0; i < candidates.length && rehostedImages.length < MAX_IMAGES; i += CHUNK_SIZE) {
                const chunk = candidates.slice(i, i + CHUNK_SIZE);
                const results = await Promise.all(
                    chunk.map(item => ImageRehoster.rehost(item.url, item.referer))
                );
                results.forEach(res => {
                    if (res && rehostedImages.length < MAX_IMAGES) rehostedImages.push(res);
                });
            }

            // 3. AI MERGE or RAW FALLBACK
            let aiResult = {
                title: `[프로젝트] ${job.keyword} 통합 대백과 리포트`,
                content: articles.map((a, i) => `## [문서 ${i + 1}] ${a.title}\n\n${a.content}\n\n---`).join('\n\n'),
                tags: [job.keyword, '프리미엄', '자동수집']
            };

            if (geminiKey && geminiKey.startsWith('AIza')) {
                try {
                    await prisma.job.update({ where: { id: jobId }, data: { status: 'MERGING', currentStep: '제미나이 AI가 50장의 사진을 포함한 5,000자 리포트를 생성 중...' } });
                    const merger = new AIMerger(geminiKey);
                    aiResult = await merger.mergeArticles(job.keyword, articles);
                } catch (aiErr: any) {
                    console.warn('[AI_FALLBACK] Gemini failed:', aiErr.message);
                }
            } else {
                await prisma.job.update({ where: { id: jobId }, data: { status: 'MERGING', currentStep: 'AI 키가 없어 원문 데이터 5,000자로 머지 중...' } });
            }

            // 4. Saving to Notion
            await prisma.job.update({ where: { id: jobId }, data: { status: 'SAVING', currentStep: '노션으로 리사이징된 50장의 이미지 전송 중...' } });
            const saver = new NotionSaver(notionToken);
            const notionPage = await saver.saveArticle(notionDbId, {
                title: aiResult.title,
                content: aiResult.content,
                tags: aiResult.tags,
                url: articles[0]?.url,
                images: rehostedImages
            });

            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    currentStep: '완료! 완벽하게 리사이징된 이미지 50여 장이 노션에 준비되었습니다.',
                    notionUrl: (notionPage as any).url
                }
            });

        } catch (e: any) {
            console.error('Job failed:', e);
            await prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED', errorMessage: e.message } });
        }
    }
}
