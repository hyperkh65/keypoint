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

            if (!response.data || response.data.length < 5000) return null; // Skip tiny/broken images

            // 2. Smart Processing: Preserve quality while optimizing size
            let processedBuffer: Buffer;
            try {
                const image = sharp(response.data);
                const metadata = await image.metadata();

                // Only resize if image is actually large
                if (metadata.width && metadata.width > 1600) {
                    processedBuffer = await image
                        .resize(1600, 1600, {
                            fit: 'inside',
                            withoutEnlargement: true,
                            kernel: sharp.kernel.lanczos3 // Better quality
                        })
                        .jpeg({ quality: 92, progressive: true, chromaSubsampling: '4:4:4' })
                        .toBuffer();
                } else {
                    // Small images: keep original or minimal processing
                    processedBuffer = await image
                        .jpeg({ quality: 95, progressive: true, chromaSubsampling: '4:4:4' })
                        .toBuffer();
                }
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
