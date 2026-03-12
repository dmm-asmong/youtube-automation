import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { channelStore, topicStore } from '../lib/storage';
import { discoverTopics } from '../lib/gemini';
import type { ChannelProfile, Topic } from '../types';

const TREND_COLOR = { 상승: 'text-green-600 bg-green-50', 유지: 'text-gray-600 bg-gray-100', 하락: 'text-red-500 bg-red-50' };
const VOLUME_COLOR = { 낮음: 'text-gray-500', 보통: 'text-blue-500', 높음: 'text-orange-500', 매우높음: 'text-red-600 font-bold' };

function ViralBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-orange-400' : 'bg-yellow-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold ${score >= 80 ? 'text-red-600' : score >= 60 ? 'text-orange-500' : 'text-yellow-600'}`}>
        {score}점
      </span>
    </div>
  );
}

export default function TopicFinder() {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  useEffect(() => {
    const all = channelStore.getAll();
    const activeId = channelStore.getActive();
    const active = all.find((c) => c.id === activeId) ?? all[0] ?? null;
    setChannel(active);
    if (active) {
      setTopics(topicStore.getByChannel(active.id));
    }
  }, []);

  async function handleDiscover() {
    if (!channel) return;
    setLoading(true);
    setError('');
    try {
      const raw = await discoverTopics(channel);
      const saved = topicStore.saveAll(channel.id, raw);
      setTopics(saved);
    } catch (e) {
      setError('주제 발굴 중 오류가 발생했습니다. API 키를 확인해주세요.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTopic(topic: Topic) {
    setSelectedTopic(topic);
  }

  function handleGoScript(topicId: string) {
    navigate(`/script/${topicId}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔥 주제 발굴</h1>
          <p className="text-gray-500 text-sm mt-1">
            {channel ? `${channel.name} · AI가 바이럴 주제를 분석합니다` : '채널을 먼저 설정해주세요'}
          </p>
        </div>
        <button
          onClick={handleDiscover}
          disabled={!channel || loading}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              분석 중...
            </>
          ) : (
            '🔍 주제 발굴 시작'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>
      )}

      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center mb-4">
          <div className="text-4xl mb-3 animate-bounce">🔍</div>
          <p className="font-medium text-blue-800">AI가 트렌딩 주제를 분석하고 있습니다...</p>
          <p className="text-sm text-blue-600 mt-1">Google 검색 + Gemini 분석 중 (약 20~30초)</p>
        </div>
      )}

      {/* Topic list */}
      {topics.length > 0 && !loading && (
        <div className="space-y-3">
          {topics
            .sort((a, b) => b.viralScore - a.viralScore)
            .map((topic, i) => (
              <div
                key={topic.id}
                onClick={() => handleSelectTopic(topic)}
                className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTopic?.id === topic.id ? 'border-red-500 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl font-black text-gray-200 leading-none mt-0.5 w-8 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{topic.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TREND_COLOR[topic.trend]}`}>
                        {topic.trend === '상승' ? '↑' : topic.trend === '하락' ? '↓' : '→'} {topic.trend}
                      </span>
                      <span className={`text-xs font-medium ${VOLUME_COLOR[topic.searchVolume]}`}>
                        검색량: {topic.searchVolume}
                      </span>
                    </div>
                    <ViralBar score={topic.viralScore} />
                    <p className="text-sm text-gray-500 mt-2">{topic.reason}</p>

                    {selectedTopic?.id === topic.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-600 mb-2">추천 제목 (클릭 유도)</p>
                        <ul className="space-y-1">
                          {topic.titleSuggestions.map((t, j) => (
                            <li key={j} className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                              💡 {t}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {topic.keywords.map((kw) => (
                            <span key={kw} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                              #{kw}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGoScript(topic.id); }}
                          className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                        >
                          📝 이 주제로 대본 생성하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {topics.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-medium text-gray-500 mb-2">아직 발굴된 주제가 없습니다</p>
          <p className="text-sm">위의 "주제 발굴 시작" 버튼을 눌러보세요!</p>
        </div>
      )}
    </div>
  );
}
