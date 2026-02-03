import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';

export class ImageRehoster {
    /**
     * Advanced Re-hoster with Resizing & Multi-host Strategy
     */
    static async rehost(url: string, referer?: string): Promise<string | null> {
        try {
            console.log(`[REHOST] Fetching: ${url.substring(0, 40)}...`);

            // 1. Download
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': referer || 'https://tistory.com/',
                },
                timeout: 25000
            });

            if (!response.data || response.data.length < 1000) return null;

            // 2. Normalize & Resize (Max 1200px for speed and reliability)
            // Smaller images are more likely to be accepted by free hosts
            let processedBuffer: Buffer;
            try {
                processedBuffer = await sharp(response.data)
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80, progressive: true })
                    .toBuffer();
                console.log(`[REHOST] Optimized to ${(processedBuffer.length / 1024).toFixed(0)}KB`);
            } catch {
                processedBuffer = response.data;
            }

            // 3. Strategy: Try Multiple Hosts with Delays
            const hosts = [
                async () => { // Telegra.ph
                    const form = new FormData();
                    form.append('file', processedBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
                    const res = await axios.post('https://telegra.ph/upload', form, {
                        headers: {
                            ...form.getHeaders(),
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        },
                        timeout: 15000
                    });
                    return res.data?.[0]?.src ? `https://telegra.ph${res.data[0].src}` : null;
                },
                async () => { // Catbox.moe
                    const form = new FormData();
                    form.append('reqtype', 'fileupload');
                    form.append('fileToUpload', processedBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
                    const res = await axios.post('https://catbox.moe/user/api.php', form, {
                        headers: { ...form.getHeaders() },
                        timeout: 30000
                    });
                    const result = String(res.data).trim();
                    return result.startsWith('http') ? result : null;
                }
            ];

            for (const uploadFn of hosts) {
                try {
                    const result = await uploadFn();
                    if (result) return result;
                } catch (e: any) {
                    console.warn(`[REHOST] Host failure: ${e.message}`);
                    await new Promise(r => setTimeout(r, 1000)); // Cool down
                }
            }

            return null;
        } catch (e: any) {
            console.error(`[REHOST] Global failure: ${e.message}`);
            return null;
        }
    }
}
