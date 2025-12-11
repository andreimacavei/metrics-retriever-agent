'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'ai-speaking';

export function VoiceFab() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceId =
    process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    const ttsHandler = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (!text) return;
      void playTts(text);
    };
    window.addEventListener('voice-tts', ttsHandler as EventListener);
    return () => window.removeEventListener('voice-tts', ttsHandler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    if (voiceState === 'listening' || voiceState === 'transcribing') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecordSeconds(0);
        setVoiceState('transcribing');

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            headers: {
              'Content-Type': blob.type || 'audio/webm'
            },
            body: blob
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Transcription failed: ${errorText}`);
          }

          const data = await response.json();
          if (data?.text) {
            window.dispatchEvent(
              new CustomEvent('voice-transcript', { detail: { text: data.text } })
            );
          }
        } catch (error) {
          console.error('Voice transcription error:', error);
        } finally {
          setVoiceState('idle');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setVoiceState('listening');
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone access denied:', error);
      setVoiceState('idle');
    }
  };

  const stopRecording = () => {
    if (voiceState !== 'listening') return;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const playTts = async (text: string) => {
    try {
      setVoiceState('ai-speaking');
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: voiceId })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setVoiceState('idle');
      };
      audioRef.current.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setVoiceState('idle');
      };
      await audioRef.current.play();
    } catch (error) {
      console.error('Voice playback error:', error);
      setVoiceState('idle');
    }
  };

  const showPanel = voiceState !== 'idle';

  return (
    <>
      <Button
        type="button"
        onClick={startRecording}
        disabled={voiceState === 'listening' || voiceState === 'transcribing'}
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-xl px-4 py-3 flex items-center gap-2"
      >
        <Mic className="w-4 h-4" />
        Speak
      </Button>

      {showPanel && (
        <div className="fixed bottom-24 right-6 z-40 w-72 rounded-xl bg-background border border-border/60 shadow-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {voiceState === 'listening'
                ? 'Listening...'
                : voiceState === 'transcribing'
                  ? 'Transcribing...'
                  : 'Voice AI'}
            </h3>
            {voiceState === 'listening' ? (
              <span className="text-xs text-muted-foreground">{formatTime(recordSeconds)}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></span>
              <span
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: '120ms' }}
              ></span>
              <span
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: '240ms' }}
              ></span>
            </div>
            <p className="text-sm text-muted-foreground">
              {voiceState === 'listening'
                ? 'Speak now. Tap stop when done.'
                : voiceState === 'transcribing'
                  ? 'Processing your audio...'
                  : 'Playing response...'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            {voiceState === 'listening' ? (
              <Button variant="destructive" size="sm" onClick={stopRecording}>
                Stop
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

