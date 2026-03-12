import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { channelStore, historyStore, scriptStore, topicStore } from '../lib/storage';
import type { ChannelProfile, ContentHistory } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [activeChannel, setActiveChannelState] = useState<ChannelProfile | null>(null);
  const [history, setHistory] = useState<ContentHistory[]>([]);

  useEffect(() => {
    const all = channelStore.getAll();
    setChannels(all);
    const activeId = channelStore.getActive();
    const active = all.find((c) => c.id === activeId) ?? all[0] ?? null;
    if (active) {
      setActiveChannelState(active);
      setHistory(historyStore.getByChannel(active.id));
    }
  }, []);

  function switchChannel(ch: ChannelProfile) {
    channelStore.setActive(ch.id);
    setActiveChannelState(ch);
    setHistory(historyStore.getByChannel(ch.id));
  }

  const steps = [
    {
      icon: '🔥',
      title: '주제 발굴',
      desc: 'AI가 바이럴 주제를 찾아드려요',
      color: 'bg-orange-50 border-orange-200',
      btnColor: 'bg-orange-500 hover:bg-orange-600',
      path: '/topics',
    },
    {
      icon: '📝',
      title: '대본 생성',
      desc: '훅 + 위트 있는 대본 자동 작성',
      color: 'bg-blue-50 border-blue-200',
      btnColor: 'bg-blue-500 hover:bg-blue-600',
      path: '/script',
    },
    {
      icon: '🎬',
      title: '영상 제작',
      desc: 'Google Flow / Grok 프롬프트 생성',
      color: 'bg-purple-50 border-purple-200',
      btnColor: 'bg-purple-500 hover:bg-purple-600',
      path: '/video',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">안녕하세요! 👋</h1>
        <p className="text-gray-500 mt-1">오늘도 폭발적인 콘텐츠 만들어봐요</p>
      </div>

      {/* Active channel selector */}
      {channels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-xs font-medium text-gray-400 mb-2">현재 채널</p>
          <div className="flex gap-2 flex-wrap">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => switchChannel(ch)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeChannel?.id === ch.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ch.name}
              </button>
            ))}
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 border border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
            >
              + 채널 추가
            </button>
          </div>
          {activeChannel && (
            <p className="text-xs text-gray-400 mt-2">
              대상: {activeChannel.targetAudience} · 분야: {activeChannel.niche.join(', ')}
            </p>
          )}
        </div>
      )}

      {channels.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">⚠️ 채널을 먼저 설정해주세요</p>
          <button
            onClick={() => navigate('/settings')}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
          >
            채널 설정하기
          </button>
        </div>
      )}

      {/* Workflow steps */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {steps.map((step) => (
          <div key={step.path} className={`rounded-xl border-2 p-5 ${step.color}`}>
            <div className="text-3xl mb-2">{step.icon}</div>
            <h3 className="font-bold text-gray-900 mb-1">{step.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{step.desc}</p>
            <button
              onClick={() => navigate(step.path)}
              className={`w-full text-white py-2 rounded-lg text-sm font-medium transition-colors ${step.btnColor}`}
            >
              시작하기
            </button>
          </div>
        ))}
      </div>

      {/* Workflow arrow guide */}
      <div className="bg-gradient-to-r from-orange-50 via-blue-50 to-purple-50 border border-gray-200 rounded-xl p-4 mb-6 text-center text-sm text-gray-500">
        🔥 주제 발굴 → 📝 대본 생성 → 🎬 영상 제작 — 이 순서로 진행하면 됩니다!
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-800 mb-3">📋 최근 생성 이력</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{h.scriptTitle}</p>
                  <p className="text-xs text-gray-400">{h.topicTitle}</p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(h.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
