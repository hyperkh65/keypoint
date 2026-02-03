import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedArticle {
    title: string;
    content: string;
    url: string;
    source: 'NAVER' | 'GOOGLE' | 'TISTORY';
    images: string[];
}

export class ScrapingEngine {
    async searchAndScrape(keyword: string): Promise<ScrapedArticle[]> {
        console.log(`[SCRAPE] Starting Ultra-Deep Image Collection: ${keyword}`);
        const results: ScrapedArticle[] = [];

        // Use 4 different search queries to cast a wider net
        const queries = [
            keyword + ' site:tistory.com',
            keyword + ' 블로그 리뷰',
            keyword + ' 후기 사진',
            keyword + ' 포스팅'
        ];

        const allLinks: { url: string, source: any }[] = [];
        for (const q of queries) {
            const searchUrl = `https://search.naver.com/search.naver?where=view&query=${encodeURIComponent(q)}&qvt=0`;
            const links = await this.getLinks(searchUrl);
            links.forEach(l => {
                if (!allLinks.some(al => al.url === l)) {
                    allLinks.push({ url: l, source: l.includes('tistory.com') ? 'TISTORY' : 'NAVER' });
                }
            });
        }

        console.log(`[SCRAPE] ${allLinks.length} total sources found.`);

        // Probe up to 20 articles to maximize image pool
        for (const item of allLinks.slice(0, 20)) {
            if (results.length >= 8) break;

            let content = null;
            if (item.source === 'TISTORY') {
                content = await this.scrapeTistory(item.url);
            } else {
                content = await this.scrapeNaverBlog(item.url);
            }

            if (content && (content.body.length > 150 || content.images.length > 0)) {
                results.push({
                    title: content.title,
                    content: content.body,
                    url: item.url,
                    source: item.source,
                    images: content.images
                });
            }
        }

        return results;
    }

    private async getLinks(url: string): Promise<string[]> {
        try {
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 10000
            });
            const links: string[] = [];

            const patterns = [
                /https:\/\/[a-z0-9.-]+\.tistory\.com\/entry\/[^\s"'>\\\]]+/g,
                /https:\/\/[a-z0-9.-]+\.tistory\.com\/[0-9]+/g,
                /https:\/\/blog\.naver\.com\/[a-z0-9_]+\/[0-9]+/g
            ];

            patterns.forEach(p => {
                (data.match(p) || []).forEach((l: string) => {
                    const clean = l.split('\\').join('').split('&quot;').join('').split('%22').join('');
                    if (!links.includes(clean)) links.push(clean);
                });
            });

            return links.filter(l => !l.includes('search.naver.com') && l.length > 25);
        } catch { return []; }
    }

    private async scrapeNaverBlog(url: string) {
        try {
            const { data: frameData } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
            const $frame = cheerio.load(frameData);
            const src = $frame('#mainFrame').attr('src');
            if (src) {
                const fullUrl = src.startsWith('http') ? src : `https://blog.naver.com${src}`;
                const { data: blogData } = await axios.get(fullUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
                const $blog = cheerio.load(blogData);
                const title = $blog('.se-title-text, .htitle, .itemSubjectBoldfont').text().trim() || '제목 없음';
                const container = $blog('.se-main-container, #postViewArea, .se_component_wrap').first();

                const images: string[] = [];
                (container.length > 0 ? container : $blog('body')).find('img').each((_, el) => {
                    const imgSrc = $blog(el).attr('src') || $blog(el).attr('data-lazy-src') || $blog(el).attr('data-src') || $blog(el).attr('data-origin');
                    if (imgSrc && imgSrc.includes('pstatic.net') && !imgSrc.includes('icon') && !imgSrc.includes('sticker')) {
                        const cleanImg = imgSrc.replace(/\?type=.*/, '?type=w1100');
                        if (!images.includes(cleanImg)) images.push(cleanImg);
                    }
                });

                return { title, body: container.text().trim().replace(/\s+/g, ' '), images: images.slice(0, 20) };
            }
        } catch { return null; }
    }

    private async scrapeTistory(url: string) {
        try {
            const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
            const $ = cheerio.load(data);
            const title = $('h1, h2, .title, .tit_section').first().text().trim() || $('title').text() || '제목 없음';
            const container = $('.entry-content, .tt_article_usr, .article-view, #article-view, .inner_index, .post-content').first();
            const images: string[] = [];

            const searchArea = container.length > 0 ? container : $('body');

            searchArea.find('img').each((_, el) => {
                const attrs = ['src', 'data-src', 'data-origin', 'data-url', 'data-original-src'];
                let targetSrc = '';
                for (const attr of attrs) {
                    const val = $(el).attr(attr);
                    if (val && (val.includes('tistory.com') || val.includes('kakaocdn.net') || val.includes('daumcdn.net'))) {
                        targetSrc = val;
                        break;
                    }
                }

                if (targetSrc) {
                    targetSrc = targetSrc.split('&amp;').join('&');
                    if (!targetSrc.includes('attach/lib/emoticon') && !targetSrc.includes('static/img') && !targetSrc.includes('tistory_admin')) {
                        let finalUrl = targetSrc;
                        if (!targetSrc.includes('/dna/') && !targetSrc.includes('/thumb/')) {
                            finalUrl = targetSrc.split('?')[0];
                        }
                        if (!images.includes(finalUrl)) images.push(finalUrl);
                    }
                }
            });

            return { title, body: container.text().trim().replace(/\s+/g, ' '), images: images.slice(0, 20) };
        } catch { return null; }
    }
}
