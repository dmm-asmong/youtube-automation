import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { channelStore, scriptStore } from '../lib/storage';
import { generateFlowScenes, generateImagePrompts } from '../lib/gemini';
import type { ChannelProfile, Script, FlowScene } from '../types';

type Mode = 'flow' | 'grok';

interface ImagePrompt {
  imageNumber: number;
  narration: string;
  prompt: string;
  duration: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className={`text-xs px-2 py-1 rounded transition-colors ${
        copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {copied ? '✓ 복사됨' : '복사'}
    </button>
  );
}

export default function VideoCreator() {
  const { scriptId } = useParams<{ scriptId?: string }>();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState(scriptId ?? '');
  const [script, setScript] = useState<Script | null>(null);
  const [mode, setMode] = useState<Mode>('flow');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flowScenes, setFlowScenes] = useState<FlowScene[]>([]);
  const [imagePrompts, setImagePrompts] = useState<ImagePrompt[]>([]);
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionStatus, setNotionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const all = channelStore.getAll();
    const activeId = channelStore.getActive();
    const active = all.find((c) => c.id === activeId) ?? all[0] ?? null;
    setChannel(active);
    if (active) {
      const channelScripts = scriptStore.getByChannel(active.id);
      setScripts(channelScripts);
      const found = channelScripts.find((s) => s.id === scriptId);
      if (found) {
        setScript(found);
        setSelectedScriptId(found.id);
        if (found.flowScenes.length > 0) setFlowScenes(found.flowScenes);
      }
    }
  }, [scriptId]);

  function handleScriptChange(id: string) {
    setSelectedScriptId(id);
    const found = scripts.find((s) => s.id === id);
    setScript(found ?? null);
    setFlowScenes([]);
    setImagePrompts([]);
    if (found?.flowScenes.length) setFlowScenes(found.flowScenes);
  }

  async function handleGenerate() {
    if (!channel || !script) return;
    setLoading(true);
    setError('');
    setFlowScenes([]);
    setImagePrompts([]);
    try {
      if (mode === 'flow') {
        const scenes = await generateFlowScenes(channel, script.videoTitle, script.sections);
        setFlowScenes(scenes);
        scriptStore.update(script.id, { flowScenes: scenes });
      } else {
        const prompts = await generateImagePrompts(channel, script.videoTitle, script.sections);
        setImagePrompts(prompts);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`생성 중 오류가 발생했습니다: ${msg}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function downloadAll() {
    const lines: string[] = [];
    if (mode === 'flow' && flowScenes.length > 0) {
      lines.push(`=== Google Flow 씬 프롬프트 ===`);
      lines.push(`영상 제목: ${script?.videoTitle ?? ''}\n`);
      flowScenes.forEach((sc) => {
        lines.push(`---`);
        lines.push(`씬 ${sc.sceneNumber}: ${sc.label} (${sc.duration})`);
        lines.push(`[나레이션] ${sc.narration}`);
        lines.push(`[Flow 프롬프트] ${sc.visualPrompt}`);
        lines.push(`[카메라] ${sc.cameraDirection}`);
        lines.push('');
      });
    } else if (mode === 'grok' && imagePrompts.length > 0) {
      lines.push(`=== Grok 이미지 프롬프트 ===`);
      lines.push(`영상 제목: ${script?.videoTitle ?? ''}\n`);
      imagePrompts.forEach((img) => {
        lines.push(`---`);
        lines.push(`이미지 ${img.imageNumber} (${img.duration})`);
        lines.push(`[나레이션] ${img.narration}`);
        lines.push(`[Grok 프롬프트] ${img.prompt}`);
        lines.push('');
      });
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script?.videoTitle ?? '영상'}_프롬프트.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function sendToNotion() {
    setNotionLoading(true);
    setNotionStatus('idle');

    const blocks: object[] = [];
    if (mode === 'flow' && flowScenes.length > 0) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '🌊 Google Flow 씬 프롬프트' } }] } });
      flowScenes.forEach((sc) => {
        blocks.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: `씬 ${sc.sceneNumber}: ${sc.label} (${sc.duration})` } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: `🎙 나레이션: ${sc.narration}` } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: `🌊 Flow 프롬프트: ${sc.visualPrompt}` } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: `🎥 카메라: ${sc.cameraDirection}` } }] } },
          { object: 'block', type: 'divider', divider: {} },
        );
      });
    } else if (mode === 'grok' && imagePrompts.length > 0) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '⚡ Grok 이미지 프롬프트' } }] } });
      imagePrompts.forEach((img) => {
        blocks.push(
          { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: `이미지 ${img.imageNumber} (${img.duration})` } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: `🎙 나레이션: ${img.narration}` } }] } },
          { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: `⚡ Grok 프롬프트: ${img.prompt}` } }] } },
          { object: 'block', type: 'divider', divider: {} },
        );
      });
    }

    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: script?.videoTitle ?? '영상 프롬프트', blocks }),
      });
      if (res.ok) {
        setNotionStatus('success');
        setTimeout(() => setNotionStatus('idle'), 3000);
      } else {
        const err = await res.json();
        alert(`Notion 저장 실패 (${res.status}): ${err.message ?? err.error ?? JSON.stringify(err)}`);
        setNotionStatus('error');
      }
    } catch {
      alert('Notion 저장 중 오류가 발생했습니다.');
      setNotionStatus('error');
    } finally {
      setNotionLoading(false);
    }
  }

  const hasResults = flowScenes.length > 0 || imagePrompts.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎬 영상 제작</h1>
          <p className="text-gray-500 text-sm mt-1">Google Flow · Grok 이미지 — 아바타 없는 AI 영상</p>
        </div>
        {hasResults && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadAll}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              📥 전체 다운로드
            </button>
            <button
              onClick={sendToNotion}
              disabled={notionLoading}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                notionStatus === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              {notionLoading ? '전송 중...' : notionStatus === 'success' ? '✓ Notion 저장됨' : 'Notion으로 보내기'}
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">대본 선택</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            value={selectedScriptId}
            onChange={(e) => handleScriptChange(e.target.value)}
          >
            <option value="">-- 대본 선택 --</option>
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>{s.videoTitle}</option>
            ))}
          </select>
        </div>

        {/* Mode selector */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">영상 제작 방식</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('flow')}
              className={`border-2 rounded-xl p-4 text-left transition-all ${
                mode === 'flow' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌊</span>
                <span className="font-bold text-gray-900">Google Flow</span>
                {mode === 'flow' && <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full">선택됨</span>}
              </div>
              <p className="text-xs text-gray-500">Veo 모델 기반 AI 영상 생성. 씬별 시각 프롬프트 + 카메라 지시어 제공</p>
              <p className="text-xs text-purple-600 mt-1 font-medium">→ labs.google/flow 에서 사용</p>
            </button>
            <button
              onClick={() => setMode('grok')}
              className={`border-2 rounded-xl p-4 text-left transition-all ${
                mode === 'grok' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⚡</span>
                <span className="font-bold text-gray-900">Grok Aurora</span>
                {mode === 'grok' && <span className="text-xs bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded-full">선택됨</span>}
              </div>
              <p className="text-xs text-gray-500">xAI Grok 이미지 생성. 장면별 이미지를 생성하여 Vrew/CapCut으로 편집</p>
              <p className="text-xs text-indigo-600 mt-1 font-medium">→ grok.com 에서 이미지 생성</p>
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!script || loading}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-base hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              프롬프트 생성 중...
            </>
          ) : (
            <>
              {mode === 'flow' ? '🌊 Flow 씬 프롬프트 생성' : '⚡ Grok 이미지 프롬프트 생성'}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>
      )}

      {/* Guide */}
      {!hasResults && !loading && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-800 mb-3">📖 사용 가이드</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-purple-700 mb-2">🌊 Google Flow 방식</p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>여기서 씬 프롬프트 생성</li>
                <li>labs.google/flow 접속</li>
                <li>각 씬 프롬프트를 Flow에 입력</li>
                <li>Veo 모델로 씬 영상 생성</li>
                <li>생성된 영상 클립들을 Vrew/CapCut으로 조합</li>
                <li>나레이션 녹음 또는 TTS 추가</li>
              </ol>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-700 mb-2">⚡ Grok Aurora 방식</p>
              <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                <li>여기서 이미지 프롬프트 생성</li>
                <li>grok.com 접속 → 이미지 생성</li>
                <li>각 장면 이미지 다운로드</li>
                <li>Vrew에서 이미지 슬라이드쇼 + TTS</li>
                <li>나레이션 텍스트 붙여넣기</li>
                <li>자동 자막 + BGM 추가</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Google Flow Scenes */}
      {flowScenes.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800 text-lg">🌊 Google Flow 씬 프롬프트</h2>
          <p className="text-sm text-gray-500 mb-3">
            각 프롬프트를 복사해서{' '}
            <a href="https://labs.google/flow" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline font-medium">
              labs.google/flow
            </a>
            에 붙여넣으세요.
          </p>
          {flowScenes.map((scene) => (
            <div key={scene.sceneNumber} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-purple-50 px-4 py-2 flex items-center justify-between">
                <span className="font-semibold text-purple-800 text-sm">
                  씬 {scene.sceneNumber}: {scene.label}
                </span>
                <span className="text-xs text-purple-500">{scene.duration}</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase">🎙 나레이션 (한국어)</span>
                  </div>
                  <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">{scene.narration}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase">🌊 Flow 시각 프롬프트 (영어)</span>
                    <CopyButton text={scene.visualPrompt} />
                  </div>
                  <p className="text-sm text-purple-900 bg-purple-50 rounded-lg p-3 font-mono leading-relaxed">{scene.visualPrompt}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">🎥 카메라 지시어</span>
                  <p className="text-sm text-gray-600 mt-1">{scene.cameraDirection}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grok Image Prompts */}
      {imagePrompts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800 text-lg">⚡ Grok Aurora 이미지 프롬프트</h2>
          <p className="text-sm text-gray-500 mb-3">
            각 프롬프트를{' '}
            <a href="https://grok.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">
              grok.com
            </a>
            {' '}이미지 생성에 붙여넣고, 생성된 이미지를 Vrew로 슬라이드쇼 영상으로 만드세요.
          </p>
          {imagePrompts.map((img) => (
            <div key={img.imageNumber} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-indigo-50 px-4 py-2 flex items-center justify-between">
                <span className="font-semibold text-indigo-800 text-sm">이미지 {img.imageNumber}</span>
                <span className="text-xs text-indigo-500">{img.duration}</span>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase">🎙 나레이션 (한국어)</span>
                  <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 mt-1 leading-relaxed">{img.narration}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase">⚡ Grok 이미지 프롬프트 (영어)</span>
                    <CopyButton text={img.prompt} />
                  </div>
                  <p className="text-sm text-indigo-900 bg-indigo-50 rounded-lg p-3 font-mono leading-relaxed">{img.prompt}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Vrew guide */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-2">
            <p className="text-sm font-bold text-green-800 mb-2">📹 Vrew로 슬라이드쇼 영상 만들기</p>
            <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
              <li>Grok에서 이미지 모두 다운로드</li>
              <li>Vrew 실행 → 새 프로젝트 → 이미지로 만들기</li>
              <li>이미지 순서대로 삽입</li>
              <li>각 이미지 클립에 나레이션 텍스트 입력</li>
              <li>AI 보이스 선택 (TTS 자동 생성)</li>
              <li>자막 자동 생성 → BGM 추가 → 내보내기</li>
            </ol>
          </div>
        </div>
      )}

      {!scripts.length && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🎬</p>
          <p className="font-medium text-gray-500 mb-1">먼저 대본을 생성해주세요</p>
          <button onClick={() => navigate('/script')} className="mt-3 text-red-600 text-sm underline">
            대본 생성하러 가기 →
          </button>
        </div>
      )}
    </div>
  );
}
