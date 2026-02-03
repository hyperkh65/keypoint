import axios from 'axios';
import * as cheerio from 'cheerio';

async function testTistoryImages() {
    const keyword = "신라면 골드";
    const searchUrl = `https://search.naver.com/search.naver?where=view&query=${encodeURIComponent(keyword + ' site:tistory.com')}&qvt=0`;

    try {
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        });
        const $ = cheerio.load(data);
        const links: string[] = [];
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('tistory.com') && !href.includes('search.naver.com')) {
                links.push(href);
            }
        });

        console.log(`Found ${links.length} Tistory links`);

        for (const link of links.slice(0, 3)) {
            console.log(`Scraping ${link}...`);
            const { data: bData } = await axios.get(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $b = cheerio.load(bData);

            // Log ALL img tags to see where they are
            console.log(`Total img tags: ${$b('img').length}`);
            $b('img').each((i, el) => {
                const src = $b(el).attr('src');
                const dSrc = $b(el).attr('data-src');
                const oSrc = $b(el).attr('data-origin');
                console.log(`[${i}] src: ${src?.substring(0, 50)}, dSrc: ${dSrc?.substring(0, 50)}, oSrc: ${oSrc?.substring(0, 50)}`);
            });
        }
    } catch (e: any) {
        console.error(e.message);
    }
}

testTistoryImages();
