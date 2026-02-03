import axios from 'axios';

export class AirtableSaver {
    private token: string;
    private baseId: string;
    private tableName: string;

    constructor(token: string, baseId: string, tableName: string) {
        this.token = token;
        this.baseId = baseId;
        this.tableName = tableName;
    }

    async saveRecord(data: {
        title: string;
        content: string;
        status: string;
        images: string[];
        sourceUrl?: string;
    }) {
        const url = `https://api.airtable.com/v0/${this.baseId}/${encodeURIComponent(this.tableName)}`;

        // Transform images to Airtable attachment format with explicit filenames
        const attachments = data.images.map((imgUrl, index) => ({
            url: imgUrl,
            filename: `image_${index + 1}.jpg` // Explicit filename ensures correct preview
        }));

        try {
            const response = await axios.post(url, {
                fields: {
                    "Name": data.title,       // Assuming first column is 'Name' or 'Title'
                    "Content": data.content,  // Need a Long Text field named 'Content'
                    "Status": data.status,    // Single Select or Text field
                    "Attachments": attachments, // Attachment field
                    "Reference URL": data.sourceUrl // URL field
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[AIRTABLE] Successfully saved record:', response.data.id);
            return response.data;
        } catch (error: any) {
            console.error('[AIRTABLE] Error saving record:', error.response?.data || error.message);
            // Don't throw, just log. We don't want to break the whole pipeline if Airtable fails.
            return null;
        }
    }
}
