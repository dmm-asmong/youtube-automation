import { GoogleGenAI } from '@google/genai';
import type { ChannelProfile, Topic, Script, FlowScene, ScriptSection, TitleOption } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
const ai = new GoogleGenAI({ apiKey });

const MODEL = 'gemini-2.5-flash';

// ── 주제 발굴 ─────────────────────────────────────────────────
export async function discoverTopics(channel: ChannelProfile): Promise<Omit<Topic, 'id' | 'channelId' | 'createdAt'>[]> {
  const nicheStr = channel.niche.join(', ');

  const prompt = `당신은 유튜브 콘텐츠 전략 전문가입니다.

채널 정보:
- 채널명: ${channel.name}
- 대상: ${channel.targetAudience}
- 분야: ${nicheStr}
- 톤/스타일: ${channel.tone}

Google 검색을 활용해서 다음을 분석하세요:
1. 최근 1~3개월 사이 유튜브에서 조회수가 폭발한 "${nicheStr}" 관련 콘텐츠
2. 현재 한국에서 트렌딩 중인 관련 검색어
3. 비슷한 채널에서 가장 조회수가 높은 영상 주제
4. 시니어 대상 채널에서 구독자를 빠르게 늘린 콘텐츠 패턴

아래 JSON 형식으로 정확히 반환하세요 (JSON 외에 다른 텍스트 없이):
{
  "topics": [
    {
      "title": "주제 핵심 요약 (20자 이내)",
      "viralScore": 87,
      "searchVolume": "높음",
      "trend": "상승",
      "reason": "왜 이 주제가 조회수가 폭발할 것인가 (2~3문장)",
      "titleSuggestions": [
        "클릭 유도 제목 1 (숫자/감정 자극 포함)",
        "클릭 유도 제목 2",
        "클릭 유도 제목 3"
      ],
      "keywords": ["키워드1", "키워드2", "키워드3", "키워드4"]
    }
  ]
}

주제를 8개 이상 생성하되, viralScore 기준으로 내림차순 정렬하세요.
searchVolume은 '낮음'|'보통'|'높음'|'매우높음' 중 하나, trend는 '상승'|'유지'|'하락' 중 하나.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.7,
    },
  });

  const text = response.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다.');

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.topics as Omit<Topic, 'id' | 'channelId' | 'createdAt'>[];
}

// ── 대본 생성 (스트리밍) ──────────────────────────────────────
export async function generateScriptStream(
  channel: ChannelProfile,
  topicTitle: string,
  selectedVideoTitle: string,
  duration: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const prompt = `당신은 유튜브 콘텐츠 크리에이터이자 대본 작가입니다.
${channel.targetAudience}을 대상으로 하는 "${channel.name}" 채널의 영상 대본을 작성합니다.

주제: ${topicTitle}
영상 제목: ${selectedVideoTitle}
영상 길이: ${duration}
채널 톤: ${channel.tone}
채널 스타일: ${channel.style}

=== 대본 작성 규칙 ===
1. **훅 (Hook)**: 첫 5~15초 안에 시청자를 멈추게 만드는 강렬하고 위트 있는 첫 마디
   - 시니어의 실생활 공감 포인트에서 시작
   - 유머러스하게 상황을 과장하거나, 반전을 던져도 좋음
   - 예: "여러분, 혹시 스마트폰 쓰다가 자녀한테 전화해서 '이거 어떻게 해요?' 물어보신 적 있으세요? 오늘은 그 전화, 이제 안 하셔도 됩니다."
2. **위트 & 유머**: 전체 대본에 자연스러운 유머를 녹여 넣으세요
   - 시니어의 공감 상황을 재치 있게 표현
   - 과하지 않게, 따뜻한 웃음 유도
   - 비교 유머, 반전 유머, 자기 비하 유머 적절히 활용
3. **쉬운 설명**: 전문용어는 쉬운 말로 풀어서, 비유 활용
4. **단계별 구성**: 핵심 내용은 번호 붙여서 단계적으로 설명
5. **반복 강조**: 중요한 내용은 2번 강조
6. **CTA**: 마지막에 좋아요/구독 자연스럽게 유도

=== 출력 형식 ===
아래 형식 그대로 출력하세요:

## [메타데이터]
**제목 옵션 1:** [제목]
**제목 1 이유:** [왜 클릭하고 싶은가 + 어떤 SEO 키워드를 타깃하는가 (1~2문장)]
**제목 옵션 2:** [제목]
**제목 2 이유:** [왜 클릭하고 싶은가 + 어떤 SEO 키워드를 타깃하는가 (1~2문장)]
**제목 옵션 3:** [제목]
**제목 3 이유:** [왜 클릭하고 싶은가 + 어떤 SEO 키워드를 타깃하는가 (1~2문장)]
**설명문:**
[영상 설명문 400~600자. 시청자가 이 영상을 봐야 하는 이유, 다룰 내용 요약, 키워드 자연스럽게 포함]
**콘텐츠 근거:**
[이 정보의 출처/근거. 예: "삼성 공식 가이드", "과학기술정보통신부 발표", "실제 사용자 사례 기반" 등. 최대한 구체적으로]
**태그:** [태그1, 태그2, 태그3 ... 총 20개, 검색량 높은 순서로]
**썸네일 텍스트:** [썸네일에 넣을 짧고 강렬한 문구 2~3개, "|"로 구분]

## [훅 - 0~15초]
[강렬하고 위트 있는 첫 마디. 시청자를 멈추게 만드는 문장]

## [인트로 - 15초~1분]
[오늘 배울 내용 예고, 시청 이유 제시, 살짝 유머 포함]

## [본문 1 - 핵심 내용 제목]
[단계별 설명, 비유, 유머 포함]

## [본문 2 - 핵심 내용 제목]
[단계별 설명]

## [본문 3 - 핵심 내용 제목]
[단계별 설명]

## [마무리 & CTA]
[오늘 배운 내용 정리 + 따뜻한 마무리 멘트 + 자연스러운 좋아요/구독 유도]

---
대본을 지금 작성해주세요. 실제로 녹음할 수 있는 완성된 대본으로 써주세요.`;

  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.85 },
  });

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const text = chunk.text ?? '';
    if (text) onChunk(text);
  }
}

// ── 대본 파싱 ─────────────────────────────────────────────────
// 제목/이유 파싱용 정적 패턴 (루프 밖에서 컴파일)
const TITLE_PATTERNS = [1, 2, 3].map((i) => ({
  title: new RegExp(`\\*\\*제목 옵션 ${i}:\\*\\*\\s*(.+)`),
  reason: new RegExp(`\\*\\*제목 ${i} 이유:\\*\\*\\s*(.+)`),
}));

export function parseScript(rawText: string): {
  videoTitle: string;
  titleOptions: TitleOption[];
  description: string;
  descriptionBasis: string;
  tags: string[];
  thumbnailText: string;
  sections: ScriptSection[];
} {
  // 제목 3개 + 이유 파싱
  const titleOptions: TitleOption[] = TITLE_PATTERNS.flatMap(({ title, reason }) => {
    const titleMatch = rawText.match(title);
    if (!titleMatch?.[1]) return [];
    return [{ title: titleMatch[1].trim(), reason: rawText.match(reason)?.[1]?.trim() ?? '' }];
  });

  const videoTitle = titleOptions[0]?.title ?? '';

  const descMatch = rawText.match(/\*\*설명문:\*\*\n([\s\S]*?)(?=\*\*콘텐츠 근거:|$)/);
  const basisMatch = rawText.match(/\*\*콘텐츠 근거:\*\*\n([\s\S]*?)(?=\*\*태그:|$)/);
  const tagsMatch = rawText.match(/\*\*태그:\*\*\s*\[?(.+?)\]?(?:\n|$)/);
  const thumbMatch = rawText.match(/\*\*썸네일 텍스트:\*\*\s*(.+)/);

  const description = descMatch?.[1]?.trim() ?? '';
  const descriptionBasis = basisMatch?.[1]?.trim() ?? '';
  // 중복 태그 제거
  const rawTags = tagsMatch?.[1]?.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean) ?? [];
  const tags = [...new Set(rawTags)];
  const thumbnailText = thumbMatch?.[1]?.trim() ?? '';

  // ## [...] 섹션 파싱
  const sectionRegex = /## \[(.+?)\]\n([\s\S]*?)(?=## \[|$)/g;
  const sections: ScriptSection[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(rawText)) !== null) {
    const label = m[1].trim();
    if (label === '메타데이터') continue;
    sections.push({ label, content: m[2].trim() });
  }

  return { videoTitle, titleOptions, description, descriptionBasis, tags, thumbnailText, sections };
}

// ── Grok/이미지 기반 영상용 이미지 프롬프트 생성 ──────────────
export async function generateImagePrompts(
  channel: ChannelProfile,
  videoTitle: string,
  sections: ScriptSection[],
): Promise<{ imageNumber: number; narration: string; prompt: string; duration: string }[]> {
  const sectionsText = sections
    .map((s, i) => `섹션 ${i + 1} [${s.label}]:\n${s.content.slice(0, 400)}`)
    .join('\n\n');

  const prompt = `You are an expert at creating image prompts for AI image generators (Grok Aurora, DALL-E, Midjourney) for YouTube videos.

Channel: ${channel.name}
Target: ${channel.targetAudience} (Korean seniors 60s-70s)
Video Title: ${videoTitle}

Script sections:
${sectionsText}

For each major script point, create an image prompt that can be used in Grok Aurora or similar AI tools.
Return ONLY this JSON:
{
  "images": [
    {
      "imageNumber": 1,
      "narration": "한국어 나레이션 텍스트 (이 이미지를 보여주는 동안 읽을 내용)",
      "prompt": "Warm, friendly scene of a Korean elderly person in their 60s using a smartphone at home, realistic photo style, soft natural lighting, living room background, cheerful expression",
      "duration": "00:00~00:10"
    }
  ]
}

Rules:
- All prompts in English (for AI image generators)
- Warm, realistic photography style (NOT cartoon/anime)
- Korean seniors (60s-70s) as main subjects
- Everyday settings: living room, cafe, park, kitchen
- No text in images
- 8~12 images total for the full video`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.6 },
  });

  const text = response.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.images;
}

// ── Google Flow 씬 변환 ───────────────────────────────────────
export async function generateFlowScenes(
  channel: ChannelProfile,
  videoTitle: string,
  sections: ScriptSection[],
): Promise<FlowScene[]> {
  const sectionsText = sections
    .map((s, i) => `섹션 ${i + 1} [${s.label}]:\n${s.content}`)
    .join('\n\n');

  const prompt = `당신은 Google Flow AI 영상 제작 전문가입니다.
아래 한국어 유튜브 대본을 Google Flow에서 바로 사용할 수 있는 씬(Scene) 프롬프트로 변환하세요.

채널: ${channel.name}
대상: ${channel.targetAudience}
영상 제목: ${videoTitle}

대본:
${sectionsText}

각 대본 섹션을 1~3개의 씬으로 나누어 아래 JSON으로 반환하세요 (JSON만 반환):
{
  "scenes": [
    {
      "sceneNumber": 1,
      "label": "훅",
      "visualPrompt": "A friendly Korean elderly person in their 60s-70s holding a smartphone, looking confused but then surprised and happy, warm living room background, soft lighting, realistic cinematic style",
      "narration": "해당 씬의 한국어 나레이션 텍스트",
      "cameraDirection": "Close-up shot slowly zooming out, warm color grading",
      "duration": "00:00~00:15"
    }
  ]
}

규칙:
- visualPrompt는 반드시 영어로 작성 (Google Flow Veo 모델용)
- 시니어 친화적이고 따뜻한 분위기
- 실생활 장면 위주 (거실, 카페, 공원 등)
- narration은 해당 씬에서 읽을 한국어 대본
- duration은 "MM:SS~MM:SS" 형식`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.6 },
  });

  const text = response.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.scenes as FlowScene[];
}
