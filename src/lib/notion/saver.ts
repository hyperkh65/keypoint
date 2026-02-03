import { Client } from '@notionhq/client';

export class NotionSaver {
    private notion: Client;

    constructor(token: string) {
        this.notion = new Client({ auth: token });
    }

    async saveArticle(parentId: string, data: { title: string, content: string, tags: string[], url?: string, images?: string[], topImages?: string[] }) {
        try {
            const blocks: any[] = [];
            // 1. Add Callout for Source Link
            if (data.url) {
                blocks.push({
                    object: 'block',
                    type: 'callout',
                    callout: {
                        rich_text: [{ text: { content: `수집된 대규모 원본 데이터입니다. (주요 출처: ${data.url})` } }],
                        icon: { emoji: '📚' },
                        color: 'blue_background'
                    }
                });
            }

            // 2. Add Content Text (split into blocks)
            const textBlocks = this.markdownToBlocks(data.content);
            blocks.push(...textBlocks);

            // 3. Add Scraped Images Gallery
            if (data.images && data.images.length > 0) {
                blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: '🖼️ 수집된 이미지 갤러리' } }] } });
                for (const imgUrl of data.images) {
                    blocks.push({
                        object: 'block',
                        type: 'image',
                        image: {
                            type: 'external',
                            external: { url: imgUrl }
                        }
                    });
                }
            }

            const initialBlocks = blocks.slice(0, 100);
            const remainingBlocks = blocks.slice(100);

            const properties: any = {
                title: {
                    title: [{ text: { content: data.title } }]
                },
                Tags: {
                    multi_select: data.tags.map(t => ({ name: t.substring(0, 100).replace(/,/g, '') }))
                },
                Sources: {
                    url: data.url || 'https://www.notion.so'
                }
            };

            // Map top images to columns if present
            if (data.topImages) {
                data.topImages.forEach((imgUrl, index) => {
                    const key = `image${index + 1}`;
                    properties[key] = {
                        files: [{ name: `${key}.jpg`, type: 'external', external: { url: imgUrl } }]
                    };
                });
            }

            const response = await this.notion.pages.create({
                parent: { database_id: parentId },
                properties: properties,
                children: initialBlocks
            });

            // 5. Append overflow blocks
            if (remainingBlocks.length > 0) {
                for (let i = 0; i < remainingBlocks.length; i += 100) {
                    const chunk = remainingBlocks.slice(i, i + 100);
                    await this.notion.blocks.children.append({
                        block_id: response.id,
                        children: chunk
                    });
                }
            }

            return response;
        } catch (e: any) {
            console.error('Notion API Error:', JSON.stringify(e.body || e));
            throw e;
        }
    }

    private markdownToBlocks(markdown: string) {
        // Split by line but keep some structure
        const lines = markdown.split('\n');
        const blocks: any[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const chunks = trimmed.match(/.{1,1900}/g) || [trimmed];

            for (const chunk of chunks) {
                if (trimmed.startsWith('## ')) {
                    blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: chunk.replace('## ', '') } }] } });
                } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ text: { content: chunk.replace(/^[*-] /, '') } }] } });
                } else {
                    blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: chunk } }] } });
                }
            }
        }
        return blocks;
    }
}
