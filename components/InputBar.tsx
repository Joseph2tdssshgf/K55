import React, { useState, KeyboardEvent, useRef } from 'react';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height after sending
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="container mx-auto">
        <form 
          onSubmit={(e) => { 
            e.preventDefault(); 
            handleSend(); 
          }} 
          className="relative flex items-end"
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Naku emaina doubt adugu..."
            className="w-full p-3 pr-16 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 resize-none overflow-y-auto"
            rows={1}
            disabled={isLoading}
            style={{ maxHeight: '150px' }}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="absolute right-3 bottom-2.5 p-2 rounded-full bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default InputBar;
