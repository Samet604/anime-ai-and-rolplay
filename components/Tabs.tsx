import React from 'react';
import { Tab } from '../types';
import { MessageIcon, MicrophoneIcon, BookIcon, GearIcon, UserPlusIcon, StudyIcon } from './Icons';
import { useLocalization } from '../localization';

interface TabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: Record<string, string>;
}

const tabIcons: Record<Tab, React.ReactNode> = {
  [Tab.CHAT]: <MessageIcon />,
  [Tab.LIVE]: <MicrophoneIcon />,
  [Tab.ROLEPLAY]: <BookIcon />,
  [Tab.STUDY]: <StudyIcon />,
  [Tab.COMPANION]: <UserPlusIcon />,
  [Tab.SETTINGS]: <GearIcon />,
};

const TabsComponent: React.FC<TabsProps> = ({ activeTab, setActiveTab, theme }) => {
  const { t } = useLocalization();

  return (
    <div className={`flex justify-center flex-wrap gap-2 p-2 bg-gray-900/60 rounded-full border ${theme.border}`}>
      {Object.values(Tab).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex items-center justify-center px-4 md:px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 ${
            activeTab === tab
              ? `bg-${theme.accent}-500 text-white shadow-lg shadow-${theme.accent}-500/40`
              : 'bg-gray-700 text-purple-300 hover:bg-pink-400 hover:text-white'
          }`}
        >
          <span className="mr-2">{tabIcons[tab]}</span>
          {t(`tabs.${tab}`)}
        </button>
      ))}
    </div>
  );
};

export default TabsComponent;
