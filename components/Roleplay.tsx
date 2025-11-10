import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getChatResponse, getGroundedResponse } from '../services/geminiService';
import { SendIcon, LoadingIcon, SearchIcon, TrashIcon, BookIcon } from './Icons';
import { useLocalization } from '../localization';
import { useLocalStorage } from '../App';

interface RoleplayProps {
    theme: Record<string, string>;
    isNsfw: boolean;
}

type World = { name: string; instruction: string };
type Character = { name: string; personality: string };
type Story = {
    id: string;
    world: World;
    character: Character;
};

type Step = 'library' | 'world_selection' | 'character_selection' | 'playing';
type WorldSelectionView = 'main' | 'creating' | 'searching';

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


const Roleplay: React.FC<RoleplayProps> = ({ theme, isNsfw }) => {
    const { t } = useLocalization();
    const [step, setStep] = useState<Step>('library');
    
    // Story & Library states
    const [savedStories, setSavedStories] = useLocalStorage<Story[]>('roleplay-stories', []);
    const [activeStory, setActiveStory] = useState<Story | null>(null);

    // World creation states
    const [worldSelectionView, setWorldSelectionView] = useState<WorldSelectionView>('main');
    const [tempWorld, setTempWorld] = useState<World | null>(null);
    const [customWorldName, setCustomWorldName] = useState('');
    const [customWorldDescription, setCustomWorldDescription] = useState('');
    const [customWorldPrompt, setCustomWorldPrompt] = useState('');
    const [worldSearchQuery, setWorldSearchQuery] = useState('');
    const [isWorldLoading, setIsWorldLoading] = useState(false);

    // Character creation states
    const [tempCharacter, setTempCharacter] = useState<Character | null>(null);
    const [customCharName, setCustomCharName] = useState('');
    const [customCharPersonality, setCustomCharPersonality] = useState('');
    
    // Playing states
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const presetUniverses = getPresetUniverses(t);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (step === 'playing' && activeStory && messages.length > 0) {
            localStorage.setItem(`roleplay-history-${activeStory.id}`, JSON.stringify(messages));
        }
    }, [messages, step, activeStory]);

    const startNewAdventure = () => {
        setActiveStory(null);
        setTempWorld(null);
        setTempCharacter(null);
        setMessages([]);
        setStep('world_selection');
    };

    const continueStory = (story: Story) => {
        const history = localStorage.getItem(`roleplay-history-${story.id}`);
        setMessages(history ? JSON.parse(history) : []);
        setActiveStory(story);
        setStep('playing');
        if (!history) {
             startStory(story, true); // Start from beginning if no history found
        }
    };
    
    const deleteStory = (storyId: string) => {
        if (window.confirm(t('roleplay.alerts.story_delete_confirm'))) {
            setSavedStories(prev => prev.filter(s => s.id !== storyId));
            localStorage.removeItem(`roleplay-history-${storyId}`);
        }
    };

    const handleSelectWorld = (worldData: World) => {
        setTempWorld(worldData);
        setStep('character_selection');
    };

    const handleSearchWorld = async () => {
        if (!worldSearchQuery.trim()) return;
        setIsWorldLoading(true);
        setTempWorld(null);
        try {
            const response = await getGroundedResponse(t('roleplay.prompts.search_world_prompt', worldSearchQuery), t('roleplay.prompts.search_world_system'), isNsfw, t);
            const instruction = t('roleplay.prompts.searched_world_instruction', response.text);
            setTempWorld({ name: worldSearchQuery, instruction });
        } catch (error) {
            console.error(error);
            alert(t('roleplay.alerts.world_search_fail'));
        } finally {
            setIsWorldLoading(false);
        }
    };

    const handleCreateCharacter = () => {
        if (!customCharName || !customCharPersonality) {
            alert(t('roleplay.alerts.define_character'));
            return;
        }
        if (!tempWorld) return;

        const newStory: Story = {
            id: `story-${Date.now()}`,
            world: tempWorld,
            character: { name: customCharName, personality: customCharPersonality }
        };
        
        setSavedStories(prev => [...prev, newStory]);
        setActiveStory(newStory);
        startStory(newStory, true);
    };

    const startStory = (story: Story, forceReset = false) => {
        setStep('playing');
        
        const historyKey = `roleplay-history-${story.id}`;
        const storedHistory = localStorage.getItem(historyKey);

        if (storedHistory && !forceReset) {
            setMessages(JSON.parse(storedHistory));
            return;
        }

        setIsLoading(true);
        setMessages([]);

        const finalInstruction = getFinalInstruction(story);
        const initialPrompt = t('roleplay.prompts.start_story_prompt');

        // FIX: The `isNsfw` boolean was being passed in place of the optional `file` object. Pass `undefined` for the file argument.
        getChatResponse(initialPrompt, finalInstruction, undefined, isNsfw, t).then(response => {
            // FIX: Explicitly type initialMessage as ChatMessage to avoid type inference issues.
            const initialMessage: ChatMessage = { id: '0', text: response.text, sender: 'ai' };
            setMessages([initialMessage]);
            localStorage.setItem(historyKey, JSON.stringify([initialMessage]));
        }).catch(err => {
            console.error("Failed to start story:", err);
            setMessages([{ id: 'err0', text: t('roleplay.alerts.start_story_fail'), sender: 'ai' }]);
        }).finally(() => {
            setIsLoading(false);
        });
    };
    
    const getFinalInstruction = (story: Story) => {
        let final = t('roleplay.prompts.final_story_instruction', story.world.instruction, story.character.name, story.character.personality, story.character.name, story.character.name);
        if (isNsfw) {
            final += t('prompts.nsfw_suffix');
        }
        return final;
    }

    const handleResetStory = () => {
        if (window.confirm(t('roleplay.alerts.reset_story_confirm')) && activeStory) {
            localStorage.removeItem(`roleplay-history-${activeStory.id}`);
            startStory(activeStory, true);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !activeStory) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        // FIX: Explicitly type newMessages array as ChatMessage[] to ensure compatibility.
        const newMessages: ChatMessage[] = [...messages, userMessage, { id: 'thinking', text: '', sender: 'ai', isThinking: true }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        
        const history = messages.map(m => `${m.sender === 'user' ? activeStory.character.name : t('roleplay.story.storyteller')}: ${m.text}`).join('\n');
        const prompt = `${history}\n${activeStory.character.name}: ${input}\n${t('roleplay.story.storyteller')}:`;
        
        try {
            // FIX: The `isNsfw` boolean was being passed in place of the optional `file` object. Pass `undefined` for the file argument.
            const response = await getChatResponse(prompt, getFinalInstruction(activeStory), undefined, isNsfw, t);
            const aiMessage: ChatMessage = { id: Date.now().toString() + 'ai', text: response.text, sender: 'ai' };
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), aiMessage]);
        } catch (error) {
            console.error('Roleplay API Error:', error);
            const errorMessage: ChatMessage = { id: Date.now().toString() + 'err', text: t('roleplay.alerts.story_falters'), sender: 'ai' };
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderLibrary = () => (
        <div className="flex flex-col h-full text-center">
            <h2 className={`text-3xl font-bold ${theme.text}`}>{t('roleplay.library.title')}</h2>
            <p className="text-purple-300 mt-2">{t('roleplay.library.subtitle')}</p>
            <div className="flex-grow overflow-y-auto mt-6 pr-2 space-y-3">
                {savedStories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <BookIcon />
                        <p className="mt-2">{t('roleplay.library.no_stories')}</p>
                    </div>
                ) : (
                    savedStories.map(story => (
                        <div key={story.id} className={`p-4 rounded-lg bg-gray-900/50 border ${theme.border} flex items-center justify-between text-left`}>
                            <div>
                                <h3 className="font-bold text-lg text-white">{story.world.name}</h3>
                                <p className="text-sm text-purple-300">{t('roleplay.story.playing_as')} <span className={theme.text}>{story.character.name}</span></p>
                            </div>
                             <div className="flex gap-2">
                                <button onClick={() => continueStory(story)} className={`px-4 py-2 text-sm bg-${theme.accent}-500 hover:bg-${theme.accent}-600 rounded`}>{t('roleplay.buttons.continue')}</button>
                                <button onClick={() => deleteStory(story.id)} className="p-2 bg-red-600 hover:bg-red-700 rounded"><TrashIcon/></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-6">
                <button onClick={startNewAdventure} className={`w-full md:w-auto px-8 py-3 bg-${theme.accent}-600 hover:bg-${theme.accent}-700 text-white font-bold rounded-lg shadow-lg`}>
                    {t('roleplay.buttons.new_adventure')}
                </button>
            </div>
        </div>
    );
    
    const renderWorldSelectionScreen = () => (
         <div className="flex flex-col h-full text-center">
            <h2 className={`text-3xl font-bold ${theme.text}`}>{t('roleplay.world_selection.title')}</h2>
            <div className="flex-grow overflow-y-auto mt-4 pr-2">
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

                <div className="mb-6 p-4 rounded-lg bg-gray-900/50">
                    <h3 className="text-xl font-semibold text-purple-300 mb-2">{t('roleplay.world_search.title')}</h3>
                    <div className="flex items-center gap-2 mb-4">
                         <input type="text" placeholder={t('roleplay.world_search.placeholder')} value={worldSearchQuery} onChange={e => setWorldSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchWorld()} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                         <button onClick={handleSearchWorld} disabled={isWorldLoading} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full`}>
                             {isWorldLoading ? <LoadingIcon /> : <SearchIcon />}
                         </button>
                     </div>
                     {isWorldLoading ? <p>...</p> : tempWorld && (
                        <div className="text-left">
                           <p className="text-sm text-gray-400 mb-2">{t('roleplay.world_search.found', tempWorld.name)}</p>
                           <button onClick={() => handleSelectWorld(tempWorld)} className={`w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700`}>{t('roleplay.buttons.use_this_world')}</button>
                        </div>
                     )}
                </div>
            </div>
             <button onClick={() => setStep('library')} className="mt-4 text-sm text-gray-400 hover:text-white">{t('roleplay.buttons.go_back')}</button>
        </div>
    );
    
    const renderCharacterSelectionScreen = () => (
         <div className="flex flex-col h-full">
            <h2 className={`text-2xl font-bold ${theme.text} mb-4 text-center`}>{t('roleplay.char_creation.title')}</h2>
            <p className="text-center text-purple-300 mb-4">{t('roleplay.char_creation.subtitle', tempWorld?.name || '')}</p>
            <div className="space-y-4 flex-grow">
                <input type="text" placeholder={t('roleplay.char_creation.name_placeholder')} value={customCharName} onChange={e => setCustomCharName(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600"/>
                <textarea placeholder={t('roleplay.char_creation.personality_placeholder')} value={customCharPersonality} onChange={e => setCustomCharPersonality(e.target.value)} className="w-full bg-gray-800 p-2 rounded-md border border-gray-600 h-40 resize-none"/>
            </div>
            <div className="flex gap-4 mt-4">
                <button onClick={handleCreateCharacter} className={`w-full bg-${theme.accent}-500 text-white px-4 py-2 rounded-lg hover:bg-${theme.accent}-600`}>{t('roleplay.buttons.start_story')}</button>
                <button onClick={() => setStep('world_selection')} className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">{t('roleplay.buttons.choose_different_world')}</button>
            </div>
        </div>
    );

    const renderPlayingScreen = () => (
        <div className="flex flex-col h-[65vh]">
            <div className="pb-2 mb-2 border-b-2 border-gray-700/50 flex justify-between items-center">
                 <button onClick={() => setStep('library')} className="text-sm text-gray-400 hover:text-white">{t('roleplay.buttons.back_to_library')}</button>
                <div className="text-center flex-grow">
                    <p className="font-bold text-lg text-purple-200">{activeStory?.world.name}</p>
                    <p className="text-sm text-gray-400">{t('roleplay.story.playing_as')}<span className={`${theme.text}`}>{activeStory?.character.name}</span></p>
                </div>
                 <button onClick={handleResetStory} title={t('roleplay.buttons.reset_story')} className="p-2 bg-red-600/50 hover:bg-red-600 rounded-full transition-colors">
                    <TrashIcon />
                </button>
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
                                <p className={`font-bold ${theme.text}`}>{activeStory?.character.name}:</p>
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
        case 'library': return renderLibrary();
        case 'world_selection': return renderWorldSelectionScreen();
        case 'character_selection': return renderCharacterSelectionScreen();
        case 'playing': return renderPlayingScreen();
        default: return renderLibrary();
    }
};

export default Roleplay;