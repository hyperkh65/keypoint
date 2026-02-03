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
            // 1. Fast Scraping
            await prisma.job.update({
                where: { id: jobId },
                data: { status: 'SCRAPING', currentStep: '고품질 이미지 100장 빠른 수집 중...' }
            });
            const scraper = new ScrapingEngine();
            const articles = await scraper.searchAndScrape(job.keyword);

            if (articles.length === 0) throw new Error('수집된 문서가 없습니다.');

            // 2. IMAGE RE-HOSTING, RESIZING & QUICK PREVIEW
            await prisma.job.update({
                where: { id: jobId },
                data: { status: 'SCRAPING', currentStep: '대표 이미지 5장 즉시 최적화 중...' }
            });

            const imageBatch: { url: string, referer: string }[] = [];
            articles.forEach(a => {
                a.images.forEach(img => {
                    imageBatch.push({ url: img, referer: a.url });
                });
            });

            const rehostedImages: string[] = [];
            const MAX_IMAGES = 50;
            const candidates = imageBatch.slice(0, 40);

            // STEP 2-A: Process first 10 candidates FAST to get top 5 images ASAP
            const quickChunk = candidates.slice(0, 10);
            const quickResults = await Promise.all(
                quickChunk.map(item => ImageRehoster.rehost(item.url, item.referer))
            );

            quickResults.forEach(res => {
                if (res) rehostedImages.push(res);
            });

            // Update DB with first 5 images immediately for UI response
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    image1: rehostedImages[0] || null,
                    image2: rehostedImages[1] || null,
                    image3: rehostedImages[2] || null,
                    image4: rehostedImages[3] || null,
                    image5: rehostedImages[4] || null,
                    currentStep: '대표 이미지 확보 완료! 나머지 고화질 이미지 45장 처리 중...'
                }
            });

            // STEP 2-B: Process remaining in parallel batches
            const remainingCandidates = candidates.slice(10);
            const CHUNK_SIZE = 8; // Increased parallelism
            for (let i = 0; i < remainingCandidates.length && rehostedImages.length < MAX_IMAGES; i += CHUNK_SIZE) {
                const chunk = remainingCandidates.slice(i, i + CHUNK_SIZE);
                const results = await Promise.all(
                    chunk.map(item => ImageRehoster.rehost(item.url, item.referer))
                );
                results.forEach(res => {
                    if (res && rehostedImages.length < MAX_IMAGES) rehostedImages.push(res);
                });

                // Periodic step update for feedback
                if (i % 16 === 0) {
                    await prisma.job.update({
                        where: { id: jobId },
                        data: { currentStep: `이미지 최적화 진행 중... (${rehostedImages.length}/${MAX_IMAGES})` }
                    });
                }
            }

            // 3. AI MERGE
            let aiResult = {
                title: `[프로젝트] ${job.keyword} 통합 대백과 리포트`,
                content: articles.map((a, i) => `## [문서 ${i + 1}] ${a.title}\n\n${a.content}\n\n---`).join('\n\n'),
                tags: [job.keyword, '프리미엄', '자동수집']
            };

            if (geminiKey && geminiKey.startsWith('AIza')) {
                try {
                    await prisma.job.update({ where: { id: jobId }, data: { status: 'MERGING', currentStep: '제미나이 AI가 5,000자 리포트 작성 중...' } });
                    const merger = new AIMerger(geminiKey);
                    aiResult = await merger.mergeArticles(job.keyword, articles);
                } catch (aiErr: any) {
                    console.warn('[AI_FALLBACK] Gemini failed:', aiErr.message);
                }
            }

            // 4. Saving to Notion
            await prisma.job.update({ where: { id: jobId }, data: { status: 'SAVING', currentStep: '노션으로 50장의 이미지와 리포트 전송 중...' } });
            const saver = new NotionSaver(notionToken);
            const notionPage = await saver.saveArticle(notionDbId, {
                title: aiResult.title,
                content: aiResult.content,
                tags: aiResult.tags,
                url: articles[0]?.url,
                images: rehostedImages,
                topImages: rehostedImages.slice(0, 5)
            });

            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    currentStep: '모든 작업 완료! 노션과 대시보드에서 결과를 확인하세요.',
                    notionUrl: (notionPage as any).url
                }
            });

        } catch (e: any) {
            console.error('Job failed:', e);
            await prisma.job.update({ where: { id: jobId }, data: { status: 'FAILED', errorMessage: e.message } });
        }
    }
}
