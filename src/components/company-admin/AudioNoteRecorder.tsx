import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Download,
  Volume2,
  VolumeX,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import {
  auditTrailService,
  AudioVoiceNote,
} from "../../services/SuperAdmin/auditTrailService";
import { audioAlertService } from "../../services/audioAlertService";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

interface AudioNoteRecorderProps {
  jobCardId: string;
  jobCardNumber: string;
  onNoteAdded?: () => void;
}

export const AudioNoteRecorder: React.FC<AudioNoteRecorderProps> = ({
  jobCardId,
  jobCardNumber,
  onNoteAdded,
}) => {
  const [notes, setNotes] = useState<AudioVoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [noteTitle, setNoteTitle] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Audio Playback states for the list
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [totalPlaybackDuration, setTotalPlaybackDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing voice notes
  const loadVoiceNotes = () => {
    const data = auditTrailService.getVoiceNotesForJobCard(jobCardId);
    setNotes(data);
  };

  useEffect(() => {
    loadVoiceNotes();
    const unsubscribe = auditTrailService.subscribe(() => {
      loadVoiceNotes();
    });
    return () => {
      unsubscribe();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [jobCardId]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Start Recording
  const startRecording = async () => {
    setPermissionError(null);
    try {
      audioAlertService.playTone("MIC_START");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setPreviewAudioUrl(base64data);
          setPreviewDuration(recordingSeconds);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setPermissionError(
        "Microphone access was denied or not supported by browser. Please enable mic permissions."
      );
      showErrorToast("Could not access microphone.");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioAlertService.playTone("MIC_STOP");
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Cancel / Discard Recording
  const discardRecording = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    setPreviewAudioUrl(null);
    setPreviewDuration(0);
    setNoteTitle("");
    setRecordingSeconds(0);
  };

  // Save Voice Note
  const saveVoiceNote = () => {
    if (!previewAudioUrl) return;

    const title = noteTitle.trim() || `Field Audio Note #${notes.length + 1}`;
    auditTrailService.addVoiceNote(jobCardId, jobCardNumber, {
      title,
      audioUrl: previewAudioUrl,
      durationSeconds: previewDuration || recordingSeconds || 1,
      fileSizeFormatted: `${formatTime(previewDuration || recordingSeconds)}`,
    });

    audioAlertService.playTone("SUCCESS");
    showSuccessToast("Voice note attached to Job Card!");

    discardRecording();
    loadVoiceNotes();
    if (onNoteAdded) onNoteAdded();
  };

  // Play / Pause note from the list
  const togglePlayNote = (note: AudioVoiceNote) => {
    if (playingNoteId === note.id && activeAudioRef.current) {
      if (!activeAudioRef.current.paused) {
        activeAudioRef.current.pause();
        setPlayingNoteId(null);
      } else {
        activeAudioRef.current.play();
        setPlayingNoteId(note.id);
      }
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(note.audioUrl);
    activeAudioRef.current = audio;
    setPlayingNoteId(note.id);

    audio.ontimeupdate = () => {
      setCurrentPlaybackTime(audio.currentTime);
      setTotalPlaybackDuration(audio.duration || note.durationSeconds);
    };

    audio.onended = () => {
      setPlayingNoteId(null);
      setCurrentPlaybackTime(0);
    };

    audio.onerror = () => {
      showErrorToast("Could not playback audio note.");
      setPlayingNoteId(null);
    };

    audio.play().catch((e) => console.warn("Audio play error:", e));
  };

  // Delete Voice Note
  const handleDeleteNote = (noteId: string) => {
    if (playingNoteId === noteId && activeAudioRef.current) {
      activeAudioRef.current.pause();
      setPlayingNoteId(null);
    }
    auditTrailService.deleteVoiceNote(noteId);
    showSuccessToast("Voice note deleted.");
    loadVoiceNotes();
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-purple-900/20 via-indigo-900/10 to-blue-900/20 border border-purple-200/50 p-4 dark:border-purple-800/40">
        <div>
          <h4 className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
            <Mic size={16} className="text-purple-600 dark:text-purple-400" />
            Field Voice Notes & Acoustic Diagnostics
          </h4>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Record on-site voice remarks, machine acoustic noises, and technician briefings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            {notes.length} {notes.length === 1 ? "Audio Note" : "Audio Notes"}
          </span>
        </div>
      </div>

      {permissionError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900/50">
          <AlertCircle size={15} className="shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* RECORDER SECTION */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!isRecording && !previewAudioUrl && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                <Mic size={22} />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Record New Field Audio Note
                </h5>
                <p className="text-[11px] text-slate-400">
                  Click below to begin capturing audio with your microphone.
                </p>
              </div>
            </div>

            <button
              onClick={startRecording}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-700 active:scale-95"
            >
              <Mic size={16} />
              Start Recording
            </button>
          </div>
        )}

        {/* ACTIVE RECORDING STATE */}
        {isRecording && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/40">
                <Mic size={22} className="animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-600"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-red-600 animate-pulse">
                    Recording Live Audio...
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                    {formatTime(recordingSeconds)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Speak clearly into your microphone to record technician notes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={discardRecording}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95"
              >
                <Square size={14} />
                Stop & Preview
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW & SAVE STATE */}
        {previewAudioUrl && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={15} /> Audio Captured ({formatTime(previewDuration || recordingSeconds)})
              </span>
              <button
                onClick={discardRecording}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
              >
                <RotateCcw size={13} /> Re-record
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Note Title / Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cylinder #3 Pressure Noise / Field Remark"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-col justify-end">
                <audio controls src={previewAudioUrl} className="w-full h-10 rounded-lg" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={discardRecording}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Discard
              </button>
              <button
                onClick={saveVoiceNote}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
              >
                Save to Job Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SAVED VOICE NOTES LIST */}
      <div className="space-y-3">
        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-400">
          Recorded Field Notes ({notes.length})
        </h5>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <Mic size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No audio notes recorded for this work order yet.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Technicians and supervisors can record live voice briefings using the button above.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((note) => {
              const isPlaying = playingNoteId === note.id;
              return (
                <div
                  key={note.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                    isPlaying
                      ? "border-purple-300 bg-purple-50/60 dark:border-purple-700/60 dark:bg-purple-950/20"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePlayNote(note)}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        isPlaying
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                          : "bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-900/40"
                      }`}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {note.title}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {formatTime(note.durationSeconds)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User size={11} /> {note.recordedBy.name} ({note.recordedBy.role || "Technician"})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={note.audioUrl}
                      download={`${note.title.replace(/\s+/g, "_")}.webm`}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Download audio recording"
                    >
                      <Download size={15} />
                    </a>

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Delete voice note"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
