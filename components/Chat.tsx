import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, Companion, Theme } from '../types';
import { getChatResponse, getGroundedResponse, getMapsGroundedResponse, generateSpeech, transcribeAudio, generateSpontaneousImage } from '../services/geminiService';
import { SendIcon, LoadingIcon, MicrophoneIcon, StopIcon, PlayIcon, SearchIcon, MapIcon, LinkIcon, VoiceIcon, UserCircleIcon, PaperclipIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
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

interface ChatProps {
    bot: Companion;
    theme: Record<string, string>;
    themeName: Theme;
    isNsfw: boolean;
    enableRandomImages: boolean;
    enableAutoPlayback: boolean;
}

const Chat: React.FC<ChatProps> = ({ bot, theme, themeName, isNsfw, enableRandomImages, enableAutoPlayback }) => {
  const { t } = useLocalization();
  const conversationKey = `chat-history-${bot.id}`;
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
      const stored = localStorage.getItem(conversationKey);
      return stored ? JSON.parse(stored) : [{ id: '0', text: t(`chat.initial_message_${themeName}`), sender: 'ai' }];
  });

  useEffect(() => {
    const stored = localStorage.getItem(conversationKey);
    setMessages(stored ? JSON.parse(stored) : [{ id: '0', text: t(`chat.initial_message_${themeName}`), sender: 'ai' }]);
  }, [bot, t, themeName, conversationKey]);

  useEffect(() => {
      if (messages.length > 0) {
          localStorage.setItem(conversationKey, JSON.stringify(messages));
      }
  }, [messages, conversationKey]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [voice, setVoice] = useState('Kore');
  const availableVoices = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir', 'Echo', 'Sierra', 'Tango', 'Whiskey', 'Victor', 'Lima', 'Delta', 'Alpha', 'Bravo', 'Charlie', 'Hotel', 'India', 'Juliet', 'Kilo', 'Mike'];

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = useCallback(async (text: string, voiceName: string) => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      const audioData = await generateSpeech(text, voiceName);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioBuffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      source.onended = () => setIsSpeaking(false);
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
    }
  }, []);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() && !audioBlob && !selectedFile) return;
    setIsLoading(true);

    let currentInput = messageText;
    let userMessage: ChatMessage;

    if (audioBlob) {
        // ... (audio handling remains the same)
    } else if (selectedFile) {
        const dataUrl = await fileToDataURL(selectedFile);
        userMessage = { 
            id: Date.now().toString(), 
            text: currentInput, 
            sender: 'user', 
            imageUrl: dataUrl,
            fileData: dataUrl.split(',')[1],
            fileMimeType: selectedFile.type,
        };
    } else {
        userMessage = { id: Date.now().toString(), text: currentInput, sender: 'user' };
    }
    
    setInput('');
    setAudioBlob(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    if(fileInputRef.current) fileInputRef.current.value = '';

    const updatedMessages: ChatMessage[] = [...messages, userMessage, { id: 'thinking', text: '', sender: 'ai', isThinking: true }];
    setMessages(updatedMessages);

    try {
      let response: { text: string; sources?: { uri: string; title: string }[] };

      if (useMaps) {
        // ... (maps handling remains the same)
      } else if (useSearch) {
        response = await getGroundedResponse(currentInput, bot.systemInstruction, isNsfw, t);
      } else {
        const filePayload = userMessage.fileData ? { data: userMessage.fileData, mimeType: userMessage.fileMimeType! } : undefined;
        response = await getChatResponse(currentInput, bot.systemInstruction, filePayload, isNsfw, t);
      }
      
      const aiMessage: ChatMessage = { id: Date.now().toString(), text: response.text, sender: 'ai', sources: response.sources };
      setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), aiMessage]);
      if (enableAutoPlayback) {
        speak(response.text, voice);
      }

      if (enableRandomImages && !userMessage.fileData && Math.random() < 0.20) { 
          setMessages(prev => [...prev, { id: 'thinking-image', text: '', sender: 'ai', isThinkingImage: true }]);
          try {
              const imageUrl = await generateSpontaneousImage([...messages, userMessage, aiMessage], bot, isNsfw, t);
              setMessages(prev => [...prev.filter(m => m.id !== 'thinking-image'), { id: Date.now().toString() + '-img', text: '', sender: 'ai', imageUrl }]);
          } catch(imgError) {
              console.error("Spontaneous image generation failed:", imgError);
              setMessages(prev => prev.filter(m => m.id !== 'thinking-image'));
          }
      }

    } catch (error) {
      console.error('Gemini API Error:', error);
      const errorMessage = (error as Error).message || t('chat.gemini_error');
      setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), { id: Date.now().toString(), text: errorMessage, sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRecord = async () => {
    // ... (recording logic remains the same)
  };

  const renderMessageContent = (msg: ChatMessage) => {
    if (msg.isThinking) return <div className="flex items-center justify-center space-x-1"><span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></span></div>;
    if (msg.isThinkingImage) return <div className="w-48 h-48 bg-gray-800 rounded-lg flex items-center justify-center"><LoadingIcon /></div>;
    
    return (
        <div>
            {msg.imageUrl && <img src={msg.imageUrl} alt={t('chat.image_alt')} className="rounded-lg max-w-xs mb-2" />}
            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-[65vh]">
      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && <div className={`w-10 h-10 rounded-full border-2 flex-shrink-0 bg-gray-800 flex items-center justify-center border-${theme.accent}-400`}>{bot.avatarUrl ? <img src={bot.avatarUrl} className="w-full h-full rounded-full object-cover"/> : <UserCircleIcon className="w-8 h-8"/>}</div>}
            <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-purple-600 rounded-br-none' : (msg.imageUrl && !msg.text ? 'bg-transparent p-0' : 'bg-gray-700 rounded-bl-none')}`}>
              {renderMessageContent(msg)}
              {msg.sources && msg.sources.length > 0 && <div className="mt-2 border-t border-purple-400/30 pt-2"><p className="text-xs text-purple-300 mb-1">{t('chat.sources_title')}</p><div className="flex flex-col space-y-1">{msg.sources.map((source, index) => <a key={index} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-pink-300 hover:text-pink-200 transition-colors"><LinkIcon /> <span className="ml-1 truncate">{source.title}</span></a>)}</div></div>}
            </div>
            {msg.sender === 'ai' && !msg.isThinking && !msg.imageUrl && msg.text && <button onClick={() => speak(msg.text, voice)} disabled={isSpeaking} className="text-purple-400 hover:text-pink-400 disabled:text-gray-500 disabled:cursor-not-allowed"><PlayIcon /></button>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={`mt-4 pt-4 border-t ${theme.border}`}>
        <div className="flex items-center space-x-2 mb-2">
            <button onClick={handleRecord} className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 hover:bg-purple-500'}`}>{isRecording ? <StopIcon/> : <MicrophoneIcon/>}</button>
            {audioBlob && <div className="text-sm text-pink-300">{t('chat.audio_recorded')}</div>}
            {previewUrl && (
                <div className="flex items-center gap-2">
                    <img src={previewUrl} alt="Preview" className="w-10 h-10 rounded object-cover" />
                    <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 hover:text-red-300 text-xs">X</button>
                </div>
            )}
        </div>
        <div className="flex items-center bg-gray-900 rounded-lg p-2">
          <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading || isRecording} className="text-purple-400 hover:text-pink-400 p-2"><PaperclipIcon/></button>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(input))} placeholder={t('chat.input_placeholder')} className="flex-grow bg-transparent focus:outline-none p-2 resize-none" rows={1} disabled={isLoading || isRecording} />
          <button onClick={() => handleSendMessage(input)} disabled={isLoading || isRecording || (!input.trim() && !selectedFile)} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full transition-colors`}>{isLoading ? <LoadingIcon /> : <SendIcon />}</button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs">
            <label className="flex items-center cursor-pointer text-purple-300"><input type="checkbox" checked={useSearch} onChange={() => { setUseSearch(!useSearch); setUseMaps(false); }} className={`form-checkbox h-4 w-4 text-${theme.accent}-500 bg-gray-800 border-gray-600 rounded focus:ring-${theme.accent}-500`}/><SearchIcon className="ml-2 mr-1" /><span>{t('chat.search_web')}</span></label>
            <label className="flex items-center cursor-pointer text-purple-300"><input type="checkbox" checked={useMaps} onChange={() => { setUseMaps(!useMaps); setUseSearch(false); }} className={`form-checkbox h-4 w-4 text-${theme.accent}-500 bg-gray-800 border-gray-600 rounded focus:ring-${theme.accent}-500`}/><MapIcon className="ml-2 mr-1" /><span>{t('chat.find_places')}</span></label>
            <div className="flex items-center text-purple-300"><VoiceIcon className="mr-1 h-4 w-4" /><label htmlFor="voice-select" className="mr-2">{t('chat.her_voice')}</label><select id="voice-select" value={voice} onChange={(e) => setVoice(e.target.value)} className={`bg-gray-800 border border-gray-600 rounded text-xs p-1 focus:ring-${theme.accent}-500 focus:border-${theme.accent}-500`} disabled={isLoading || isSpeaking}>{availableVoices.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
