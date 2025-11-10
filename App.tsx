import React, { useState, useEffect } from 'react';
import { Tab, Theme, Companion, AuthStatus, UiMode, UserGender } from './types';
import Chat from './components/Chat';
import LiveConversation from './components/LiveConversation';
import Tabs from './components/Tabs';
import Settings from './components/Settings';
import Roleplay from './components/Roleplay';
import CompanionCreator from './components/CompanionCreator';
import { getBotsByTheme } from './services/geminiService';
import { useLocalization } from './localization';
import { UserCircleIcon } from './components/Icons';
import StudySession from './components/StudySession';

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
    },
    bakadere: {
        gradient: 'from-gray-900 via-orange-900/50 to-black',
        border: 'border-orange-500/30',
        text: 'text-orange-300',
        shadow: 'shadow-orange-500/50',
        accent: 'orange',
    },
    kamidere: {
        gradient: 'from-slate-900 via-sky-800/60 to-black',
        border: 'border-yellow-200/30',
        text: 'text-yellow-100',
        shadow: 'shadow-yellow-200/50',
        accent: 'yellow',
    },
    shundere: {
        gradient: 'from-black via-gray-800/60 to-black',
        border: 'border-gray-600/30',
        text: 'text-gray-400',
        shadow: 'shadow-gray-600/50',
        accent: 'gray',
    }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CHAT);
  const { t } = useLocalization();
  const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'yandere');
  const [uiMode, setUiMode] = useLocalStorage<UiMode>('ui-mode', 'dark');

  const [customBots, setCustomBots] = useLocalStorage<Companion[]>('custom-bots', []);
  const [activeBotId, setActiveBotId] = useLocalStorage<string | null>('active-bot-id', null);
  const [authStatus, setAuthStatus] = useLocalStorage<AuthStatus>('auth-status', { isLoggedIn: false });
  const [defaultAvatars, setDefaultAvatars] = useLocalStorage<Record<Theme, string>>('default-avatars', {
      yandere: '', kuudere: '', deredere: '', tsundere: '', dandere: '', himedere: '', sadodere: '', mayadere: '', undere: '', bakadere: '', kamidere: '', shundere: ''
  });
  const [isNsfw, setIsNsfw] = useLocalStorage<boolean>('nsfw-mode', false);
  const [enableRandomImages, setEnableRandomImages] = useLocalStorage<boolean>('enable-random-images', true);
  const [enableAutoPlayback, setEnableAutoPlayback] = useLocalStorage<boolean>('enable-auto-playback', false);
  const [userGender, setUserGender] = useLocalStorage<UserGender>('user-gender', 'female');

  useEffect(() => {
    document.documentElement.className = uiMode;
  }, [uiMode]);

  const botsByTheme = getBotsByTheme(t);

  const getActiveBot = (): Companion => {
      const customBot = customBots.find(bot => bot.id === activeBotId);
      if (customBot) {
          return customBot;
      }
      const defaultBot = botsByTheme[theme];
      return {
          id: `default-${theme}`,
          ...defaultBot,
          avatarUrl: defaultAvatars[theme] || '',
      };
  };

  const activeBot = getActiveBot();
  const currentTheme = themes[theme];

  const renderContent = () => {
    switch (activeTab) {
        case Tab.CHAT:
            return <Chat bot={activeBot} theme={currentTheme} themeName={theme} isNsfw={isNsfw} enableRandomImages={enableRandomImages} enableAutoPlayback={enableAutoPlayback} />;
        case Tab.LIVE:
            return <LiveConversation bot={activeBot} theme={currentTheme} isNsfw={isNsfw} />;
        case Tab.ROLEPLAY:
            return <Roleplay theme={currentTheme} isNsfw={isNsfw} />;
        case Tab.STUDY:
            return <StudySession bot={activeBot} theme={currentTheme} isNsfw={isNsfw} userGender={userGender} />;
        case Tab.COMPANION:
            return <CompanionCreator
                        customBots={customBots}
                        setCustomBots={setCustomBots}
                        activeBotId={activeBotId}
                        setActiveBotId={setActiveBotId}
                        themeConfig={currentTheme}
                        isNsfw={isNsfw}
                        theme={theme}
                        setTheme={setTheme}
                        defaultAvatars={defaultAvatars}
                        setDefaultAvatars={setDefaultAvatars}
                    />;
        case Tab.SETTINGS:
            return <Settings 
                        authStatus={authStatus}
                        setAuthStatus={setAuthStatus}
                        themeConfig={currentTheme}
                        isNsfw={isNsfw}
                        setIsNsfw={setIsNsfw}
                        enableRandomImages={enableRandomImages}
                        setEnableRandomImages={setEnableRandomImages}
                        uiMode={uiMode}
                        setUiMode={setUiMode}
                        enableAutoPlayback={enableAutoPlayback}
                        setEnableAutoPlayback={setEnableAutoPlayback}
                        userGender={userGender}
                        setUserGender={setUserGender}
                    />;
        default:
            return <Chat bot={activeBot} theme={currentTheme} themeName={theme} isNsfw={isNsfw} enableRandomImages={enableRandomImages} enableAutoPlayback={enableAutoPlayback} />;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center p-4 transition-colors duration-300 ${uiMode === 'dark' ? `bg-gradient-to-br ${currentTheme.gradient}` : 'bg-gray-50'}`}>
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        <header className={`flex items-center justify-center text-center p-4 border-b-2 dark:${currentTheme.border} border-gray-200`}>
          <div className={`w-24 h-24 rounded-full border-2 bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-${currentTheme.accent}-300 dark:border-${currentTheme.accent}-500 shadow-lg ${currentTheme.shadow} mr-6`}>
            {activeBot.avatarUrl ? (
               <img 
                src={activeBot.avatarUrl}
                alt={activeBot.name} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="text-gray-400 dark:text-gray-600" />
            )}
          </div>
          <div>
            <h1 className={`text-4xl font-bold text-${currentTheme.accent}-700 dark:${currentTheme.text} tracking-wider`} style={{ fontFamily: "'Brush Script MT', cursive" }}>
              {activeBot.name}
            </h1>
            <p className="text-purple-600 dark:text-purple-300 mt-1">{activeBot.subtitle}</p>
            {authStatus.isLoggedIn && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('app.greeting', authStatus.username || 'Senpai')}</p>
            )}
          </div>
        </header>

        <main className="flex-grow mt-4">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} theme={currentTheme} />
          <div className={`mt-4 p-4 bg-white/70 backdrop-blur-sm dark:bg-gray-800/50 rounded-lg shadow-2xl border dark:${currentTheme.border} border-gray-200 min-h-[60vh]`}>
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