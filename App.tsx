import React, { useState } from 'react';
import { Tab, Theme, CustomBot, AuthStatus } from './types';
import Chat from './components/Chat';
import LiveConversation from './components/LiveConversation';
import Tabs from './components/Tabs';
import Settings from './components/Settings';
import Roleplay from './components/Roleplay';
import { getBotsByTheme } from './services/geminiService';
import { useLocalization } from './localization';
import { UserCircleIcon } from './components/Icons';

// A simple hook to persist state to localStorage
export const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};


const themes: Record<Theme, Record<string, string>> = {
    yandere: {
        gradient: 'from-gray-900 via-purple-900/50 to-black',
        border: 'border-pink-500/30',
        text: 'text-pink-400',
        shadow: 'shadow-pink-500/50',
        accent: 'pink',
    },
    kuudere: {
        gradient: 'from-slate-900 via-blue-900/50 to-black',
        border: 'border-blue-400/30',
        text: 'text-blue-300',
        shadow: 'shadow-blue-400/50',
        accent: 'blue',
    },
    deredere: {
        gradient: 'from-gray-900 via-emerald-900/50 to-black',
        border: 'border-green-400/30',
        text: 'text-green-300',
        shadow: 'shadow-green-400/50',
        accent: 'green',
    },
    tsundere: {
        gradient: 'from-gray-900 via-red-900/50 to-black',
        border: 'border-red-500/30',
        text: 'text-red-300',
        shadow: 'shadow-red-500/50',
        accent: 'red',
    },
    dandere: {
        gradient: 'from-slate-900 via-indigo-900/50 to-black',
        border: 'border-indigo-400/30',
        text: 'text-indigo-300',
        shadow: 'shadow-indigo-400/50',
        accent: 'indigo',
    },
    himedere: {
        gradient: 'from-black via-amber-800/50 to-black',
        border: 'border-yellow-400/30',
        text: 'text-yellow-300',
        shadow: 'shadow-yellow-400/50',
        accent: 'yellow',
    },
    sadodere: {
        gradient: 'from-black via-rose-900/60 to-black',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        shadow: 'shadow-rose-500/50',
        accent: 'rose',
    },
    mayadere: {
        gradient: 'from-black via-cyan-900/60 to-black',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        shadow: 'shadow-cyan-500/50',
        accent: 'cyan',
    },
    undere: {
        gradient: 'from-gray-900 via-stone-800/50 to-black',
        border: 'border-stone-500/30',
        text: 'text-stone-400',
        shadow: 'shadow-stone-500/50',
        accent: 'stone',
    }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT);
  const { t } = useLocalization();
  const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'yandere');
  const [customBot, setCustomBot] = useLocalStorage<CustomBot | null>('custom-bot', null);
  const [authStatus, setAuthStatus] = useLocalStorage<AuthStatus>('auth-status', { isLoggedIn: false });
  const [defaultAvatars, setDefaultAvatars] = useLocalStorage<Record<Theme, string>>('default-avatars', {
      yandere: '', kuudere: '', deredere: '', tsundere: '', dandere: '', himedere: '', sadodere: '', mayadere: '', undere: ''
  });

  const botsByTheme = getBotsByTheme(t);
  const activeBot = customBot || {
    ...botsByTheme[theme],
    avatarUrl: defaultAvatars[theme] || ''
  };
  const currentTheme = themes[theme];

  const renderContent = () => {
    switch (activeTab) {
        case Tab.CHAT:
            return <Chat bot={activeBot} theme={currentTheme} themeName={theme} />;
        case Tab.LIVE:
            return <LiveConversation bot={activeBot} theme={currentTheme}/>;
        case Tab.ROLEPLAY:
            return <Roleplay theme={currentTheme}/>;
        case Tab.SETTINGS:
            return <Settings 
                        theme={theme} 
                        setTheme={setTheme}
                        customBot={customBot}
                        setCustomBot={setCustomBot}
                        authStatus={authStatus}
                        setAuthStatus={setAuthStatus}
                        themeConfig={currentTheme}
                        defaultAvatars={defaultAvatars}
                        setDefaultAvatars={setDefaultAvatars}
                    />;
        default:
            return <Chat bot={activeBot} theme={currentTheme} themeName={theme} />;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.gradient} flex flex-col items-center p-4`}>
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        <header className={`flex items-center justify-center text-center p-4 border-b-2 ${currentTheme.border}`}>
          <div className={`w-24 h-24 rounded-full border-4 bg-gray-800 flex items-center justify-center border-${currentTheme.accent}-500 shadow-lg ${currentTheme.shadow} mr-6`}>
            {activeBot.avatarUrl ? (
               <img 
                src={activeBot.avatarUrl}
                alt={activeBot.name} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon />
            )}
          </div>
          <div>
            <h1 className={`text-4xl font-bold ${currentTheme.text} tracking-wider`} style={{ fontFamily: "'Brush Script MT', cursive" }}>
              {activeBot.name}
            </h1>
            <p className="text-purple-300 mt-1">{activeBot.subtitle}</p>
            {authStatus.isLoggedIn && (
              <p className="text-sm text-gray-400 mt-1">{t('app.greeting', authStatus.username || 'Senpai')}</p>
            )}
          </div>
        </header>

        <main className="flex-grow mt-4">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} theme={currentTheme} />
          <div className={`mt-4 p-4 bg-gray-800/50 rounded-lg shadow-2xl border ${currentTheme.border} min-h-[60vh]`}>
            {renderContent()}
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-gray-500">
          <p>{t('app.footer', activeBot.name)}</p>
        </footer>
      </div>
    </div>
  );
};

export default App;