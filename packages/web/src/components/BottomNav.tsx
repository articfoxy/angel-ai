import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Brain, FileText, Mic, Settings } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/memory', icon: Brain, label: 'Memory' },
  { path: '/session', icon: Mic, label: 'Record', isCenter: true },
  { path: '/digest', icon: FileText, label: 'Digest' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on login/register pages and during active recording
  if (location.pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border pb-safe z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-primary shadow-lg shadow-primary/30'
                      : 'bg-surface-hover'
                  }`}
                >
                  <Icon size={24} className="text-white" />
                </div>
                <span className="text-[10px] mt-1 text-text-secondary">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center min-w-[52px] h-full"
            >
              <Icon
                size={20}
                className={`transition-colors ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
              />
              <span
                className={`text-[10px] mt-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
