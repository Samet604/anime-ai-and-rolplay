import React, { useState } from 'react';
import { Companion, Theme } from '../types';
import { useLocalization } from '../localization';
import { generateImage, generateCompanionInstruction } from '../services/geminiService';
import { LoadingIcon, SearchIcon, TrashIcon, UserCircleIcon } from './Icons';

interface CompanionCreatorProps {
    customBots: Companion[];
    setCustomBots: (bots: Companion[] | ((bots: Companion[]) => Companion[])) => void;
    activeBotId: string | null;
    setActiveBotId: (id: string | null) => void;
    themeConfig: Record<string, string>;
    isNsfw: boolean;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    defaultAvatars: Record<Theme, string>;
    setDefaultAvatars: (value: React.SetStateAction<Record<Theme, string>>) => void;
}

const allThemes: Theme[] = ['yandere', 'kuudere', 'deredere', 'tsundere', 'dandere', 'himedere', 'sadodere', 'mayadere', 'undere', 'bakadere', 'kamidere', 'shundere'];

// --- Sub-components ---
const CompanionForm: React.FC<{
    botToEdit: Companion | null;
    onSave: (bot: Companion) => void;
    onCancel: () => void;
    themeConfig: Record<string, string>;
    isNsfw: boolean;
}> = ({ botToEdit, onSave, onCancel, themeConfig, isNsfw }) => {
    const { t } = useLocalization();
    const [botName, setBotName] = useState(botToEdit?.name || '');
    const [subtitle, setSubtitle] = useState(botToEdit?.subtitle || '');
    const [systemInstruction, setSystemInstruction] = useState(botToEdit?.systemInstruction || '');
    
    const [avatarSource, setAvatarSource] = useState<'url' | 'ai'>(botToEdit?.avatarUrl && !botToEdit.avatarUrl.startsWith('data:') ? 'url' : 'ai');
    const [avatarUrl, setAvatarUrl] = useState(botToEdit?.avatarUrl || '');
    const [avatarPrompt, setAvatarPrompt] = useState(botToEdit?.avatarPrompt || '');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFinding, setIsFinding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSave = () => {
        if (botName && avatarUrl && systemInstruction && subtitle && avatarPrompt) {
            const botData: Companion = {
                id: botToEdit?.id || `bot-${Date.now()}`,
                name: botName,
                avatarUrl,
                systemInstruction,
                subtitle,
                avatarPrompt
            };
            onSave(botData);
        } else {
            alert(t('companion.save_fail'));
        }
    };
    
    const handleGenerateAvatar = async () => {
        if (!avatarPrompt) return;
        setIsGenerating(true);
        try {
            const generatedUrl = await generateImage(avatarPrompt, isNsfw);
            setAvatarUrl(generatedUrl);
        } catch (error) {
            console.error("Avatar generation failed:", error);
            alert(t('companion.avatar_generate_fail'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFindPersonality = async () => {
        if (!searchQuery) return;
        setIsFinding(true);
        try {
            const instruction = await generateCompanionInstruction(searchQuery, isNsfw, t);
            setSystemInstruction(instruction);
        } catch (error) {
            console.error("Find personality failed:", error);
            alert(t('companion.find_online_fail'));
        } finally {
            setIsFinding(false);
        }
    };
    
    return (
        <div className="bg-gray-200/50 dark:bg-gray-900/80 p-6 rounded-lg border border-purple-300 dark:border-purple-500/50">
            <h3 className={`text-xl font-bold text-${themeConfig.accent}-700 dark:${themeConfig.text} mb-4`}>{botToEdit ? t('companion.edit_button') : t('companion.create_new_button')}</h3>
            <div className="space-y-4">
                <input type="text" placeholder={t('companion.name_placeholder')} value={botName} onChange={e => setBotName(e.target.value)} className="w-full bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-400 dark:border-gray-600"/>
                <input type="text" placeholder={t('companion.subtitle_placeholder')} value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-400 dark:border-gray-600"/>
                
                {/* Avatar Section */}
                <div className="p-3 bg-gray-300 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex mb-3 border-b border-gray-400 dark:border-gray-600">
                        <button onClick={() => setAvatarSource('url')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${avatarSource === 'url' ? `bg-${themeConfig.accent}-500 text-white` : 'text-gray-600 dark:text-gray-300'}`}>{t('companion.avatar_source_url')}</button>
                        <button onClick={() => setAvatarSource('ai')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${avatarSource === 'ai' ? `bg-${themeConfig.accent}-500 text-white` : 'text-gray-600 dark:text-gray-300'}`}>{t('companion.avatar_source_ai')}</button>
                    </div>
                     {avatarUrl && <img src={avatarUrl} alt="Preview" className="w-20 h-20 rounded-full object-cover mx-auto mb-3"/>}
                    {avatarSource === 'url' ? (
                        <input type="text" placeholder={t('companion.avatar_url_placeholder')} value={avatarUrl.startsWith('data:') ? '' : avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="w-full bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-400 dark:border-gray-600"/>
                    ) : (
                         <div className="flex gap-2">
                            <input type="text" placeholder={t('companion.avatar_prompt_placeholder')} value={avatarPrompt} onChange={e => setAvatarPrompt(e.target.value)} className="w-full bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-400 dark:border-gray-600"/>
                            <button onClick={handleGenerateAvatar} disabled={isGenerating} className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 flex items-center justify-center w-32`}>
                                {isGenerating ? <LoadingIcon/> : t('companion.generate_button')}
                            </button>
                        </div>
                    )}
                </div>

                <textarea placeholder={t('companion.personality_placeholder')} value={systemInstruction} onChange={e => setSystemInstruction(e.target.value)} className="w-full bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-400 dark:border-gray-600 h-32 resize-none"/>
                 <div className="flex items-center gap-2">
                    <input type="text" placeholder={t('companion.find_online_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleFindPersonality()} className="w-full bg-white dark:bg-gray-800 p-2 rounded-md border border-gray-400 dark:border-gray-600"/>
                    <button onClick={handleFindPersonality} disabled={isFinding} className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 flex items-center justify-center w-40`}>
                        {isFinding ? <LoadingIcon/> : <><SearchIcon className="mr-2"/>{t('companion.find_online_button')}</>}
                    </button>
                </div>
            </div>
            <div className="flex gap-4 mt-6">
                <button onClick={handleSave} className={`bg-${themeConfig.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${themeConfig.accent}-600`}>{t('companion.save_button')}</button>
                <button onClick={onCancel} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('companion.cancel_button')}</button>
            </div>
        </div>
    );
};


// --- Main Component ---
const CompanionCreator: React.FC<CompanionCreatorProps> = ({
    customBots,
    setCustomBots,
    activeBotId,
    setActiveBotId,
    themeConfig,
    isNsfw,
    theme,
    setTheme,
    defaultAvatars,
    setDefaultAvatars
}) => {
    const { t } = useLocalization();
    const [isCreating, setIsCreating] = useState(false);
    const [botToEdit, setBotToEdit] = useState<Companion | null>(null);
    const [generatingAvatars, setGeneratingAvatars] = useState<Partial<Record<Theme, boolean>>>({});
    
    // This local state prevents the page from jumping on every keystroke in input fields.
    const [localDefaultAvatars, setLocalDefaultAvatars] = useState(defaultAvatars);
    
    // Sync local state if the prop changes from localStorage hydration.
    React.useEffect(() => {
        setLocalDefaultAvatars(defaultAvatars);
    }, [defaultAvatars]);


    const handleSave = (bot: Companion) => {
        if (botToEdit) {
            setCustomBots(prev => prev.map(b => b.id === bot.id ? bot : b));
        } else {
            setCustomBots(prev => [...prev, bot]);
        }
        setIsCreating(false);
        setBotToEdit(null);
    };
    
    const handleDelete = (botId: string) => {
        if (window.confirm(t('companion.delete_confirm'))) {
            if (activeBotId === botId) {
                setActiveBotId(null);
            }
            setCustomBots(prev => prev.filter(b => b.id !== botId));
        }
    };
    
    const handleEdit = (bot: Companion) => {
        setBotToEdit(bot);
        setIsCreating(true);
    };

    const handleActivate = (botId: string) => {
        setActiveBotId(botId);
    };

    const handleDeactivate = () => {
        setActiveBotId(null);
    };

    const handleGenerateDefaultAvatar = async (persona: Theme) => {
        setGeneratingAvatars(prev => ({ ...prev, [persona]: true }));
        try {
            const prompt = t(`companion.default_avatar_prompts.${persona}`);
            const url = await generateImage(prompt, isNsfw);
            setLocalDefaultAvatars(prev => ({ ...prev, [persona]: url }));
        } catch (error) {
            console.error(error);
            alert(t('companion.avatar_generate_fail'));
        } finally {
            setGeneratingAvatars(prev => ({ ...prev, [persona]: false }));
        }
    };

    const handleSaveDefaultAvatars = () => {
        setDefaultAvatars(localDefaultAvatars);
        alert(t('companion.save_default_avatars_success'));
    };

    const Section: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => (
        <div className="mb-8">
            <h2 className={`text-2xl font-bold text-${themeConfig.accent}-700 dark:${themeConfig.text} mb-4 border-b-2 dark:${themeConfig.border} border-gray-200 pb-2`}>{title}</h2>
            {children}
        </div>
    );
    
    return (
        <div className="text-gray-800 dark:text-white p-4 h-[65vh] overflow-y-auto">
            <Section title={t('companion.my_companions')}>
                {isCreating ? (
                    <CompanionForm 
                        botToEdit={botToEdit}
                        onSave={handleSave}
                        onCancel={() => { setIsCreating(false); setBotToEdit(null); }}
                        themeConfig={themeConfig}
                        isNsfw={isNsfw}
                    />
                ) : (
                    <>
                        <div className="space-y-3 mb-4">
                            {customBots.length === 0 ? (
                                <p className="text-center text-gray-500 italic py-4">{t('companion.no_companions')}</p>
                            ) : (
                                customBots.map(bot => (
                                    <div key={bot.id} className={`p-3 bg-gray-100 dark:bg-gray-800/70 rounded-lg border flex items-center justify-between ${activeBotId === bot.id ? `border-${themeConfig.accent}-500` : 'border-gray-300 dark:border-gray-700'}`}>
                                        <div className="flex items-center gap-4">
                                            <img src={bot.avatarUrl} alt={bot.name} className="w-12 h-12 rounded-full object-cover"/>
                                            <div>
                                                <h4 className="font-bold">{bot.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{bot.subtitle}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activeBotId === bot.id ? (
                                                <button onClick={handleDeactivate} className="text-xs bg-gray-600 text-white px-3 py-1 rounded-full">{t('companion.deactivate_button')}</button>
                                            ) : (
                                                <button onClick={() => handleActivate(bot.id)} className={`text-xs bg-${themeConfig.accent}-600 text-white px-3 py-1 rounded-full`}>{t('companion.activate_button')}</button>
                                            )}
                                            <button onClick={() => handleEdit(bot)} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full">{t('companion.edit_button')}</button>
                                            <button onClick={() => handleDelete(bot.id)} className="p-2 bg-red-800 hover:bg-red-700 rounded-full"><TrashIcon/></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setIsCreating(true)} className={`w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}>
                            {t('companion.create_new_button')}
                        </button>
                    </>
                )}
            </Section>

            <Section title={t('companion.default_personality_title')}>
                <p className="mb-3 text-gray-600 dark:text-gray-300">{t('companion.default_personality_prompt')}</p>
                <div className="flex flex-wrap gap-4">
                    {allThemes.map(t_theme => (
                        <button
                            key={t_theme}
                            onClick={() => setTheme(t_theme)}
                            className={`px-4 py-2 rounded-lg capitalize transition-all border-2 ${theme === t_theme ? `border-${themeConfig.accent}-500 bg-${themeConfig.accent}-500/20 text-${themeConfig.accent}-600 dark:text-white` : 'border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {t_theme}
                        </button>
                    ))}
                </div>
            </Section>

            <Section title={t('companion.default_avatar_title')}>
                 <div className="bg-gray-200 dark:bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('companion.default_avatar_prompt')}</p>
                    <div className="space-y-3">
                        {allThemes.map(persona => (
                             <div key={persona} className="flex items-center gap-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                    {localDefaultAvatars[persona] ? (
                                        <img src={localDefaultAvatars[persona]} alt={persona} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <label className="capitalize font-semibold text-lg text-purple-700 dark:text-purple-300">{persona}</label>
                                </div>
                                <button 
                                    onClick={() => handleGenerateDefaultAvatar(persona)} 
                                    disabled={generatingAvatars[persona]} 
                                    className={`bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 flex items-center justify-center w-36 text-sm`}
                                >
                                    {generatingAvatars[persona] ? <LoadingIcon/> : t('companion.generate_button')}
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSaveDefaultAvatars} className={`bg-${themeConfig.accent}-500 text-white px-6 py-2 rounded-lg hover:bg-${themeConfig.accent}-600`}>
                            {t('companion.save_default_avatars_button')}
                        </button>
                    </div>
                 </div>
            </Section>
        </div>
    );
};

export default CompanionCreator;