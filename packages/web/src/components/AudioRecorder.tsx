import { useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import { AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  active: boolean;
  onChunk: (base64: string) => void;
}

export function AudioRecorder({ active, onChunk }: AudioRecorderProps) {
  const { isRecording, error, startRecording, stopRecording } = useAudio({
    onChunk,
  });

  useEffect(() => {
    if (active && !isRecording) {
      startRecording();
    } else if (!active && isRecording) {
      stopRecording();
    }
  }, [active, isRecording, startRecording, stopRecording]);

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mx-4">
        <AlertCircle size={16} className="text-danger shrink-0" />
        <p className="text-xs text-danger">{error}</p>
      </div>
    );
  }

  return null;
}
