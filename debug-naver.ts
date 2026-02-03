import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function debugNaverSearch() {
    const keyword = "신라면 골드";
    const url = `https://search.naver.com/search.naver?where=view&query=${encodeURIComponent(keyword + ' site:tistory.com')}`;

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        });
        fs.writeFileSync('naver_search.html', data);
        const $ = cheerio.load(data);
        console.log('Title:', $('title').text());

        let linkCount = 0;
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && (href.includes('tistory.com') || href.includes('blog.naver.com'))) {
                console.log(`[${i}] Found link: ${href}`);
                linkCount++;
            }
        });
        console.log(`Total relevant links found: ${linkCount}`);
    } catch (e: any) {
        console.error(e.message);
    }
}

debugNaverSearch();
