import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, CustomBot, Theme } from '../types';
import { getChatResponse, getGroundedResponse, getMapsGroundedResponse, generateSpeech, transcribeAudio } from '../services/geminiService';
import { SendIcon, LoadingIcon, MicrophoneIcon, StopIcon, PlayIcon, SearchIcon, MapIcon, LinkIcon, VoiceIcon, UserCircleIcon } from './Icons';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { useLocalization } from '../localization';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

interface ChatProps {
    bot: CustomBot;
    theme: Record<string, string>;
    themeName: Theme;
}

const Chat: React.FC<ChatProps> = ({ bot, theme, themeName }) => {
  const { t } = useLocalization();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '0', text: t('chat.initial_message'), sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [voice, setVoice] = useState('Kore');
  const availableVoices = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir'];


  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

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
      const audioData = await generateSpeech(text, voiceName, themeName, t);
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
  }, [themeName, t]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() && !audioBlob) return;
    setIsLoading(true);

    let currentInput = messageText;
    
    if (audioBlob) {
        try {
            const base64Audio = await fileToBase64(new File([audioBlob], "audio.webm"));
            const transcript = await transcribeAudio(base64Audio, audioBlob.type);
            currentInput = transcript;
            setMessages(prev => [...prev, { id: Date.now().toString(), text: t('chat.user_said', transcript), sender: 'user' }]);
        } catch(error) {
            console.error("Transcription failed", error);
            setMessages(prev => [...prev, { id: Date.now().toString(), text: t('chat.transcription_failed'), sender: 'ai' }]);
            setIsLoading(false);
            setAudioBlob(null);
            return;
        }
    } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: currentInput, sender: 'user' }]);
    }
    
    setInput('');
    setAudioBlob(null);

    setMessages(prev => [...prev, { id: 'thinking', text: '', sender: 'ai', isThinking: true }]);

    try {
      let response: { text: string; sources?: { uri: string; title: string }[] };

      if (useMaps) {
        response = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const res = await getMapsGroundedResponse(currentInput, {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                }, bot.systemInstruction);
                resolve(res);
              } catch (e) {
                reject(e);
              }
            },
            (error) => {
              console.error("Geolocation error:", error);
              reject(new Error(t('chat.geolocation_error')));
            }
          );
        });
      } else if (useSearch) {
        response = await getGroundedResponse(currentInput, bot.systemInstruction);
      } else {
        response = await getChatResponse(currentInput, bot.systemInstruction);
      }
      
      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      const aiMessage: ChatMessage = { id: Date.now().toString(), text: response.text, sender: 'ai', sources: response.sources };
      setMessages(prev => [...prev, aiMessage]);
      speak(response.text, voice);

    } catch (error) {
      console.error('Gemini API Error:', error);
      const errorMessage = (error as Error).message || t('chat.gemini_error');
      setMessages(prev => prev.filter(m => m.id !== 'thinking'));
      setMessages(prev => [...prev, { id: Date.now().toString(), text: errorMessage, sender: 'ai' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        const audioChunks: Blob[] = [];
        recorder.ondataavailable = event => audioChunks.push(event.data);
        recorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          setAudioBlob(blob);
          stream.getTracks().forEach(track => track.stop());
        };
        recorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Microphone access denied:", error);
        alert(t('chat.mic_denied'));
      }
    }
  };

  return (
    <div className="flex flex-col h-[65vh]">
      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && (
              <div className={`w-10 h-10 rounded-full border-2 flex-shrink-0 bg-gray-800 flex items-center justify-center border-${theme.accent}-400`}>
                {bot.avatarUrl ? (
                  <img src={bot.avatarUrl} className="w-full h-full rounded-full object-cover"/>
                ) : (
                  <UserCircleIcon className="w-8 h-8"/>
                )}
              </div>
            )}
            <div className={`max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-purple-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
              {msg.isThinking ? (
                 <div className="flex items-center justify-center space-x-1">
                    <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></span>
                 </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
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
            {msg.sender === 'ai' && !msg.isThinking && msg.text && (
                 <button onClick={() => speak(msg.text, voice)} disabled={isSpeaking} className="text-purple-400 hover:text-pink-400 disabled:text-gray-500 disabled:cursor-not-allowed">
                     <PlayIcon />
                 </button>
             )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={`mt-4 pt-4 border-t ${theme.border}`}>
        <div className="flex items-center space-x-2 mb-2">
            <button onClick={handleRecord} className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 hover:bg-purple-500'}`}>
                {isRecording ? <StopIcon/> : <MicrophoneIcon/>}
            </button>
            {audioBlob && <div className="text-sm text-pink-300">{t('chat.audio_recorded')}</div>}
        </div>
        <div className="flex items-center bg-gray-900 rounded-lg p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(input))}
            placeholder={t('chat.input_placeholder')}
            className="flex-grow bg-transparent focus:outline-none p-2 resize-none"
            rows={1}
            disabled={isLoading || isRecording}
          />
          <button onClick={() => handleSendMessage(input)} disabled={isLoading || isRecording} className={`bg-${theme.accent}-500 hover:bg-${theme.accent}-600 disabled:bg-gray-600 text-white p-2 rounded-full transition-colors`}>
            {isLoading ? <LoadingIcon /> : <SendIcon />}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs">
            <label className="flex items-center cursor-pointer text-purple-300">
                <input type="checkbox" checked={useSearch} onChange={() => { setUseSearch(!useSearch); setUseMaps(false); }} className={`form-checkbox h-4 w-4 text-${theme.accent}-500 bg-gray-800 border-gray-600 rounded focus:ring-${theme.accent}-500`}/>
                <SearchIcon className="ml-2 mr-1" />
                <span>{t('chat.search_web')}</span>
            </label>
            <label className="flex items-center cursor-pointer text-purple-300">
                <input type="checkbox" checked={useMaps} onChange={() => { setUseMaps(!useMaps); setUseSearch(false); }} className={`form-checkbox h-4 w-4 text-${theme.accent}-500 bg-gray-800 border-gray-600 rounded focus:ring-${theme.accent}-500`}/>
                <MapIcon className="ml-2 mr-1" />
                <span>{t('chat.find_places')}</span>
            </label>
            <div className="flex items-center text-purple-300">
                <VoiceIcon className="mr-1 h-4 w-4" />
                <label htmlFor="voice-select" className="mr-2">{t('chat.her_voice')}</label>
                <select
                    id="voice-select"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className={`bg-gray-800 border border-gray-600 rounded text-xs p-1 focus:ring-${theme.accent}-500 focus:border-${theme.accent}-500`}
                    disabled={isLoading || isSpeaking}
                >
                    {availableVoices.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;