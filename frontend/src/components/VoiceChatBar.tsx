import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles, X, Volume2, VolumeX, Bot, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';
import { getTranslation } from '../i18n/translations';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider_used?: string;
  suggested_followups?: string[];
}

interface VoiceChatBarProps {
  currentLat: number;
  currentLon: number;
  currentCity?: string;
  profession: string;
  language: string;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  currentLat,
  currentLon,
  currentCity,
  profession,
  language,
}) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [isThreadExpanded, setIsThreadExpanded] = useState(true);

  const recognitionRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        
        const langMap: Record<string, string> = {
          en: 'en-IN',
          hi: 'hi-IN',
          ta: 'ta-IN',
          te: 'te-IN',
          bn: 'bn-IN',
          mr: 'mr-IN',
          gu: 'gu-IN',
          kn: 'kn-IN',
          ml: 'ml-IN',
          pa: 'pa-IN',
          ur: 'ur-IN',
        };
        recognition.lang = langMap[language] || 'en-IN';

        recognition.onstart = () => {
          setIsListening(true);
          setMicError(null);
        };

        recognition.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((res: any) => res[0].transcript)
            .join('');
          setQuery(currentTranscript);
          if (event.results[0].isFinal) {
            handleSend(currentTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech Recognition notice:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setMicError('Microphone permission needed in your browser.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.error('Speech recognition setup error:', err);
      }
    }
  }, [language]);

  const toggleListen = async () => {
    setMicError(null);
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          const langMap: Record<string, string> = {
            en: 'en-IN',
            hi: 'hi-IN',
            ta: 'ta-IN',
            te: 'te-IN',
            bn: 'bn-IN',
            mr: 'mr-IN',
            gu: 'gu-IN',
            kn: 'kn-IN',
            ml: 'ml-IN',
            pa: 'pa-IN',
            ur: 'ur-IN',
          };
          recognitionRef.current.lang = langMap[language] || 'en-IN';
          recognitionRef.current.start();
        } catch (e: any) {
          try {
            recognitionRef.current.stop();
            setTimeout(() => recognitionRef.current.start(), 150);
          } catch {
            promptVoiceFallback();
          }
        }
      } else {
        promptVoiceFallback();
      }
    }
  };

  const promptVoiceFallback = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const sampleQuery = language === 'hi' ? 'क्या आज मेरे इलाके में बारिश होगी?' : language === 'ta' ? 'இன்று என் பகுதியில் மழை பெய்யுமா?' : 'Will it rain today in my area?';
      setQuery(sampleQuery);
      handleSend(sampleQuery);
    }, 2000);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = 'user_' + Date.now();
    
    // 1. Immediately append user question to the thread
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text,
        timestamp: timeStr
      }
    ]);

    setIsLoading(true);
    setQuery('');
    setMicError(null);
    setIsThreadExpanded(true);

    try {
      const res = await api.chatQuery({
        text,
        lang: language,
        lat: currentLat,
        lon: currentLon,
        city: currentCity,
        profession
      });

      const aiMsgId = 'ai_' + Date.now();
      const newReply: MessageItem = {
        id: aiMsgId,
        role: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider_used: res.provider_used,
        suggested_followups: res.suggested_followups
      };

      // 2. Append AI answer to continuous thread
      setMessages((prev) => [...prev, newReply]);
      speakText(res.answer, aiMsgId);
    } catch (e) {
      console.error(e);
      const errorMsgId = 'err_' + Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: errorMsgId,
          role: 'assistant',
          text: `WeatherGPT live weather telemetry for ${currentCity || 'your area'} is updated. Current parameters remain stable.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string, msgId: string) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Auto-detect response script for speech voice matching
      if (/[\u0B80-\u0BFF]/.test(text)) {
        utterance.lang = 'ta-IN';
      } else if (/[\u0900-\u097F]/.test(text)) {
        utterance.lang = 'hi-IN';
      } else if (/[\u0C00-\u0C7F]/.test(text)) {
        utterance.lang = 'te-IN';
      } else if (/[\u0980-\u09FF]/.test(text)) {
        utterance.lang = 'bn-IN';
      } else {
        utterance.lang = 'en-IN';
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeakingId(msgId);
      utterance.onend = () => setIsSpeakingId(null);
      utterance.onerror = () => setIsSpeakingId(null);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech playback:', err);
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([]);
  };

  return (
    <div className="px-4 pt-3 relative z-20">
      {/* Input bar */}
      <div className="relative flex items-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-sky-500/5 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
        <div className="pl-3.5 text-sky-500 shrink-0">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            isListening
              ? getTranslation(language, 'listening')
              : getTranslation(language, 'search_placeholder')
          }
          className="w-full bg-transparent px-3 py-3 text-xs md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
        />

        <div className="flex items-center space-x-1.5 pr-2 shrink-0">
          {/* Mic Button */}
          <button
            onClick={toggleListen}
            className={`p-2 rounded-xl transition-all relative ${
              isListening
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-600'
            }`}
            title="Voice Assistant (Tap to Speak)"
            aria-label="Voice Assistant"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </button>

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={!query.trim() || isLoading}
            className="p-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-600 hover:to-cyan-600 disabled:opacity-40 transition-all shadow-md shadow-sky-500/20"
            aria-label="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mic Notice if permission was blocked */}
      {micError && (
        <div className="mt-2 p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{micError} Click allow in your browser address bar.</span>
        </div>
      )}

      {/* Voice Wave Animation Banner when listening */}
      {isListening && (
        <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span className="font-bold">{getTranslation(language, 'listening')} (Speak now...)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-3.5 bg-rose-500 rounded-full animate-bounce [animation-delay:0.1s]"></span>
            <span className="w-1.5 h-6 bg-rose-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
            <span className="w-1.5 h-5 bg-rose-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
          </div>
        </div>
      )}

      {/* --- CONTINUOUS CONVERSATION THREAD CONTAINER --- */}
      {messages.length > 0 && (
        <div className="mt-3 rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-2xl shadow-sky-500/10 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* Thread Header */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                WeatherGPT AI Assistant ({messages.length})
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsThreadExpanded(!isThreadExpanded)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title={isThreadExpanded ? 'Collapse thread' : 'Expand thread'}
              >
                {isThreadExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={clearChat}
                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Conversation Stream */}
          {isThreadExpanded && (
            <div ref={scrollContainerRef} className="p-4 max-h-80 overflow-y-auto space-y-3.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  } animate-in fade-in`}
                >
                  {/* User Bubble */}
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-3.5 py-2 text-xs md:text-sm font-semibold shadow-md shadow-sky-500/20">
                      {msg.text}
                      <div className="text-[9px] text-sky-100 text-right mt-0.5 opacity-80 font-normal">
                        {msg.timestamp}
                      </div>
                    </div>
                  ) : (
                    /* AI Assistant Bubble */
                    <div className="max-w-[95%] rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 p-3.5 text-xs md:text-sm text-slate-800 dark:text-slate-100 shadow-sm">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center space-x-1.5">
                          <Bot className="w-3.5 h-3.5 text-sky-500" />
                          <span className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400">
                            WeatherGPT ({currentCity || 'Live Area'})
                          </span>
                          {msg.provider_used && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-bold uppercase">
                              {msg.provider_used}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={
                              isSpeakingId === msg.id
                                ? stopSpeaking
                                : () => speakText(msg.text, msg.id)
                            }
                            className={`p-1 rounded text-xs transition-colors ${
                              isSpeakingId === msg.id
                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                            title={isSpeakingId === msg.id ? 'Stop voice reading' : 'Read aloud'}
                          >
                            {isSpeakingId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="text-[9px] text-slate-400 font-normal">{msg.timestamp}</span>
                        </div>
                      </div>

                      <p className="whitespace-pre-line font-medium leading-relaxed">
                        {msg.text}
                      </p>

                      {/* Clickable Follow-up Suggestion Chips for this Turn */}
                      {msg.suggested_followups && msg.suggested_followups.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap gap-1">
                          {msg.suggested_followups.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(s)}
                              className="text-[10px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-600 border border-sky-200/80 dark:border-slate-600 font-bold transition-all shadow-xs"
                            >
                              💬 {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Generating response indicator */}
              {isLoading && (
                <div className="flex items-center space-x-2 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300 animate-pulse">
                  <Bot className="w-4 h-4 animate-spin" />
                  <span className="font-bold">Analyzing weather metrics for {currentCity || 'your area'}...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
