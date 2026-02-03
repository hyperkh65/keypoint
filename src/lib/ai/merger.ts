import { GoogleGenerativeAI } from '@google/generative-ai';

export class AIMerger {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async mergeArticles(keyword: string, articles: { title: string, content: string, source: string }[]) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const context = articles.map((a, i) => {
            return `[문서 ${i + 1}] 출처: ${a.source}\n제목: ${a.title}\n본문: ${a.content.substring(0, 10000)}`;
        }).join('\n\n---\n\n');

        const prompt = `당신은 대한민국 최고의 전문 콘텐츠 에디터이자 지식 큐레이터입니다.
주제: "${keyword}"

임무: 드린 여러 블로그 글들을 분석하여, 독자가 이 문서 하나만 봐도 해당 주제를 완전히 마스터할 수 있도록 "초대형 프리미엄 리포트"를 작성하세요.

[필수 요구사항 - 절대 엄수]
1. 분량: 본문 내용은 반드시 공백 제외 **5000자 이상**으로 매우 상세하고 방대하게 작성하세요. (정보를 보충하거나 논리적 추론을 더해 깊이 있게 작성)
2. 구조화: 
   - 제목: 주제를 완벽히 관통하는 매력적인 제목
   - 도입부: 주제의 중요성 및 배경 설명
   - 본문: 최소 5개 이상의 상세 섹션 (## 소제목 사용)
   - 결론: 요약 및 최종 의견
3. 스타일: 전문적이면서도 친절한 블로그 포스팅 톤을 유지하세요.
4. 해시태그: 내용과 관련된 검색 최적화(SEO) 해시태그를 10개 이상 생성하세요.
5. 리포맷팅: 수집된 원문의 말투에 얽매이지 말고, 당신만의 통찰력 있는 언어로 새롭게 "집대성"하세요.

제공된 데이터:
${context}

응답은 반드시 아래의 JSON 형식으로만 출력하세요:
{
  "title": "리포트 제목",
  "content": "마크다운 형식의 5000자 이상 본문",
  "tags": ["해시태그1", "해시태그2", ...]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from potential markdown code blocks
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('AI 응답 형식이 올바르지 않습니다.');
    }
}
