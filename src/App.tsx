import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TopicFinder from './pages/TopicFinder';
import ScriptWriter from './pages/ScriptWriter';
import VideoCreator from './pages/VideoCreator';
import ChannelSettings from './pages/ChannelSettings';

const NAV_ITEMS = [
  { to: '/',         icon: '🏠', shortLabel: '홈',   label: '대시보드',  end: true  },
  { to: '/topics',   icon: '🔥', shortLabel: '주제', label: '주제 발굴', end: false },
  { to: '/script',   icon: '📝', shortLabel: '대본', label: '대본 생성', end: false },
  { to: '/video',    icon: '🎬', shortLabel: '영상', label: '영상 제작', end: false },
  { to: '/settings', icon: '⚙️', shortLabel: '설정', label: '채널 설정', end: false },
];

function Layout() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── 데스크탑 상단 네비 (md 이상에서만 표시) ── */}
      <header className="hidden md:block bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-bold text-lg text-red-600">▶ 유튜브 자동화</span>
          <nav className="flex gap-1">
            {NAV_ITEMS.map(({ to, icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {icon} {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* ── 모바일 상단 타이틀바 (md 미만에서만 표시) ── */}
      <header className="md:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 flex items-center justify-center h-12">
          <span className="font-bold text-base text-red-600">▶ 유튜브 자동화</span>
        </div>
      </header>

      {/* ── 콘텐츠 (모바일에서 하단 탭바 높이만큼 패딩) ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        <Routes>
          <Route path="/"                element={<Dashboard />} />
          <Route path="/topics"          element={<TopicFinder />} />
          <Route path="/script"          element={<ScriptWriter />} />
          <Route path="/script/:topicId" element={<ScriptWriter />} />
          <Route path="/video"           element={<VideoCreator />} />
          <Route path="/video/:scriptId" element={<VideoCreator />} />
          <Route path="/settings"        element={<ChannelSettings />} />
        </Routes>
      </main>

      {/* ── 모바일 하단 탭바 (md 미만에서만 표시) ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {NAV_ITEMS.map(({ to, icon, shortLabel, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-red-600' : 'text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-xl leading-none ${isActive ? 'scale-110' : ''}`}>{icon}</span>
                  <span>{shortLabel}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
