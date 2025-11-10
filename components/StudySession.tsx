import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Companion, UserGender } from '../types';
import { getStudyTopicResponse } from '../services/geminiService';
import { SendIcon, LoadingIcon, LinkIcon, UserCircleIcon, PaperclipIcon } from './Icons';
import { useLocalization } from '../localization';

// Helper to convert file to base64
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

interface StudySessionProps {
    bot: Companion;
    theme: Record<string, string>;
    isNsfw: boolean;
    userGender: UserGender;
}

const StudySession: React.FC<StudySessionProps> = ({ bot, theme, isNsfw, userGender }) => {
    const { t } = useLocalization();
    const conversationKey = `study-session-${bot.id}`;

    const getUserTitle = () => {
        const baseTitle = "Seito"; // The base title is consistent
        switch (userGender) {
            case 'male': return `${baseTitle}-kun`;
            case 'female': return `${baseTitle}-chan`;
            default: return baseTitle;
        }
    };
    const userTitle = getUserTitle();

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const stored = localStorage.getItem(conversationKey);
        return stored ? JSON.parse(stored) : [{ id: '0', text: t('study.initial_message', userTitle), sender: 'ai' }];
    });

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const stored = localStorage.getItem(conversationKey);
        setMessages(stored ? JSON.parse(stored) : [{ id: '0', text: t('study.initial_message', userTitle), sender: 'ai' }]);
    }, [bot, t, conversationKey, userTitle]);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(conversationKey, JSON.stringify(messages));
        }
    }, [messages, conversationKey]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getTeacherInstruction = () => {
        let final = bot.systemInstruction + t('study.teacher_instruction_suffix', userTitle);
        if (isNsfw) {
            final += t('prompts.nsfw_suffix');
        }
        return final;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null); // No preview for non-image files
            }
        }
    };
    
    const handleSendMessage = async () => {
        if (!input.trim() && !selectedFile) return;
        setIsLoading(true);

        let userMessage: ChatMessage;
        if (selectedFile) {
            const dataUrl = await fileToDataURL(selectedFile);
            userMessage = { 
                id: Date.now().toString(), 
                text: input || t('study.file_analysis_prompt'), 
                sender: 'user', 
                imageUrl: selectedFile.type.startsWith('image/') ? dataUrl : undefined,
                fileData: dataUrl.split(',')[1],
                fileMimeType: selectedFile.type,
            };
        } else {
            userMessage = { id: Date.now().toString(), text: input, sender: 'user' };
        }

        setInput('');
        setSelectedFile(null);
        setPreviewUrl(null);
        if(fileInputRef.current) fileInputRef.current.value = '';

        const updatedMessages: ChatMessage[] = [...messages, userMessage, { id: 'thinking', text: '', sender: 'ai', isThinking: true }];
        setMessages(updatedMessages);

        try {
            const filePayload = userMessage.fileData ? { data: userMessage.fileData, mimeType: userMessage.fileMimeType! } : undefined;
            const response = await getStudyTopicResponse(userMessage.text, getTeacherInstruction(), filePayload, isNsfw, t);
            const aiMessage: ChatMessage = { id: Date.now().toString(), text: response.text, sender: 'ai', sources: response.sources };
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), aiMessage]);
        } catch (error) {
            console.error('Study Session API Error:', error);
            const errorMessage = (error as Error).message || t('study.gemini_error');
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), { id: Date.now().toString(), text: errorMessage, sender: 'ai' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessageContent = (msg: ChatMessage) => {
        if (msg.isThinking) {
            return (
                <div className="flex items-center justify-center space-x-1">
                    <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></span>
                </div>
            );
        }
         return (
            <div>
                {msg.imageUrl && <img src={msg.imageUrl} alt={t('chat.image_alt')} className="rounded-lg max-w-xs mb-2" />}
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[65vh]">
            <div className="text-center pb-2 mb-2 border-b-2 border-gray-700/50">
                <h2 className={`text-2xl font-bold ${theme.text}`}>{t('study.title')}</h2>
                <p className="text-purple-300 text-sm">{t('study.subtitle', bot.name, userTitle)}</p>
            </div>
            <div className="flex-grow overflow-y-auto pr-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'ai' && (
                            <div className={`w-10 h-10 rounded-full border-2 flex-shrink-0 bg-gray-800 flex items-center justify-center border-${theme.accent}-400`}>
                                {bot.avatarUrl ? <img src={bot.avatarUrl} className="w-full h-full rounded-full object-cover"/> : <UserCircleIcon className="w-8 h-8"/>}
                            </div>
                        )}
                        <div className="w-full">
                            <p className={`font-bold mb-1 ${msg.sender === 'user' ? `${theme.text} text-right` : 'text-purple-300'}`}>
                                {msg.sender === 'user' ? userTitle : t('study.teacher_title')}
                            </p>
                            <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? `bg-purple-600 rounded-br-none ml-auto` : `bg-gray-700 rounded-bl-none`}`}>
                                {renderMessageContent(msg)}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2 border-t border-purple-400/30 pt-2">
                                        <p className="text-xs text-purple-300 mb-1">{t('chat.sources_title')}</p>
                                        <div className="flex flex-col space-y-1">
                                            {msg.sources.map((source, index) => (
                                                <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-pink-300 hover:text-pink-200 transition-colors">
                                                    <LinkIcon /> <span className="ml-1 truncate">{source.title}</span>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className={`mt-4 pt-4 border-t ${theme.border}`}>
                {previewUrl && (
                    <div className="flex items-center gap-2 mb-2">
                        <img src={previewUrl} alt="Preview" className="w-10 h-10 rounded object-cover" />
                        <span className="text-xs text-gray-400 truncate">{selectedFile?.name}</span>
                        <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 hover:text-red-300 text-xs ml-auto">X</button>
                    </div>
                )}
                 {!previewUrl && selectedFile && (
                    <div className="flex items-center gap-2 mb-2">
                        <PaperclipIcon className="text-gray-400" />
                        <span className="text-xs text-gray-400 truncate">{selectedFile.name}</span>
                        <button onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 hover:text-red-300 text-xs ml-auto">X</button>
                    </div>
                 )}
                <div className="flex items-center bg-gray-900 rounded-lg p-2">
                    <input type="file" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="text-purple-400 hover:text-pink-400 p-2"><PaperclipIcon/></button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder={t('study.input_placeholder')}
                        className="flex-grow bg-transparent focus:outline-none p-2 resize-none"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading || (!input.trim() && !selectedFile)} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full transition-colors`}>
                        {isLoading ? <LoadingIcon /> : <SendIcon />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudySession;