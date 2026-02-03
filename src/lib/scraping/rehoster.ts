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

            // 1. Download with strict validation
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': referer || 'https://tistory.com/',
                },
                timeout: 25000,
                maxContentLength: 10 * 1024 * 1024, // Max 10MB
                validateStatus: (status) => status === 200
            });

            if (!response.data || response.data.length < 30000) {
                console.log('[REHOST] Rejected: Too small');
                return null;
            }

            // 2. STRICT Image Validation
            let processedBuffer: Buffer;
            try {
                const image = sharp(response.data);
                const metadata = await image.metadata();

                // Validate dimensions
                if (!metadata.width || !metadata.height) {
                    console.log('[REHOST] Rejected: No dimensions');
                    return null;
                }

                if (metadata.width < 400 || metadata.height < 300) {
                    console.log(`[REHOST] Rejected: Too small (${metadata.width}x${metadata.height})`);
                    return null;
                }

                // Reject extremely wide/tall images (likely banners/ads)
                const aspectRatio = metadata.width / metadata.height;
                if (aspectRatio > 3 || aspectRatio < 0.3) {
                    console.log(`[REHOST] Rejected: Bad aspect ratio (${aspectRatio.toFixed(2)})`);
                    return null;
                }

                // Process with high quality
                if (metadata.width > 1600) {
                    processedBuffer = await image
                        .resize(1600, 1600, {
                            fit: 'inside',
                            withoutEnlargement: true,
                            kernel: sharp.kernel.lanczos3
                        })
                        .jpeg({ quality: 92, progressive: true, chromaSubsampling: '4:4:4' })
                        .toBuffer();
                } else {
                    processedBuffer = await image
                        .jpeg({ quality: 95, progressive: true, chromaSubsampling: '4:4:4' })
                        .toBuffer();
                }

                console.log(`[REHOST] ✓ Validated & Optimized to ${(processedBuffer.length / 1024).toFixed(0)}KB`);
            } catch (e: any) {
                console.log(`[REHOST] Rejected: Processing failed - ${e.message}`);
                return null;
            }

            // 3. Upload to reliable host with verification
            const hosts = [
                async () => {
                    const form = new FormData();
                    form.append('file', processedBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
                    const res = await axios.post('https://telegra.ph/upload', form, {
                        headers: {
                            ...form.getHeaders(),
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        },
                        timeout: 15000
                    });
                    const uploadedUrl = res.data?.[0]?.src ? `https://telegra.ph${res.data[0].src}` : null;

                    // Verify uploaded image is accessible
                    if (uploadedUrl) {
                        try {
                            await axios.head(uploadedUrl, { timeout: 5000 });
                            return uploadedUrl;
                        } catch {
                            console.log('[REHOST] Upload verification failed');
                            return null;
                        }
                    }
                    return null;
                },
                async () => {
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
                    if (result) {
                        console.log(`[REHOST] ✓ Successfully uploaded`);
                        return result;
                    }
                } catch (e: any) {
                    console.warn(`[REHOST] Host failure: ${e.message}`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            return null;
        } catch (e: any) {
            console.error(`[REHOST] Failed: ${e.message}`);
            return null;
        }
    }
}
