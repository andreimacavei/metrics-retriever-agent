'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { useReportContext } from '@/components/report-context';

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'ai-speaking' | 'processing';

export function VoiceFab() {
  const { reportId, components } = useReportContext();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSpaceHeldRef = useRef(false);
  const voiceId =
    process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

  // Push-to-talk: Hold spacebar to record, release to send
  useEffect(() => {
    const isInputElement = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger on spacebar, not when typing in inputs
      if (e.code !== 'Space' || isInputElement(e.target)) return;
      
      // Prevent repeat events from held key
      if (isSpaceHeldRef.current) return;
      
      // Don't trigger if already processing
      if (voiceState !== 'idle') return;
      
      e.preventDefault();
      isSpaceHeldRef.current = true;
      startRecording();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      
      if (isSpaceHeldRef.current) {
        e.preventDefault();
        isSpaceHeldRef.current = false;
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [voiceState]);

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

  // Handle voice transcript for report modifications
  useEffect(() => {
    if (!reportId || !components || components.length === 0) return;

    const transcriptHandler = async (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (!text) return;

      setVoiceState('processing');

      try {
        // Call modify-report API
        const response = await fetch('/api/modify-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            prompt: text,
            components
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to modify report');
        }

        const actionData = await response.json();

        // Apply the modification to components
        let updatedComponents = [...components];
        const componentIndex = actionData.componentIndex;

        if (actionData.action === 'rename' && actionData.newTitle) {
          updatedComponents[componentIndex] = {
            ...updatedComponents[componentIndex],
            title: actionData.newTitle
          };
        } else if (actionData.action === 'resize' && actionData.newSize) {
          updatedComponents[componentIndex] = {
            ...updatedComponents[componentIndex],
            layout: {
              ...updatedComponents[componentIndex].layout,
              w: actionData.newSize.w,
              h: actionData.newSize.h,
              x: updatedComponents[componentIndex].layout?.x ?? 0,
              y: updatedComponents[componentIndex].layout?.y ?? 0
            }
          };
        } else if (actionData.action === 'move' && actionData.direction) {
          const currentIndex = componentIndex;
          const newIndex = actionData.direction === 'up' 
            ? Math.max(0, currentIndex - 1)
            : Math.min(updatedComponents.length - 1, currentIndex + 1);
          
          if (currentIndex !== newIndex) {
            const [movedComponent] = updatedComponents.splice(currentIndex, 1);
            updatedComponents.splice(newIndex, 0, movedComponent);
          }
        }

        // Dispatch event with updated components
        window.dispatchEvent(
          new CustomEvent('report-modified', {
            detail: {
              reportId,
              components: updatedComponents,
              action: actionData.action,
              message: actionData.message
            }
          })
        );

        // Play confirmation
        const confirmText = actionData.message || `Successfully ${actionData.action}d component`;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('voice-tts', { detail: { text: confirmText } })
          );
        }
      } catch (error) {
        console.error('Error modifying report:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to modify report';
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('voice-tts', { detail: { text: `Error: ${errorMessage}` } })
          );
        }
      } finally {
        setVoiceState('idle');
      }
    };

    window.addEventListener('voice-transcript', transcriptHandler as EventListener);
    return () => window.removeEventListener('voice-transcript', transcriptHandler as EventListener);
  }, [reportId, components]);

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
        title="Hold Spacebar to speak"
      >
        <Mic className="w-4 h-4" />
        <span className="hidden sm:inline">Speak</span>
        <kbd className="hidden sm:inline ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-primary-foreground/20 rounded">Space</kbd>
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
                ? 'Speak now. Release Space or tap Stop.'
                : voiceState === 'transcribing'
                  ? 'Processing your audio...'
                  : voiceState === 'processing'
                    ? 'Modifying dashboard...'
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

