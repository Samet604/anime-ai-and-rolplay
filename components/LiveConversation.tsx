import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';
import { MicrophoneIcon, StopIcon, UserCircleIcon, VolumeOffIcon, VolumeUpIcon } from './Icons';
// FIX: Changed incorrect type 'CustomBot' to 'Companion'.
import { Companion } from '../types';
import { useLocalization } from '../localization';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface LiveConversationProps {
    // FIX: Changed incorrect type 'CustomBot' to 'Companion'.
    bot: Companion;
    theme: Record<string, string>;
    isNsfw: boolean;
}

const LiveConversation: React.FC<LiveConversationProps> = ({ bot, theme, isNsfw }) => {
  const { t } = useLocalization();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [transcripts, setTranscripts] = useState<{ user: string; model: string }>({ user: '', model: '' });
  const [isMuted, setIsMuted] = useState(false);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  
  const currentUserTranscriptRef = useRef('');
  const currentModelTranscriptRef = useRef('');

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const stopConversation = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;
    
    inputAudioContextRef.current?.close().then(() => inputAudioContextRef.current = null);

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    
    setConnectionState('disconnected');
  }, []);

  const startConversation = async () => {
    setConnectionState('connecting');
    setTranscripts({ user: '', model: '' });
    currentUserTranscriptRef.current = '';
    currentModelTranscriptRef.current = '';
    
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      let finalInstruction = bot.systemInstruction;
      if (isNsfw) {
          finalInstruction += t('prompts.nsfw_suffix');
      }

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: finalInstruction,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        },
        callbacks: {
          onopen: () => {
            setConnectionState('connected');
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions
            if (message.serverContent?.inputTranscription) {
              currentUserTranscriptRef.current += message.serverContent.inputTranscription.text;
              setTranscripts(prev => ({...prev, user: currentUserTranscriptRef.current}));
            }
            if (message.serverContent?.outputTranscription) {
              currentModelTranscriptRef.current += message.serverContent.outputTranscription.text;
              setTranscripts(prev => ({...prev, model: currentModelTranscriptRef.current}));
            }
            if (message.serverContent?.turnComplete) {
              currentUserTranscriptRef.current = '';
              currentModelTranscriptRef.current = '';
            }

            // Handle audio playback
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current && !isMutedRef.current) {
              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination);
              
              const currentTime = outputAudioContextRef.current.currentTime;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              audioSourcesRef.current.add(source);
              source.onended = () => audioSourcesRef.current.delete(source);
            }
            
            if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(s => s.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            stopConversation();
            stream.getTracks().forEach(track => track.stop());
          },
          onerror: (e: ErrorEvent) => {
            console.error("Live session error:", e);
            setConnectionState('error');
            stopConversation();
            stream.getTracks().forEach(track => track.stop());
          },
        },
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setConnectionState('error');
    }
  };

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  const renderStatus = () => {
    switch (connectionState) {
        case 'disconnected': return t('live.status_disconnected');
        case 'connecting': return t('live.status_connecting');
        case 'connected': return t('live.status_connected');
        case 'error': return t('live.status_error');
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center bg-gray-800 shadow-lg transition-all duration-500 ${connectionState === 'connected' ? `border-${theme.accent}-500 shadow-${theme.accent}-500/50 animate-pulse` : 'border-purple-500'}`}>
          {bot.avatarUrl ? (
            <img src={bot.avatarUrl} alt={bot.name} className="w-full h-full rounded-full object-cover"/>
          ) : (
            <UserCircleIcon className="w-28 h-28" />
          )}
        </div>
        <p className="mt-4 text-purple-300 italic">{renderStatus()}</p>

        <div className="w-full mt-6 p-4 bg-gray-900/50 rounded-lg min-h-[200px] text-left">
            <p><strong className="text-purple-400">{t('live.user_transcript_label')}</strong> {transcripts.user || "..."}</p>
            <p className="mt-2"><strong className={`text-${theme.accent}-400`}>{t('live.model_transcript_label')}</strong> {transcripts.model || "..."}</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
            <button
                onClick={connectionState === 'connected' || connectionState === 'connecting' ? stopConversation : startConversation}
                className={`px-8 py-4 rounded-full text-white font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center ${
                    connectionState === 'connected' || connectionState === 'connecting'
                    ? 'bg-red-500 hover:bg-red-600'
                    : `bg-${theme.accent}-500 hover:bg-${theme.accent}-600`
                }`}
            >
                {connectionState === 'connected' || connectionState === 'connecting' ? (
                    <><StopIcon /> <span className="ml-2">{t('live.button_stop')}</span></>
                ) : (
                    <><MicrophoneIcon /> <span className="ml-2">{t('live.button_talk')}</span></>
                )}
            </button>
            {connectionState === 'connected' && (
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full text-white transition-colors ${isMuted ? 'bg-gray-600' : `bg-${theme.accent}-500`}`}
                    aria-label={isMuted ? t('live.unmute') : t('live.mute')}
                    title={isMuted ? t('live.unmute') : t('live.mute')}
                >
                    {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </button>
            )}
        </div>
    </div>
  );
};

export default LiveConversation;
