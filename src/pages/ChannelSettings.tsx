import { useState, useEffect } from 'react';
import { channelStore, notionStore } from '../lib/storage';
import type { ChannelProfile } from '../types';

const DEFAULT_CHANNELS: Omit<ChannelProfile, 'id' | 'createdAt'>[] = [
  {
    name: '시니어 스마트 라이프',
    targetAudience: '60~70대 시니어',
    niche: ['스마트폰 사용팁', '디지털 사용법', '인공지능 활용법'],
    tone: '친근하고 따뜻하게, 천천히 쉽게 설명, 위트 있는 유머 포함',
    style: '단계별 튜토리얼, 실생활 예시 중심, 공감 유도',
    language: 'ko',
  },
];

const EMPTY_FORM = {
  name: '',
  targetAudience: '',
  niche: '',
  tone: '',
  style: '',
};

export default function ChannelSettings() {
  const [channels, setChannels] = useState<ChannelProfile[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [notionToken, setNotionToken] = useState('');
  const [notionDbId, setNotionDbId] = useState('');
  const [notionTitleProp, setNotionTitleProp] = useState('이름');
  const [notionSaved, setNotionSaved] = useState(false);

  useEffect(() => {
    const stored = channelStore.getAll();
    if (stored.length === 0) {
      // 첫 실행: 기본 채널 자동 생성
      DEFAULT_CHANNELS.forEach((c) => channelStore.save(c));
    }
    setChannels(channelStore.getAll());
    setActiveId(channelStore.getActive());

    const notion = notionStore.get();
    setNotionToken(notion.token);
    setNotionDbId(notion.databaseId);
    setNotionTitleProp(notion.titleProp || '이름');
  }, []);

  function reload() {
    setChannels(channelStore.getAll());
    setActiveId(channelStore.getActive());
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(ch: ChannelProfile) {
    setForm({
      name: ch.name,
      targetAudience: ch.targetAudience,
      niche: ch.niche.join(', '),
      tone: ch.tone,
      style: ch.style,
    });
    setEditId(ch.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      targetAudience: form.targetAudience.trim(),
      niche: form.niche.split(',').map((s) => s.trim()).filter(Boolean),
      tone: form.tone.trim(),
      style: form.style.trim(),
      language: 'ko',
    };
    if (editId) {
      channelStore.update(editId, data);
    } else {
      channelStore.save(data);
    }
    setShowForm(false);
    reload();
  }

  function handleDelete(id: string) {
    channelStore.delete(id);
    reload();
  }

  function handleSetActive(id: string) {
    channelStore.setActive(id);
    setActiveId(id);
  }

  function handleNotionSave() {
    notionStore.save({ token: notionToken.trim(), databaseId: notionDbId.trim(), titleProp: notionTitleProp.trim() || '이름' });
    setNotionSaved(true);
    setTimeout(() => setNotionSaved(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">채널 설정</h1>
          <p className="text-gray-500 text-sm mt-1">채널 프로필을 관리하세요. 여러 채널을 등록할 수 있습니다.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          + 채널 추가
        </button>
      </div>

      {/* Channel list */}
      <div className="grid gap-4">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className={`bg-white rounded-xl border-2 p-5 transition-all ${
              activeId === ch.id ? 'border-red-500' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900">{ch.name}</h3>
                  {activeId === ch.id && (
                    <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      활성 채널
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">대상: {ch.targetAudience}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ch.niche.map((n) => (
                    <span key={n} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                      {n}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">톤: {ch.tone}</p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                {activeId !== ch.id && (
                  <button
                    onClick={() => handleSetActive(ch.id)}
                    className="text-sm border border-red-300 text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    선택
                  </button>
                )}
                <button
                  onClick={() => openEdit(ch)}
                  className="text-sm border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  편집
                </button>
                <button
                  onClick={() => handleDelete(ch.id)}
                  className="text-sm border border-gray-200 text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}

        {channels.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📺</p>
            <p>등록된 채널이 없습니다. 채널을 추가해보세요.</p>
          </div>
        )}
      </div>

      {/* Notion 연동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
        <h2 className="font-bold text-gray-800 mb-1">Notion 연동 설정</h2>
        <p className="text-sm text-gray-500 mb-4">
          영상 제작 페이지에서 프롬프트를 Notion 데이터베이스로 바로 전송할 수 있습니다.{' '}
          <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">
            Integration 토큰 발급 →
          </a>
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Integration 토큰</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="secret_..."
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">데이터베이스 ID</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={notionDbId}
              onChange={(e) => setNotionDbId(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Notion 데이터베이스 URL에서 복사하세요 (notion.so/xxxxxxxx... 부분)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 속성명</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="이름"
              value={notionTitleProp}
              onChange={(e) => setNotionTitleProp(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">데이터베이스의 제목(Title) 속성 이름 (기본값: 이름)</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNotionSave}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              저장
            </button>
            {notionSaved && <span className="text-sm text-green-600">✓ 저장되었습니다</span>}
          </div>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-5">{editId ? '채널 편집' : '새 채널 추가'}</h2>
            <div className="space-y-4">
              {[
                { key: 'name', label: '채널명 *', placeholder: '예: 시니어 스마트 라이프' },
                { key: 'targetAudience', label: '대상 시청자', placeholder: '예: 60~70대 시니어' },
                { key: 'niche', label: '콘텐츠 분야 (쉼표로 구분)', placeholder: '예: 스마트폰 사용팁, AI 활용법' },
                { key: 'tone', label: '채널 톤/스타일', placeholder: '예: 친근하고 쉽게, 유머 포함' },
                { key: 'style', label: '콘텐츠 스타일', placeholder: '예: 단계별 튜토리얼, 실생활 예시' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder={placeholder}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                저장
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
