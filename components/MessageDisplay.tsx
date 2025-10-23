import React from 'react';
import { Message } from '../types';

interface MessageDisplayProps {
  message: Message;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  const { role, text, imageUrl } = message;
  const isUser = role === 'user';

  const containerClasses = isUser ? 'flex justify-end' : 'flex justify-start';
  const bubbleClasses = isUser
    ? 'bg-cyan-500 dark:bg-cyan-600 text-white rounded-lg rounded-br-none'
    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg rounded-bl-none';

  return (
    <div className={containerClasses}>
      <div
        className={`p-3 max-w-lg lg:max-w-xl xl:max-w-2xl inline-block shadow-md transition-colors duration-300 ${bubbleClasses}`}
      >
        {text && <p className="whitespace-pre-wrap">{text}</p>}
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt="Generated diagram" 
            className={`rounded-md ${text ? 'mt-3' : ''} max-w-full h-auto bg-white p-1`} 
            aria-label="AI generated image based on the prompt"
          />
        )}
      </div>
    </div>
  );
};

export default MessageDisplay;
