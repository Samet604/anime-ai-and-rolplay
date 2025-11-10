import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getChatResponse, getGroundedResponse } from '../services/geminiService';
import { SendIcon, LoadingIcon, SearchIcon, TrashIcon } from './Icons';
import { useLocalization } from '../localization';
import { useLocalStorage } from '../App';

interface RoleplayProps {
    theme: Record<string, string>;
}

type World = { name: string; instruction: string };
type Step = 'world_selection' | 'character_selection' | 'playing';
type WorldSelectionView = 'main' | 'creating' | 'searching';
type CharacterSelectionView = 'main' | 'creating' | 'searching';

const getPresetUniverses = (t: (key: string, ...args: any[]) => string) => ({
    fantasy: {
        name: t('roleplay.worlds.fantasy.name'),
        description: t('roleplay.worlds.fantasy.description'),
        instruction: t('roleplay.worlds.fantasy.instruction')
    },
    cyberpunk: {
        name: t('roleplay.worlds.cyberpunk.name'),
        description: t('roleplay.worlds.cyberpunk.description'),
        instruction: t('roleplay.worlds.cyberpunk.instruction')
    },
    romance: {
        name: t('roleplay.worlds.romance.name'),
        description: t('roleplay.worlds.romance.description'),
        instruction: t('roleplay.worlds.romance.instruction')
    }
});


