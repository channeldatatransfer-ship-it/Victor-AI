import React, { useState, useEffect } from 'react';
import { SendIcon, MicrophoneIcon } from './IconComponents';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface InputBarProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  isGameActive: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSend, isLoading, isGameActive }) => {
  const [inputValue, setInputValue] = useState('');
  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    isSupported: isSTTSupported 
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
        setInputValue(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && (!isLoading || isGameActive)) {
      stopListening();
      onSend(inputValue.trim());
      setInputValue('');
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setInputValue('');
      startListening();
    }
  };

  const getPlaceholder = () => {
    if (isGameActive) return "Game in progress. Type 'exit game' to quit.";
    if (isLoading) return "Victor is processing...";
    if (isListening) return "Listening...";
    return "Enter directive...";
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
      <div className="relative w-full">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={isLoading && !isGameActive}
          className="w-full bg-gray-900/70 border border-cyan-500/30 text-cyan-50 rounded-full py-3 pl-6 pr-28 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300 placeholder-cyan-500/40 backdrop-blur-sm"
          autoComplete="off"
        />
        <div className="flex items-center absolute right-2 top-1/2 -translate-y-1/2">
          {isSTTSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isLoading || isGameActive}
              className={`p-2.5 rounded-full transition-colors duration-300 mr-1 ${
                isListening 
                ? 'text-red-400 bg-red-900/50 animate-pulse' 
                : 'text-cyan-200 hover:bg-cyan-500/20'
              } disabled:text-gray-600 disabled:bg-transparent disabled:cursor-not-allowed`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <MicrophoneIcon />
            </button>
          )}
          <button
            type="submit"
            disabled={(isLoading || isListening || !inputValue.trim()) && !isGameActive}
            className="p-2.5 rounded-full text-cyan-200 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </form>
  );
};

export default InputBar;