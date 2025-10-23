import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { getJosephSirAIResponse, initializeChat, generateImageForPrompt } from '../services/geminiService';
import MessageDisplay from './MessageDisplay';
import InputBar from './InputBar';
import type { Chat } from '@google/genai';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          return parsedMessages;
        }
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
    }
    // If nothing is saved or loading fails, return the default welcome message
    return [{
      role: 'model',
      text: 'Hey Mawa! I am Joseph, your Physics Assistant. Ask me a physics concept or give me a problem, manam step-by-step solve cheddam!'
    }];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current = initializeChat();
  }, []);

  useEffect(() => {
    // Save chat history to localStorage whenever messages change
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }

    // Auto-scroll to the latest message
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isLoading) return;

    // Use the `messages` state from this render's closure for context.
    const conversationHistory = messages;

    const userMessage: Message = { role: 'user', text: inputText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const imageKeywords = ['draw', 'diagram', 'graph', 'image', 'picture', 'sketch', 'illustrate'];
    const lowerCaseInput = inputText.toLowerCase();
    const shouldGenerateImage = imageKeywords.some(keyword => lowerCaseInput.includes(keyword));

    try {
      let modelResponse: Message;

      if (shouldGenerateImage) {
        let imagePrompt = inputText;
        
        // A simple heuristic to detect a follow-up request that lacks context.
        // e.g., "draw it", "show me an image", "explain with images".
        const isFollowUpRequest = inputText.trim().split(' ').length <= 3; 

        if (isFollowUpRequest) {
          // Find the last user message in the conversation history to get the topic.
          const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
          if (lastUserMessage?.text) {
            // Construct a new, more specific prompt for the image model.
            imagePrompt = `A diagram about the physics concept: ${lastUserMessage.text}`;
          }
        }

        const { text, imageUrl } = await generateImageForPrompt(imagePrompt);
        modelResponse = { role: 'model', text, imageUrl };
      } else {
        if (!chatRef.current) {
          throw new Error("Chat not initialized");
        }
        const responseText = await getJosephSirAIResponse(chatRef.current, inputText);
        modelResponse = { role: 'model', text: responseText };
      }
      
      setMessages(prev => [...prev, modelResponse]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'model',
        text: 'Oops! Something went wrong. Konchem sepu aagi try cheyandi.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]); // Add `messages` to the dependency array to prevent stale closures

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors duration-300">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg, index) => (
          <MessageDisplay key={index} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
      <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} />
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