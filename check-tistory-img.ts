import axios from 'axios';
import * as cheerio from 'cheerio';

async function check() {
    const url = "https://pakoc.tistory.com/entry/%EB%9D%BC%EB%A9%B4-%EB%A6%AC%EB%B7%B0-%EB%86%8D%EC%8B%AC-%EC%8B%A0%EB%9D%BC%EB%A9%B4-%EA%B3%A8%EB%93%9C-%EB%8B%AD-%EC%9C%A1%EC%88%98-%EB%B2%A0%EC%9D%B4%EC%8A%A4%EC%9D%98-40%EC%A3%BC%EB%85%84-%EB%9D%BC%EB%A9%B4";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    $('.entry-content img').each((i, el) => {
        console.log(`[${i}] src:`, $(el).attr('src'));
        console.log(`[${i}] data-origin:`, $(el).attr('data-origin'));
        console.log(`[${i}] data-filename:`, $(el).attr('data-filename'));
    });
}
check();
