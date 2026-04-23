"use client";

import { MicrophoneIcon, StopIcon } from "@heroicons/react/24/solid";

interface MicRecorderProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  error: string | null;
}

export const MicRecorder = ({ isListening, onStart, onStop, error }: MicRecorderProps) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        className={`btn btn-circle btn-lg w-20 h-20 transition-all duration-300 ${
          isListening
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse-green shadow-lg shadow-red-500/30"
            : "bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/30"
        }`}
        onClick={isListening ? onStop : onStart}
      >
        {isListening ? (
          <StopIcon className="h-8 w-8" />
        ) : (
          <MicrophoneIcon className="h-8 w-8" />
        )}
      </button>

      <span className="text-sm text-base-content/50">
        {isListening ? "Dinleniyor... Durdurmak icin basin" : "Konusmaya baslamak icin basin"}
      </span>

      {error && (
        <div className="alert alert-error text-sm max-w-md">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
