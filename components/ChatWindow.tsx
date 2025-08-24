import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import LoadingIndicator from './LoadingIndicator';
import MessageComponent from './Message';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onToggleTTS: (message: Message) => void;
  isSpeaking: boolean;
  currentlySpeakingId: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onToggleTTS, isSpeaking, currentlySpeakingId }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((msg) => (
        <MessageComponent 
          key={msg.id} 
          message={msg}
          onToggleTTS={onToggleTTS}
          isSpeaking={isSpeaking && currentlySpeakingId === msg.id}
        />
      ))}
      {isLoading && messages[messages.length - 1]?.content === "" && (
        <div className="flex items-start gap-4 my-4 justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_10px_rgba(0,255,255,0.2)]">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
          </div>
          <div className="max-w-lg p-4 rounded-xl shadow-lg bg-gray-900/80 border border-cyan-500/20">
            <LoadingIndicator />
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatWindow;
