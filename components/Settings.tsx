import React from 'react';
import { AuthStatus, UiMode, UserGender } from '../types';
import { useLocalization } from '../localization';
import { GoogleIcon } from './Icons';

interface SettingsProps {
    authStatus: AuthStatus;
    setAuthStatus: (status: AuthStatus) => void;
    themeConfig: Record<string, string>;
    isNsfw: boolean;
    setIsNsfw: (value: boolean) => void;
    enableRandomImages: boolean;
    setEnableRandomImages: (value: boolean) => void;
    enableAutoPlayback: boolean;
    setEnableAutoPlayback: (value: boolean) => void;
    uiMode: UiMode;
    setUiMode: (value: UiMode) => void;
    userGender: UserGender;
    setUserGender: (value: UserGender) => void;
}


const Settings: React.FC<SettingsProps> = ({
    authStatus,
    setAuthStatus,
    themeConfig,
    isNsfw,
    setIsNsfw,
    enableRandomImages,
    setEnableRandomImages,
    enableAutoPlayback,
    setEnableAutoPlayback,
    uiMode,
    setUiMode,
    userGender,
    setUserGender
}) => {
    const { t, setLanguage, language } = useLocalization();

    const handleLogout = () => {
        if (window.confirm(t('settings.account.logout_confirm'))) {
            setAuthStatus({ isLoggedIn: false });
        }
    };
    
    const handleClearHistory = () => {
        if (window.confirm(t('settings.data.clear_all_history_warning'))) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('chat-history-') || key.startsWith('roleplay-') || key.startsWith('saved-worlds') || key.startsWith('study-session-')) {
                    localStorage.removeItem(key);
                }
            });
            alert(t('settings.data.clear_all_history_success'));
            window.location.reload();
        }
    };
    
    const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <div className="mb-8">
            <h2 className={`text-2xl font-bold text-${themeConfig.accent}-700 dark:${themeConfig.text} mb-4 border-b-2 dark:${themeConfig.border} border-gray-200 pb-2`}>{title}</h2>
            {children}
        </div>
    );
    
    return (
        <div className="text-gray-800 dark:text-white p-4 h-[65vh] overflow-y-auto">
             <Section title={t('settings.language.title')}>
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className={`bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 rounded text-base p-2 focus:ring-${themeConfig.accent}-500 focus:border-${themeConfig.accent}-500`}
                >
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="ja">日本語</option>
                </select>
            </Section>

             <Section title={t('settings.appearance.title')}>
                <div className="flex items-center space-x-4 bg-gray-200 dark:bg-gray-900/50 p-3 rounded-lg">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{t('settings.appearance.mode_label')}:</span>
                    <div className="flex rounded-lg p-1 bg-gray-300 dark:bg-gray-700">
                        <button
                            onClick={() => setUiMode('light')}
                            className={`px-4 py-1 text-sm rounded-md transition ${uiMode === 'light' ? `bg-${themeConfig.accent}-500 text-white` : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {t('settings.appearance.light')}
                        </button>
                        <button
                            onClick={() => setUiMode('dark')}
                            className={`px-4 py-1 text-sm rounded-md transition ${uiMode === 'dark' ? `bg-${themeConfig.accent}-500 text-white` : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {t('settings.appearance.dark')}
                        </button>
                    </div>
                </div>
            </Section>

            <Section title={t('settings.personalization.title')}>
                <div className="flex items-center space-x-4 bg-gray-200 dark:bg-gray-900/50 p-3 rounded-lg">
                    <label htmlFor="gender-select" className="font-medium text-gray-700 dark:text-gray-200">{t('settings.personalization.gender_label')}</label>
                    <select 
                        id="gender-select"
                        value={userGender} 
                        onChange={(e) => setUserGender(e.target.value as any)}
                        className={`bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 rounded text-base p-2 focus:ring-${themeConfig.accent}-500 focus:border-${themeConfig.accent}-500`}
                    >
                        <option value="female">{t('settings.personalization.genders.female')}</option>
                        <option value="male">{t('settings.personalization.genders.male')}</option>
                        <option value="nonbinary">{t('settings.personalization.genders.nonbinary')}</option>
                        <option value="helicopter">{t('settings.personalization.genders.helicopter')}</option>
                        <option value="toast">{t('settings.personalization.genders.toast')}</option>
                        <option value="potato">{t('settings.personalization.genders.potato')}</option>
                    </select>
                </div>
            </Section>
            
            <Section title={t('settings.account.title')}>
                {authStatus.isLoggedIn ? (
                    <div className="flex items-center justify-between">
                        <p className="text-lg">{t('settings.account.welcome', authStatus.username || 'Senpai')}</p>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">{t('settings.account.logout')}</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <p className="mb-4 text-purple-700 dark:text-purple-300">{t('settings.account.login_prompt_google')}</p>
                        <button 
                            onClick={() => setAuthStatus({ isLoggedIn: true, username: 'Senpai' })} 
                            className="bg-gray-200 text-gray-800 font-semibold px-6 py-3 rounded-lg hover:bg-white transition-colors flex items-center gap-3 shadow-lg"
                        >
                            <GoogleIcon />
                            <span>{t('settings.account.login_with_google')}</span>
                        </button>
                    </div>
                )}
            </Section>

            <Section title={t('settings.experience.title')}>
                <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg mb-4">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" checked={enableRandomImages} onChange={() => setEnableRandomImages(!enableRandomImages)} className="sr-only" />
                            <div className="block bg-gray-400 dark:bg-gray-600 w-14 h-8 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enableRandomImages ? 'transform translate-x-6 !bg-pink-500' : ''}`}></div>
                        </div>
                        <div className="ml-3 font-medium">{t('settings.experience.enable_random_images_label')}</div>
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('settings.experience.enable_random_images_desc')}</p>
                </div>
                 <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" checked={enableAutoPlayback} onChange={() => setEnableAutoPlayback(!enableAutoPlayback)} className="sr-only" />
                            <div className="block bg-gray-400 dark:bg-gray-600 w-14 h-8 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enableAutoPlayback ? 'transform translate-x-6 !bg-pink-500' : ''}`}></div>
                        </div>
                        <div className="ml-3 font-medium">{t('settings.experience.enable_auto_playback_label')}</div>
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('settings.experience.enable_auto_playback_desc')}</p>
                </div>
            </Section>
            
            <Section title={t('settings.nsfw.title')}>
                <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg">
                    <label className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" checked={isNsfw} onChange={() => setIsNsfw(!isNsfw)} className="sr-only" />
                            <div className="block bg-gray-400 dark:bg-gray-600 w-14 h-8 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isNsfw ? 'transform translate-x-6 !bg-pink-500' : ''}`}></div>
                        </div>
                        <div className="ml-3 font-medium">{t('settings.nsfw.label')}</div>
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{t('settings.nsfw.warning')}</p>
                </div>
            </Section>

            <Section title={t('settings.data.title')}>
                 <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg flex flex-col items-center text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('settings.data.clear_all_history_desc')}</p>
                    <button onClick={handleClearHistory} className="bg-red-800 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">{t('settings.data.clear_all_history_button')}</button>
                </div>
            </Section>

        </div>
    );
};

export default Settings;