import React, { useState } from 'react';
import { Theme, CustomBot, AuthStatus } from '../types';
import { useLocalization } from '../localization';
import { generateAvatar } from '../services/geminiService';
import { LoadingIcon, UserCircleIcon } from './Icons';
import { useLocalStorage } from '../App';

interface SettingsProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    customBot: CustomBot | null;
    setCustomBot: (bot: CustomBot | null) => void;
    authStatus: AuthStatus;
    setAuthStatus: (status: AuthStatus) => void;
    themeConfig: Record<string, string>;
    defaultAvatars: Record<Theme, string>;
    setDefaultAvatars: (value: React.SetStateAction<Record<Theme, string>>) => void;
}

const allThemes: Theme[] = ['yandere', 'kuudere', 'deredere', 'tsundere', 'dandere', 'himedere', 'sadodere', 'mayadere', 'undere'];

const DefaultAvatarManager: React.FC<{
    themeConfig: Record<string, string>;
    defaultAvatars: Record<Theme, string>;
    setDefaultAvatars: (value: React.SetStateAction<Record<Theme, string>>) => void;
}> = ({ themeConfig, defaultAvatars, setDefaultAvatars }) => {
    const { t } = useLocalization();
    const initialPrompts = allThemes.reduce((acc, th) => ({ ...acc, [th]: '' }), {} as Record<Theme, string>);
    const initialGenerating = allThemes.reduce((acc, th) => ({ ...acc, [th]: false }), {} as Record<Theme, boolean>);

    const [prompts, setPrompts] = useState<Record<Theme, string>>(() => {
        try {
            const item = window.localStorage.getItem('default-avatar-prompts');
            const parsed = item ? JSON.parse(item) : {};
            return { ...initialPrompts, ...parsed };
        } catch (error) {
            console.error(error);
            return initialPrompts;
        }
    });

    const [isGenerating, setIsGenerating] = useState<Record<Theme, boolean>>(initialGenerating);

    const handleGenerate = async (persona: Theme) => {
        const prompt = prompts[persona];
        if (!prompt) return;
        
        setIsGenerating(prev => ({...prev, [persona]: true}));
        try {
            const fullPrompt = `${prompt}, ${t(`settings.companion.default_avatar_prompts.${persona}`)}`;
            const generatedUrl = await generateAvatar(fullPrompt);
            setDefaultAvatars(prev => ({...prev, [persona]: generatedUrl}));
            alert(t('settings.companion.default_avatar_generate_success', persona));
        } catch (error) {
            console.error(`Default avatar generation for ${persona} failed:`, error);
            alert(t('settings.companion.avatar_generate_fail'));
        } finally {
            setIsGenerating(prev => ({...prev, [persona]: false}));
        }
    };

    const handleSavePrompts = () => {
        try {
            window.localStorage.setItem('default-avatar-prompts', JSON.stringify(prompts));
            alert(t('settings.companion.default_prompts_save_success'));
        } catch (error) {
            console.error(error);
            alert(t('settings.companion.default_prompts_save_fail'));
        }
    };
    
    return (
        <>
            <p className="mb-4">{t('settings.companion.default_avatar_prompt')}</p>
            <div className="space-y-4">
                {allThemes.map((persona) => (
                     <div key={persona} className="p-3 bg-gray-800/50 rounded-md border border-gray-700">
                         <div className="flex items-center justify-between mb-3">
                             <h3 className="font-semibold text-lg capitalize">{persona}</h3>
                             <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center border-2 border-purple-500">
                                 {defaultAvatars[persona] ? <img src={defaultAvatars[persona]} alt={`${persona} Preview`} className="w-full h-full rounded-full object-cover"/> : <UserCircleIcon/>}
                             </div>
                         </div>
                         <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder={t('settings.companion.avatar_generate_placeholder')} 
                                value={prompts[persona]} 
                                onChange={e => setPrompts(prev => ({...prev, [persona]: e.target.value}))} 
                                className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                            <button onClick={() => handleGenerate(persona)} disabled={isGenerating[persona]} className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 flex items-center justify-center w-40`}>
                                {isGenerating[persona] ? <LoadingIcon/> : t('settings.companion.generate_for', persona)}
                            </button>
                        </div>
                     </div>
                ))}
            </div>
            <div className="flex justify-end mt-4">
                <button onClick={handleSavePrompts} className={`bg-${themeConfig.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${themeConfig.accent}-600 transition-colors`}>
                    {t('settings.companion.save_prompts_button')}
                </button>
            </div>
        </>
    );
};

// FIX: Define the missing AvatarSource type
type AvatarSource = 'url' | 'generate';

const Settings: React.FC<SettingsProps> = ({
    theme,
    setTheme,
    customBot,
    setCustomBot,
    authStatus,
    setAuthStatus,
    themeConfig,
    defaultAvatars,
    setDefaultAvatars
}) => {
    const { t, setLanguage, language } = useLocalization();
    const [botName, setBotName] = useState(customBot?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(customBot?.avatarUrl || '');
    const [systemInstruction, setSystemInstruction] = useState(customBot?.systemInstruction || '');
    const [subtitle, setSubtitle] = useState(customBot?.subtitle || '');
    const [usernameInput, setUsernameInput] = useState('');
    
    const [avatarSource, setAvatarSource] = useState<AvatarSource>('url');
    const [avatarPrompt, setAvatarPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSaveBot = () => {
        if (botName && avatarUrl && systemInstruction && subtitle) {
            setCustomBot({ name: botName, avatarUrl, systemInstruction, subtitle });
            alert(t('settings.companion.save_success'));
        } else {
            alert(t('settings.companion.save_fail'));
        }
    };

    const handleUseDefault = () => {
        setCustomBot(null);
        setBotName('');
        setAvatarUrl('');
        setSystemInstruction('');
        setSubtitle('');
        alert(t('settings.companion.default_success'));
    };
    
    const handleGenerateAvatar = async () => {
        if (!avatarPrompt) return;
        setIsGenerating(true);
        try {
            const generatedUrl = await generateAvatar(avatarPrompt);
            setAvatarUrl(generatedUrl);
        } catch (error) {
            console.error("Avatar generation failed:", error);
            alert(t('settings.companion.avatar_generate_fail'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLogin = () => {
        if (usernameInput.trim()) {
            setAuthStatus({ isLoggedIn: true, username: usernameInput.trim() });
            setUsernameInput('');
        }
    };

    const handleLogout = () => {
        if (window.confirm(t('settings.account.logout_confirm'))) {
            setAuthStatus({ isLoggedIn: false });
        }
    };

    const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <div className="mb-8">
            <h2 className={`text-2xl font-bold ${themeConfig.text} mb-4 border-b-2 ${themeConfig.border} pb-2`}>{title}</h2>
            {children}
        </div>
    );
    
    return (
        <div className="text-white p-4 h-[65vh] overflow-y-auto">
             <Section title={t('settings.language.title')}>
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as 'en' | 'tr')}
                    className={`bg-gray-800 border border-gray-600 rounded text-base p-2 focus:ring-${themeConfig.accent}-500 focus:border-${themeConfig.accent}-500`}
                >
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                </select>
            </Section>

            <Section title={t('settings.account.title')}>
                {authStatus.isLoggedIn ? (
                    <div className="flex items-center justify-between">
                        <p className="text-lg">{t('settings.account.welcome', authStatus.username || 'Senpai')}</p>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">{t('settings.account.logout')}</button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder={t('settings.account.login_prompt')}
                            className="flex-grow bg-gray-800 p-2 rounded-md border border-gray-600 focus:ring-pink-500 focus:border-pink-500"
                        />
                        <button onClick={handleLogin} className={`bg-${themeConfig.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${themeConfig.accent}-600 transition-colors`}>{t('settings.account.login')}</button>
                    </div>
                )}
            </Section>

            <Section title={t('settings.theme.title')}>
                <p className="mb-3">{t('settings.theme.prompt')}</p>
                <div className="flex flex-wrap gap-4">
                    {allThemes.map(t => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`px-4 py-2 rounded-lg capitalize transition-all border-2 ${theme === t ? `border-${themeConfig.accent}-500 bg-${themeConfig.accent}-500/20` : 'border-gray-600 hover:bg-gray-700'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </Section>
            
            <Section title={t('settings.companion.default_avatar_title')}>
                <DefaultAvatarManager 
                    themeConfig={themeConfig} 
                    defaultAvatars={defaultAvatars} 
                    setDefaultAvatars={setDefaultAvatars} 
                />
            </Section>

            <Section title={t('settings.companion.title')}>
                 <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="mb-4">{t('settings.companion.prompt')}</p>
                    <div className="space-y-4">
                        <input type="text" placeholder={t('settings.companion.name_placeholder')} value={botName} onChange={e => setBotName(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600 focus:ring-pink-500 focus:border-pink-500"/>
                        <input type="text" placeholder={t('settings.companion.subtitle_placeholder')} value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600 focus:ring-pink-500 focus:border-pink-500"/>

                        {/* Avatar Section */}
                        <div className="p-3 bg-gray-800/50 rounded-md border border-gray-700">
                             <div className="flex items-center justify-between mb-3">
                                 <h3 className="font-semibold text-lg">{t('settings.companion.avatar_title')}</h3>
                                 {avatarUrl && <img src={avatarUrl} alt="Avatar Preview" className="w-16 h-16 rounded-full object-cover border-2 border-pink-500"/>}
                             </div>
                             <div className="flex gap-2 mb-3">
                                 <button onClick={() => setAvatarSource('url')} className={`px-3 py-1 text-sm rounded-full ${avatarSource === 'url' ? `bg-${themeConfig.accent}-500 text-white` : 'bg-gray-600'}`}>{t('settings.companion.avatar_source_url')}</button>
                                 <button onClick={() => setAvatarSource('generate')} className={`px-3 py-1 text-sm rounded-full ${avatarSource === 'generate' ? `bg-${themeConfig.accent}-500 text-white` : 'bg-gray-600'}`}>{t('settings.companion.avatar_source_ai')}</button>
                             </div>
                             {avatarSource === 'url' ? (
                                <input type="text" placeholder={t('settings.companion.avatar_url_placeholder')} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                             ) : (
                                <div className="flex gap-2">
                                    <input type="text" placeholder={t('settings.companion.avatar_generate_placeholder')} value={avatarPrompt} onChange={e => setAvatarPrompt(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                                    <button onClick={handleGenerateAvatar} disabled={isGenerating} className={`bg-${themeConfig.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${themeConfig.accent}-600 disabled:bg-gray-500 flex items-center justify-center w-32`}>
                                        {isGenerating ? <LoadingIcon/> : t('settings.companion.generate_button')}
                                    </button>
                                </div>
                             )}
                        </div>
                        
                        <textarea placeholder={t('settings.companion.personality_placeholder')} value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600 h-32 resize-none focus:ring-pink-500 focus:border-pink-500"/>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <button onClick={handleSaveBot} className={`bg-${themeConfig.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${themeConfig.accent}-600 transition-colors`}>{t('settings.companion.save_button')}</button>
                        <button onClick={handleUseDefault} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">{t('settings.companion.default_button')}</button>
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default Settings;