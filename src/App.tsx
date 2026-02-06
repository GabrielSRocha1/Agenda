import { useState, useEffect, useRef } from 'react';
import { Mic, MoreVertical, Phone, Video, CheckCheck, Play, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { smartParse, speak, type AgendaEvent } from './utils/ai';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isAudio?: boolean;
  audioDuration?: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou seu assistente pessoal. O que deseja agendar hoje? Pode falar comigo por voz.',
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev: number) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const handleVoiceCommand = (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
      isAudio: true,
      audioDuration: formatTime(recordingTime) || '0:05'
    };
    setMessages((prev: Message[]) => [...prev, userMsg]);

    // AI logic
    setTimeout(() => {
      const internalResult = smartParse(text);
      let responseText = "";

      if (internalResult.type === 'create' && internalResult.event) {
        const newEvent = { ...internalResult.event, id: Math.random().toString() } as AgendaEvent;
        setEvents((prev: AgendaEvent[]) => [...prev, newEvent]);
        responseText = `Com certeza! Agendei seu compromisso: "${newEvent.title}" para ${format(newEvent.date, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}. Já te aviso 30 minutos antes!`;

        // Schedule notifications (Simulated)
        scheduleReminders(newEvent);
      } else {
        responseText = "Desculpe, não entendi muito bem. Pode repetir o que deseja agendar?";
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages((prev: Message[]) => [...prev, assistantMsg]);
      speak(responseText);
    }, 1000);
  };

  const scheduleReminders = (event: AgendaEvent) => {
    const now = new Date();
    const min30 = differenceInMinutes(event.date, now) - 30;
    const min10 = differenceInMinutes(event.date, now) - 10;

    if (min30 > 0) {
      setTimeout(() => {
        const msg = `Senhor Rocha, falta 30 minutos para sua ${event.title}`;
        sendSystemMessage(msg);
        speak(msg);
      }, min30 * 60 * 1000);
    }

    if (min10 > 0) {
      setTimeout(() => {
        const msg = `Senhor Rocha, falta 10 minutos para sua ${event.title}`;
        sendSystemMessage(msg);
        speak(msg);
      }, min10 * 60 * 1000);
    }
  };

  const sendSystemMessage = (text: string) => {
    setMessages((prev: Message[]) => [...prev, {
      id: Date.now().toString(),
      text,
      sender: 'assistant',
      timestamp: new Date()
    }]);
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isRecording) {
      // If already recording, this function might be called by a button to STOP
      return;
    }

    setIsRecording(true);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        handleVoiceCommand(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    // Store recognition in a ref so we can stop it manually
    (window as any)._currentRecognition = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    if ((window as any)._currentRecognition) {
      try {
        (window as any)._currentRecognition.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      (window as any)._currentRecognition = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <header className="header">
        <div className="header-avatar">
          <img src="https://ui-avatars.com/api/?name=Assistente+Pessoal&background=0a5d4d&color=fff" alt="AV" />
        </div>
        <div className="header-info">
          <div className="header-name">Assistente Pessoal</div>
          <div className="header-status">online</div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', opacity: 0.8 }}>
          <Video size={20} />
          <Phone size={18} />
          <MoreVertical size={20} />
        </div>
      </header>

      <main className="chat-container">
        <div className="date-separator">Hoje</div>

        <AnimatePresence initial={false}>
          {messages.map((msg: Message) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`message ${msg.sender}`}
            >
              {msg.isAudio ? (
                <div className="audio-bubble">
                  <Play size={24} fill="currentColor" stroke="none" />
                  <div className="waveform">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="waveform-bar"
                        style={{ height: `${Math.random() * 100}%` }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: '#667781' }}>{msg.audioDuration}</span>
                </div>
              ) : (
                <>
                  {msg.text}
                  <div className="message-time">
                    {format(msg.timestamp, 'HH:mm')}
                    {msg.sender === 'user' && <CheckCheck size={14} style={{ marginLeft: 4, color: '#53bdeb' }} />}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {events.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div className="date-separator">Sua Agenda</div>
            {events.map((event: AgendaEvent) => (
              <div key={event.id} className="agenda-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '15px' }}>{event.title}</strong>
                  <Trash2 size={14} color="#ea4335" style={{ cursor: 'pointer' }} onClick={() => setEvents((prev: AgendaEvent[]) => prev.filter((e: AgendaEvent) => e.id !== event.id))} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#667781' }}>
                  <CalendarIcon size={12} />
                  {format(event.date, "d 'de' MMMM", { locale: ptBR })}
                  <Clock size={12} style={{ marginLeft: '10px' }} />
                  {format(event.date, "HH:mm")}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={chatEndRef} />
      </main>

      <footer className="input-area">
        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '25px', padding: '10px 16px', color: '#667781', fontSize: '15px' }}>
          {isRecording ? `Gravando... ${formatTime(recordingTime)}` : 'Diga algo para agendar...'}
        </div>
        <button
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          <Mic size={24} />
        </button>
      </footer>
    </>
  );
}
