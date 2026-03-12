import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { channelStore, topicStore, scriptStore, historyStore } from '../lib/storage';
import { generateScriptStream, parseScript } from '../lib/gemini';
import { copyToClipboard } from '../lib/clipboard';
import type { ChannelProfile, Topic, Script } from '../types';

const DURATION_OPTIONS = ['5분', '8분', '10분', '12분', '15분'];

export default function ScriptWriter() {
  const { topicId } = useParams<{ topicId?: string }>();
  const navigate = useNavigate();

  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [topicList, setTopicList] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState(topicId ?? '');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [duration, setDuration] = useState('10분');
  const [rawScript, setRawScript] = useState('');
  const [script, setScript] = useState<Script | null>(null);
  const [activeTitleIndex, setActiveTitleIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'structured'>('structured');
  const rawRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const all = channelStore.getAll();
    const activeId = channelStore.getActive();
    const active = all.find((c) => c.id === activeId) ?? all[0] ?? null;
    setChannel(active);
    if (active) {
      const topics = topicStore.getByChannel(active.id);
      setTopicList(topics);
      const found = topics.find((t) => t.id === topicId);
      if (found) {
        setTopic(found);
        setSelectedTopicId(found.id);
        setSelectedTitle(found.titleSuggestions[0] ?? found.title);
      }
    }
  }, [topicId]);

  function handleTopicChange(id: string) {
    setSelectedTopicId(id);
    const found = topicList.find((t) => t.id === id);
    setTopic(found ?? null);
    setSelectedTitle(found?.titleSuggestions[0] ?? found?.title ?? '');
    setRawScript('');
    setScript(null);
    setSaved(false);
  }

  function handleSelectTitle(index: number, title: string) {
    if (!script) return;
    setActiveTitleIndex(index);
    scriptStore.update(script.id, { videoTitle: title });
    setScript({ ...script, videoTitle: title });
  }

  async function handleGenerate() {
    if (!channel || !topic) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setGenerating(true);
    setError('');
    setRawScript('');
    setScript(null);
    setActiveTitleIndex(0);
    setSaved(false);
    rawRef.current = '';

    try {
      await generateScriptStream(channel, topic.title, selectedTitle || topic.title, duration, (chunk) => {
        rawRef.current += chunk;
        setRawScript(rawRef.current);
      }, abortRef.current?.signal);

      const parsed = parseScript(rawRef.current);
      const newScript = scriptStore.save({
        topicId: topic.id,
        channelId: channel.id,
        videoTitle: parsed.videoTitle || selectedTitle || topic.title,
        titleOptions: parsed.titleOptions,
        description: parsed.description,
        descriptionBasis: parsed.descriptionBasis,
        tags: parsed.tags,
        thumbnailText: parsed.thumbnailText,
        duration,
        sections: parsed.sections,
        flowScenes: [],
      });
      setScript(newScript);
      setSaved(true);

      historyStore.add({
        channelId: channel.id,
        topicTitle: topic.title,
        scriptTitle: newScript.videoTitle,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      setError('대본 생성 중 오류가 발생했습니다.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([rawRef.current], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script?.videoTitle ?? '대본'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    copyToClipboard(rawRef.current);
  }

  function handleGoVideo() {
    if (script) navigate(`/video/${script.id}`);
  }

  const labelColor: Record<string, string> = {
    '훅': 'bg-red-100 text-red-700',
    '인트로': 'bg-orange-100 text-orange-700',
    '마무리': 'bg-green-100 text-green-700',
    '마무리 & CTA': 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📝 대본 생성</h1>
          <p className="text-gray-500 text-sm mt-1">훅 · 위트 · 공감 — 시니어도 빠져드는 대본</p>
        </div>
        {script && (
          <button
            onClick={handleGoVideo}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-700 transition-colors"
          >
            🎬 영상 제작으로 →
          </button>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">주제 선택</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              value={selectedTopicId}
              onChange={(e) => handleTopicChange(e.target.value)}
            >
              <option value="">-- 주제 선택 --</option>
              {topicList.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">영상 길이</label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    duration === d ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {topic && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">영상 제목 (수정 가능)</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              placeholder="클릭 유도 영상 제목"
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {topic.titleSuggestions.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTitle(t)}
                  className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!channel || !topic || generating}
          className="mt-4 w-full bg-red-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              대본 작성 중...
            </>
          ) : (
            '✨ 대본 생성'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>
      )}

      {/* Script output */}
      {(rawScript || script) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('structured')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'structured' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                구조화 보기
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'raw' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                원문 보기
              </button>
            </div>
            <div className="flex gap-2">
              {saved && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg font-medium">✓ 저장됨</span>
              )}
              <button onClick={handleCopy} className="text-sm border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50">
                복사
              </button>
              <button onClick={handleDownload} className="text-sm border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50">
                다운로드
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* Metadata */}
            {script && activeTab === 'structured' && (
              <div className="mb-5 space-y-4">

                {/* 제목 3개 + SEO 이유 */}
                {script.titleOptions && script.titleOptions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🎯 제목 옵션</span>
                      <span className="text-xs text-gray-400">클릭 후 영상 제목으로 설정</span>
                    </div>
                    <div className="space-y-2">
                      {script.titleOptions.map((opt, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectTitle(i, opt.title)}
                          className={`border rounded-xl p-3 cursor-pointer transition-colors ${
                            i === activeTitleIndex
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-white hover:border-red-200 hover:bg-red-50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                              i === activeTitleIndex ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-snug">{opt.title}</p>
                              {opt.reason && (
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                  💡 {opt.reason}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(opt.title);
                              }}
                              className="text-xs text-gray-400 hover:text-gray-600 shrink-0 px-1.5 py-0.5 rounded hover:bg-gray-100"
                            >
                              복사
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 썸네일 텍스트 */}
                {script.thumbnailText && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">🖼 썸네일 텍스트</span>
                    <p className="text-sm text-yellow-900 font-medium mt-1">{script.thumbnailText}</p>
                  </div>
                )}

                {/* 태그 전체 */}
                {script.tags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🏷 태그 ({script.tags.length}개)</span>
                      <button
                        onClick={() => copyToClipboard(script.tags.map((t) => `#${t}`).join(' '))}
                        className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-0.5 rounded"
                      >
                        전체 복사
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {script.tags.map((tag, i) => (
                        <span
                          key={`${tag}-${i}`}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            i < 5
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">빨간색 = 핵심 태그 (검색량 상위 5개)</p>
                  </div>
                )}

                {/* 설명문 + 근거 */}
                {script.description && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">📄 설명문</span>
                        <button
                          onClick={() => copyToClipboard(script.description)}
                          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-0.5 rounded bg-white"
                        >
                          복사
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{script.description}</p>
                    </div>
                    {script.descriptionBasis && (
                      <div className="border-t border-gray-200 pt-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">📌 콘텐츠 근거</span>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{script.descriptionBasis}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sections */}
            {script && activeTab === 'structured' && (
              <div className="space-y-4">
                {script.sections.map((sec, i) => {
                  const colorClass = Object.entries(labelColor).find(([k]) => sec.label.includes(k))?.[1] ?? 'bg-blue-100 text-blue-700';
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className={`px-4 py-2 font-semibold text-sm ${colorClass}`}>
                        {sec.label}
                      </div>
                      <div className="p-4 prose-custom whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                        {sec.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Raw text (also used while streaming) */}
            {activeTab === 'raw' && (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
                {rawScript || '생성 중...'}
              </pre>
            )}

            {/* Still generating but no script yet */}
            {generating && !script && activeTab === 'structured' && (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {rawScript || '대본을 작성하고 있습니다...'}
              </pre>
            )}
          </div>
        </div>
      )}

      {!topic && !rawScript && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="font-medium text-gray-500 mb-1">주제를 선택하고 대본을 생성해보세요</p>
          <p className="text-sm">주제가 없으면 먼저 주제 발굴을 해주세요</p>
          <button onClick={() => navigate('/topics')} className="mt-4 text-red-600 text-sm underline">
            주제 발굴하러 가기 →
          </button>
        </div>
      )}
    </div>
  );
}
