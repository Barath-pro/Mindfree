import { useEffect, useRef, useState } from "react";

export default function VoiceRecorder({ disabled, onSendVoice, onError, onStatusChange }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const previewUrlRef = useRef("");
  const [recording, setRecording] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sendingPreview, setSendingPreview] = useState(false);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    onStatusChange?.("Preparing preview...");
  };

  const resetPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    setPreviewBlob(null);
    setPreviewUrl("");
    setSendingPreview(false);
    onStatusChange?.("");
  };

  const sendPreview = async () => {
    if (!previewBlob) {
      return;
    }

    try {
      setSendingPreview(true);
      onStatusChange?.("Sending voice message...");
      await onSendVoice?.(previewBlob);
      resetPreview();
    } catch (_error) {
      onError?.("Unable to send voice message.");
      setSendingPreview(false);
      onStatusChange?.("");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      mediaRecorder.addEventListener("stop", async () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (blob.size === 0) {
          onError?.("No audio was captured. Please try again.");
          return;
        }

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }

        const nextPreviewUrl = URL.createObjectURL(blob);
        previewUrlRef.current = nextPreviewUrl;
        setPreviewBlob(blob);
        setPreviewUrl(nextPreviewUrl);
        onStatusChange?.("Preview your voice message before sending.");
      });

      mediaRecorder.start();
      setRecording(true);
      onStatusChange?.("Recording voice message... press again to send.");
    } catch (_error) {
      onError?.("Microphone access failed. Please allow microphone access and try again.");
    }
  };

  if (previewBlob && previewUrl) {
    return (
      <div className="voice-preview">
        <div className="voice-preview__header">
          <strong>Voice preview</strong>
          <span>Listen before sending</span>
        </div>
        <audio controls src={previewUrl} />
        <div className="voice-preview__actions">
          <button className="secondary-button" type="button" onClick={resetPreview} disabled={sendingPreview}>
            Delete
          </button>
          <button className="primary-button" type="button" onClick={sendPreview} disabled={disabled || sendingPreview}>
            {sendingPreview ? "Sending..." : "Send voice"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-recorder ${recording ? "is-recording" : ""}`}>
      <button
        className={`secondary-button ${recording ? "is-recording" : ""}`}
        type="button"
        disabled={disabled}
        onClick={recording ? stopRecording : startRecording}
      >
        {recording ? "Stop recording" : "Voice message"}
      </button>
      {recording ? (
        <div className="voice-recorder__live" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}
