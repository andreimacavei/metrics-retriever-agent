'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

export function VoiceFab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    if (isRecording || isTranscribing) return;

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
        setIsRecording(false);
        setIsTranscribing(true);

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
          setIsTranscribing(false);
          setIsDialogOpen(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsDialogOpen(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone access denied:', error);
      setIsDialogOpen(false);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsDialogOpen(false);
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  };

  const closeVoiceDialog = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setIsDialogOpen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      {!isDialogOpen && (
        <Button
          type="button"
          onClick={startRecording}
          disabled={isRecording || isTranscribing}
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-xl px-4 py-3 flex items-center gap-2"
        >
          <Mic className="w-4 h-4" />
          Speak
        </Button>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl bg-background border border-border/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {isTranscribing ? 'Transcribing...' : isRecording ? 'Listening...' : 'Voice Input'}
              </h3>
              <span className="text-sm text-muted-foreground">{formatTime(recordSeconds)}</span>
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
                {isTranscribing
                  ? 'Processing your audio...'
                  : 'Speak now. Stop when you are done.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={closeVoiceDialog}
                disabled={isTranscribing}
              >
                Cancel
              </Button>
              {isRecording ? (
                <Button
                  variant="destructive"
                  onClick={stopRecording}
                  disabled={isTranscribing}
                >
                  Stop
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