const Roleplay: React.FC<RoleplayProps> = ({ theme }) => {
    const { t } = useLocalization();
    const [step, setStep] = useState<Step>('world_selection');
    
    // World states
    const [worldSelectionView, setWorldSelectionView] = useState<WorldSelectionView>('main');
    const [worldInfo, setWorldInfo] = useState<World | null>(null);
    const [tempWorldInfo, setTempWorldInfo] = useState<World | null>(null); // For saving before starting
    const [customWorldName, setCustomWorldName] = useState('');
    const [customWorldDescription, setCustomWorldDescription] = useState('');
    const [customWorldPrompt, setCustomWorldPrompt] = useState('');
    const [worldSearchQuery, setWorldSearchQuery] = useState('');
    const [isWorldLoading, setIsWorldLoading] = useState(false);
    const [savedWorlds, setSavedWorlds] = useLocalStorage<Record<string, World>>('saved-worlds', {});


    // Character states
    const [characterSelectionView, setCharacterSelectionView] = useState<CharacterSelectionView>('main');
    const [characterInfo, setCharacterInfo] = useState<{name: string, personality: string} | null>(null);
    const [customCharName, setCustomCharName] = useState('');
    const [customCharPersonality, setCustomCharPersonality] = useState('');
    const [charSearchQuery, setCharSearchQuery] = useState('');
    const [charSearchResults, setCharSearchResults] = useState<string | null>(null);
    const [isCharLoading, setIsCharLoading] = useState(false);
    
    // Playing states
    const [storyInstruction, setStoryInstruction] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const presetUniverses = getPresetUniverses(t);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // --- World Management ---
    const saveWorld = (world: World) => {
        if (!world || !world.name) return;
        if (Object.values(savedWorlds).some(sw => sw.name.toLowerCase() === world.name.toLowerCase())) {
            alert(t('roleplay.alerts.world_already_saved'));
            return;
        }
        const newId = `world_${Date.now()}`;
        setSavedWorlds(prev => ({ ...prev, [newId]: world }));
        alert(t('roleplay.alerts.world_saved_success', world.name));
        setTempWorldInfo(null); // Clear temp info after saving
        setWorldSelectionView('main'); // Go back to the main view to see the saved world
    };

    const deleteWorld = (worldId: string) => {
        if (window.confirm(t('roleplay.alerts.world_delete_confirm'))) {
            setSavedWorlds(prev => {
                const newWorlds = { ...prev };
                delete newWorlds[worldId];
                return newWorlds;
            });
        }
    };


    // --- World Selection Handlers ---
    const handleSelectWorld = (worldData: World) => {
        setWorldInfo(worldData);
        setStep('character_selection');
    };

    const handleCreateWorld = () => {
        if (!customWorldName || !customWorldDescription || !customWorldPrompt) {
            alert(t('roleplay.alerts.fill_world_fields'));
            return;
        }
        const instruction = t('roleplay.prompts.custom_world_instruction', customWorldName, customWorldDescription, customWorldPrompt);
        const newWorld = { name: customWorldName, instruction };
        setTempWorldInfo(newWorld); // Store it temporarily
    };

    const handleSearchWorld = async () => {
        if (!worldSearchQuery.trim()) return;
        setIsWorldLoading(true);
        setTempWorldInfo(null);
        try {
            const response = await getGroundedResponse(t('roleplay.prompts.search_world_prompt', worldSearchQuery), t('roleplay.prompts.search_world_system'));
            const instruction = t('roleplay.prompts.searched_world_instruction', response.text);
            setTempWorldInfo({ name: worldSearchQuery, instruction });
        } catch (error) {
            console.error(error);
            alert(t('roleplay.alerts.world_search_fail'));
        } finally {
            setIsWorldLoading(false);
        }
    };

    // --- Character Selection Handlers ---
    const handleCreateCharacter = () => {
        if (!customCharName || !customCharPersonality) {
            alert(t('roleplay.alerts.define_character'));
            return;
        }
        const charData = { name: customCharName, personality: customCharPersonality };
        setCharacterInfo(charData);
        startStory(charData);
    };

    const handleSearchCharacter = async () => {
        if (!charSearchQuery.trim()) return;
        setIsCharLoading(true);
        setCharSearchResults(null);
        try {
            const response = await getGroundedResponse(t('roleplay.prompts.search_char_prompt', charSearchQuery), t('roleplay.prompts.search_char_system'));
            setCharSearchResults(response.text);
        } catch (error) {
            console.error(error);
            setCharSearchResults(t('roleplay.alerts.char_search_fail'));
        } finally {
            setIsCharLoading(false);
        }
    };

    const handleSelectSearchedCharacter = () => {
        if (!charSearchResults) return;
        const charData = { name: charSearchQuery, personality: charSearchResults };
        setCharacterInfo(charData);
        startStory(charData);
    };

    // --- Story Start & Gameplay ---
    const startStory = (charData: {name: string, personality: string}) => {
        if (!worldInfo) return; 

        const finalInstruction = t('roleplay.prompts.final_story_instruction', worldInfo.instruction, charData.name, charData.personality, charData.name, charData.name);
        setStoryInstruction(finalInstruction);
        setStep('playing');
        setIsLoading(true);
        setMessages([]);

        const initialPrompt = t('roleplay.prompts.start_story_prompt');
        getChatResponse(initialPrompt, finalInstruction).then(response => {
            setMessages([{ id: '0', text: response.text, sender: 'ai' }]);
        }).catch(err => {
            console.error("Failed to start story:", err);
            setMessages([{ id: 'err0', text: t('roleplay.alerts.start_story_fail'), sender: 'ai' }]);
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !storyInstruction || !characterInfo) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        
        setMessages(prev => [...prev, { id: 'thinking', text: '', sender: 'ai', isThinking: true }]);

        const history = messages.map(m => `${m.sender === 'user' ? characterInfo.name : t('roleplay.story.storyteller')}: ${m.text}`).join('\n');
        const prompt = `${history}\n${characterInfo.name}: ${input}\n${t('roleplay.story.storyteller')}:`;
        
        try {
            const response = await getChatResponse(prompt, storyInstruction);
            const aiMessage: ChatMessage = { id: Date.now().toString() + 'ai', text: response.text, sender: 'ai' };
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), aiMessage]);
        } catch (error) {
            console.error('Roleplay API Error:', error);
            // FIX: Explicitly type the errorMessage object to match the ChatMessage interface.
            const errorMessage: ChatMessage = { id: Date.now().toString() + 'err', text: t('roleplay.alerts.story_falters'), sender: 'ai' };
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderWorldSelectionScreen = () => {
        switch(worldSelectionView) {
            case 'creating':
                return (
                    <div className="flex flex-col h-full">
                        <h2 className={`text-2xl font-bold ${theme.text} mb-4 text-center`}>{t('roleplay.world_creation.title')}</h2>
                        <div className="space-y-4 flex-grow">
                            <input type="text" placeholder={t('roleplay.world_creation.name_placeholder')} value={customWorldName} onChange={e => setCustomWorldName(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                            <input type="text" placeholder={t('roleplay.world_creation.desc_placeholder')} value={customWorldDescription} onChange={e => setCustomWorldDescription(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                            <textarea placeholder={t('roleplay.world_creation.prompt_placeholder')} value={customWorldPrompt} onChange={e => setCustomWorldPrompt(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600 h-40 resize-none"/>
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button onClick={handleCreateWorld} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('roleplay.buttons.preview_world')}</button>
                            <button onClick={() => setWorldSelectionView('main')} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('roleplay.buttons.go_back')}</button>
                        </div>
                         {tempWorldInfo && (
                            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                                <p className="text-purple-300 text-sm">{t('roleplay.world_creation.preview', tempWorldInfo.name)}</p>
                                <div className="flex gap-2 mt-2">
                                     <button onClick={() => saveWorld(tempWorldInfo)} className={`flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}>{t('roleplay.buttons.save_world')}</button>
                                     <button onClick={() => handleSelectWorld(tempWorldInfo)} className={`flex-1 bg-${theme.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${theme.accent}-600`}>{t('roleplay.buttons.next_create_char')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'searching':
                 return (
                     <div className="flex flex-col h-full">
                         <h2 className={`text-2xl font-bold ${theme.text} mb-4 text-center`}>{t('roleplay.world_search.title')}</h2>
                         <div className="flex items-center gap-2 mb-4">
                             <input type="text" placeholder={t('roleplay.world_search.placeholder')} value={worldSearchQuery} onChange={e => setWorldSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchWorld()} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                             <button onClick={handleSearchWorld} disabled={isWorldLoading} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full`}>
                                 {isWorldLoading ? <LoadingIcon /> : <SearchIcon />}
                             </button>
                         </div>
                         <div className="flex-grow bg-gray-900/50 p-3 rounded-lg overflow-y-auto min-h-[200px] text-center">
                             {isWorldLoading && <p className="text-purple-300 italic">{t('roleplay.world_search.loading')}</p>}
                         </div>
                         <div className="flex gap-4 mt-4">
                             <button onClick={() => setWorldSelectionView('main')} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('roleplay.buttons.go_back')}</button>
                         </div>
                         {tempWorldInfo && !isWorldLoading && (
                            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                                <p className="text-purple-300 text-sm">{t('roleplay.world_search.found', tempWorldInfo.name)}</p>
                                <div className="flex gap-2 mt-2">
                                     <button onClick={() => saveWorld(tempWorldInfo)} className={`flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}>{t('roleplay.buttons.save_world')}</button>
                                     <button onClick={() => handleSelectWorld(tempWorldInfo)} className={`flex-1 bg-${theme.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${theme.accent}-600`}>{t('roleplay.buttons.use_this_world')}</button>
                                </div>
                            </div>
                        )}
                     </div>
                );
            case 'main':
            default:
                 return (
                    <div className="flex flex-col h-full text-center">
                        <h2 className={`text-3xl font-bold ${theme.text}`}>{t('roleplay.world_selection.title')}</h2>
                        <div className="flex-grow overflow-y-auto mt-4 pr-2">
                            {/* Saved Worlds */}
                            {Object.keys(savedWorlds).length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-purple-300 mb-2">{t('roleplay.world_selection.our_worlds')}</h3>
                                    <div className="space-y-2">
                                        {Object.entries(savedWorlds).map(([id, world]) => (
                                            <div key={id} className="p-3 rounded-lg bg-gray-900/50 border ${theme.border} flex items-center justify-between">
                                                <span className="font-semibold text-white">{world.name}</span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSelectWorld(world)} className={`px-3 py-1 text-sm bg-${theme.accent}-500 hover:bg-${theme.accent}-600 rounded`}>{t('roleplay.buttons.start')}</button>
                                                    <button onClick={() => deleteWorld(id)} className="p-2 bg-red-600 hover:bg-red-700 rounded"><TrashIcon/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preset Worlds */}
                             <div className="mb-6">
                                <h3 className="text-xl font-semibold text-purple-300 mb-2">{t('roleplay.world_selection.preset_worlds')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {Object.entries(presetUniverses).map(([key, uni]) => (
                                        <button key={key} onClick={() => handleSelectWorld(uni)} className={`p-4 rounded-lg bg-gray-900/50 border-2 ${theme.border} hover:border-${theme.accent}-500 hover:bg-${theme.accent}-500/10 transform hover:-translate-y-1`}>
                                            <h3 className={`text-lg font-semibold ${theme.text}`}>{uni.name}</h3>
                                            <p className="text-sm text-purple-300 mt-1">{uni.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Create/Find */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <button onClick={() => setWorldSelectionView('creating')} className={`p-4 rounded-lg bg-gray-800/70 border-2 ${theme.border} hover:border-${theme.accent}-500 hover:bg-${theme.accent}-500/10 transform hover:-translate-y-1`}>
                                    <h3 className={`text-lg font-semibold ${theme.text}`}>{t('roleplay.world_selection.create_own')}</h3>
                                </button>
                                 <button onClick={() => setWorldSelectionView('searching')} className={`p-4 rounded-lg bg-gray-800/70 border-2 ${theme.border} hover:border-${theme.accent}-500 hover:bg-${theme.accent}-500/10 transform hover:-translate-y-1`}>
                                    <h3 className={`text-lg font-semibold ${theme.text}`}>{t('roleplay.world_selection.find_online')}</h3>
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    const renderCharacterSelectionScreen = () => {
         switch(characterSelectionView) {
            case 'creating':
                 return (
                    <div className="flex flex-col h-full">
                        <h2 className={`text-2xl font-bold ${theme.text} mb-4 text-center`}>{t('roleplay.char_creation.title')}</h2>
                        <p className="text-center text-purple-300 mb-4">{t('roleplay.char_creation.subtitle', worldInfo?.name || '')}</p>
                        <div className="space-y-4 flex-grow">
                            <input type="text" placeholder={t('roleplay.char_creation.name_placeholder')} value={customCharName} onChange={e => setCustomCharName(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                            <textarea placeholder={t('roleplay.char_creation.personality_placeholder')} value={customCharPersonality} onChange={e => setCustomCharPersonality(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600 h-40 resize-none"/>
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button onClick={handleCreateCharacter} className={`w-full bg-${theme.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${theme.accent}-600`}>{t('roleplay.buttons.start_story')}</button>
                            <button onClick={() => setCharacterSelectionView('main')} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('roleplay.buttons.go_back')}</button>
                        </div>
                    </div>
                );
            case 'searching':
                 return (
                     <div className="flex flex-col h-full">
                         <h2 className={`text-2xl font-bold ${theme.text} mb-4 text-center`}>{t('roleplay.char_search.title')}</h2>
                         <div className="flex items-center gap-2 mb-4">
                             <input type="text" placeholder={t('roleplay.char_search.placeholder')} value={charSearchQuery} onChange={e => setCharSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchCharacter()} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                             <button onClick={handleSearchCharacter} disabled={isCharLoading} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full`}>
                                 {isCharLoading ? <LoadingIcon /> : <SearchIcon />}
                             </button>
                         </div>
                         <div className="flex-grow bg-gray-900/50 p-3 rounded-lg overflow-y-auto min-h-[200px]">
                            {isCharLoading && <p>{t('roleplay.char_search.loading')}</p>}
                            {charSearchResults && <p className="whitespace-pre-wrap text-sm">{charSearchResults}</p>}
                         </div>
                          <div className="flex gap-4 mt-4">
                             <button onClick={handleSelectSearchedCharacter} disabled={!charSearchResults || isCharLoading} className={`w-full bg-${theme.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${theme.accent}-600 disabled:bg-gray-700`}>{t('roleplay.buttons.be_this_char')}</button>
                             <button onClick={() => setCharacterSelectionView('main')} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('roleplay.buttons.go_back')}</button>
                         </div>
                     </div>
                );
            case 'main':
            default:
                 return (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <h2 className={`text-3xl font-bold ${theme.text}`}>{t('roleplay.char_selection.title')}</h2>
                        <p className="text-purple-300 mt-2">{t('roleplay.char_selection.subtitle', worldInfo?.name || '')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full">
                            <button onClick={() => setCharacterSelectionView('creating')} className={`p-6 rounded-lg bg-gray-900/50 border-2 ${theme.border} hover:border-${theme.accent}-500 hover:bg-${theme.accent}-500/10 transform hover:-translate-y-1`}>
                                <h3 className={`text-lg font-semibold ${theme.text}`}>{t('roleplay.char_selection.create_custom')}</h3>
                                <p className="text-sm text-purple-300 mt-1">{t('roleplay.char_selection.create_custom_desc')}</p>
                            </button>
                            <button onClick={() => setCharacterSelectionView('searching')} className={`p-6 rounded-lg bg-gray-900/50 border-2 ${theme.border} hover:border-${theme.accent}-500 hover:bg-${theme.accent}-500/10 transform hover:-translate-y-1`}>
                                <h3 className={`text-lg font-semibold ${theme.text}`}>{t('roleplay.char_selection.search_char')}</h3>
                                <p className="text-sm text-purple-300 mt-1">{t('roleplay.char_selection.search_char_desc')}</p>
                            </button>
                        </div>
                        <button onClick={() => setStep('world_selection')} className="mt-8 text-sm text-gray-400 hover:text-white">{t('roleplay.buttons.choose_different_world')}</button>
                    </div>
                );
        }
    }

    const renderPlayingScreen = () => (
        <div className="flex flex-col h-[65vh]">
            <div className="pb-2 mb-2 border-b-2 border-gray-700/50 text-center">
                <p className="font-bold text-lg text-purple-200">{worldInfo?.name}</p>
                <p className="text-sm text-gray-400">{t('roleplay.story.playing_as')}<span className={`${theme.text}`}>{characterInfo?.name}</span></p>
            </div>
            <div className="flex-grow overflow-y-auto pr-4 space-y-4" style={{fontFamily: "'Georgia', serif"}}>
                {isLoading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <LoadingIcon/>
                        <p className="mt-2 text-purple-300 italic">{t('roleplay.story.loading')}</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id}>
                        {msg.sender === 'user' ? (
                             <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-500/30 shadow-inner">
                                <p className={`font-bold ${theme.text}`}>{characterInfo?.name}:</p>
                                <p className="text-purple-200 italic whitespace-pre-wrap">"{msg.text}"</p>
                             </div>
                        ) : msg.isThinking ? (
                            <div className="flex items-center justify-center space-x-1 p-4">
                                <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></span>
                            </div>
                        ) : (
                            <div>
                               <p className={`font-bold text-gray-400 mb-1`}>{t('roleplay.story.storyteller')}:</p>
                               <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">{msg.text}</p>
                            </div>
                        )}
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
             <div className={`mt-4 pt-4 border-t ${theme.border}`}>
                <div className="flex items-center bg-gray-900 rounded-lg p-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder={t('roleplay.story.input_placeholder')}
                        className="flex-grow bg-transparent focus:outline-none p-2"
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full`}>
                        {isLoading ? <LoadingIcon /> : <SendIcon />}
                    </button>
                </div>
            </div>
        </div>
    );
    
    switch (step) {
        case 'world_selection': return renderWorldSelectionScreen();
        case 'character_selection': return renderCharacterSelectionScreen();
        case 'playing': return renderPlayingScreen();
        default: return renderWorldSelectionScreen();
    }
};

export default Roleplay;