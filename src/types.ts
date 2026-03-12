export interface ChannelProfile {
  id: string;
  name: string;
  targetAudience: string;
  niche: string[];
  tone: string;
  style: string;
  language: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  viralScore: number; // 0–100
  searchVolume: '낮음' | '보통' | '높음' | '매우높음';
  trend: '상승' | '유지' | '하락';
  reason: string;
  titleSuggestions: string[];
  keywords: string[];
  channelId: string;
  createdAt: string;
}

export interface ScriptSection {
  label: string;
  content: string;
}

export interface TitleOption {
  title: string;
  reason: string; // SEO 이유 + 클릭 유도 근거
}

export interface Script {
  id: string;
  topicId: string;
  channelId: string;
  videoTitle: string;
  titleOptions: TitleOption[]; // 제목 3개 + 각각의 이유
  description: string;
  descriptionBasis: string;   // 콘텐츠 근거/출처
  tags: string[];
  thumbnailText: string;
  duration: string;
  sections: ScriptSection[];
  flowScenes: FlowScene[];
  createdAt: string;
}

export interface FlowScene {
  sceneNumber: number;
  label: string;
  visualPrompt: string;   // Google Flow용 시각 프롬프트 (영어)
  narration: string;      // 한국어 나레이션
  cameraDirection: string;
  duration: string;       // "00:00~00:30" 형식
}

export interface ContentHistory {
  id: string;
  channelId: string;
  topicTitle: string;
  scriptTitle: string;
  createdAt: string;
}
