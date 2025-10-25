import React, { useRef, useEffect } from 'react';
import { Message } from '../types.ts';
import MessageDisplay from './MessageDisplay.tsx';
import InputBar from './InputBar.tsx';

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (inputText: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading, onSendMessage }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const hasStartedChat = messages.length > 1;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors duration-300">
        {!hasStartedChat && (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                <div className="w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">How can I help you today, mawa?</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Ask me anything about physics!</p>
            </div>
        )}
      <div ref={chatContainerRef} className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 ${!hasStartedChat ? 'hidden' : ''}`}>
        {messages.map((msg, index) => (
          <MessageDisplay key={index} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
      <InputBar onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="bg-slate-200 dark:bg-slate-700 rounded-lg rounded-bl-none p-3 max-w-lg inline-block">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
      </div>
    </div>
  </div>
);

export default ChatInterface;