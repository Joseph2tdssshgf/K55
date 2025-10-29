import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ThemeProvider } from './contexts/ThemeContext';
import { Message, ChatSession } from './types';
import { getJosephSirAIResponse, initializeChat, generateImageForPrompt, isApiKeySet } from './services/geminiService';
import type { Chat } from '@google/genai';
import ApiKeyModal from './components/ApiKeyModal';

const App: React.FC = () => {
    const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({});
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isApiKeyRequired, setIsApiKeyRequired] = useState<boolean>(false);
    const chatInstances = useRef<Map<string, Chat>>(new Map());

    useEffect(() => {
        if (!isApiKeySet()) {
            setIsApiKeyRequired(true);
        }
    }, []);

    const handleSaveApiKey = (key: string) => {
        sessionStorage.setItem('gemini-api-key', key);
        setIsApiKeyRequired(false);
        // Reloading the page is the simplest way to ensure all services 
        // are re-initialized with the new API key.
        window.location.reload();
    };

    const welcomeMessage: Message = {
        role: 'model',
        text: 'Hey Mawa! I am Joseph, your Physics Assistant. Ask me a physics concept or give me a problem, manam step-by-step solve cheddam!'
    };

    const getChatInstance = useCallback((chatId: string): Chat => {
        if (!chatInstances.current.has(chatId)) {
            chatInstances.current.set(chatId, initializeChat());
        }
        return chatInstances.current.get(chatId)!;
    }, []);

    const handleNewChat = useCallback(() => {
        const newId = `chat_${Date.now()}`;
        const newChat: ChatSession = {
            id: newId,
            title: 'New Chat',
            messages: [welcomeMessage]
        };
        setChatSessions(prev => ({...prev, [newId]: newChat}));
        setActiveChatId(newId);
        getChatInstance(newId); // Pre-initialize
        setSidebarOpen(false); // Close sidebar on mobile after creating new chat
    }, [getChatInstance]);

    // Load from localStorage on initial render
    useEffect(() => {
        if (isApiKeyRequired) return; // Don't load anything if the key is missing

        try {
            const savedSessions = localStorage.getItem('chatSessions');
            const savedActiveId = localStorage.getItem('activeChatId');
            if (savedSessions) {
                const parsedSessions: Record<string, ChatSession> = JSON.parse(savedSessions);
                if (Object.keys(parsedSessions).length > 0) {
                    setChatSessions(parsedSessions);
                     if (savedActiveId && parsedSessions[savedActiveId]) {
                        setActiveChatId(savedActiveId);
                    } else {
                        // Find the most recent chat to set as active
                        const mostRecentChatId = Object.keys(parsedSessions).sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]))[0];
                        setActiveChatId(mostRecentChatId);
                    }
                } else {
                     handleNewChat();
                }
            } else {
                handleNewChat(); // Create a new chat if no saved data
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage", error);
            handleNewChat();
        }
    }, [handleNewChat, isApiKeyRequired]);

    // Save to localStorage whenever sessions or activeId change
    useEffect(() => {
        try {
            if (Object.keys(chatSessions).length > 0) {
                 localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
            }
            if (activeChatId) {
                localStorage.setItem('activeChatId', activeChatId);
            }
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [chatSessions, activeChatId]);


    const handleSelectChat = useCallback((id: string) => {
        setActiveChatId(id);
        setSidebarOpen(false); // Close sidebar on mobile after selecting a chat
    }, []);

    const generateTitle = (prompt: string): string => {
        const maxLength = 30;
        if (prompt.length <= maxLength) return prompt;
        return `${prompt.substring(0, maxLength)}...`;
    }

    const handleSendMessage = useCallback(async (inputText: string) => {
        if (!inputText.trim() || isLoading || !activeChatId) return;

        const currentChat = chatSessions[activeChatId];
        if (!currentChat) return;

        const userMessage: Message = { role: 'user', text: inputText };

        const updatedMessages = [...currentChat.messages, userMessage];
        const updatedChat = { ...currentChat, messages: updatedMessages };
        
        if (currentChat.messages.length === 1) { // This is the first user message
            updatedChat.title = generateTitle(inputText);
        }
        
        setChatSessions(prev => ({ ...prev, [activeChatId]: updatedChat }));
        setIsLoading(true);

        const imageKeywords = ['draw', 'diagram', 'graph', 'image', 'picture', 'sketch', 'illustrate'];
        const lowerCaseInput = inputText.toLowerCase();
        const shouldGenerateImage = imageKeywords.some(keyword => lowerCaseInput.includes(keyword));

        try {
            let modelResponse: Message;
            const conversationHistory = updatedChat.messages;

            if (shouldGenerateImage) {
                 let imagePrompt = inputText;
                 const isFollowUpRequest = inputText.trim().split(' ').length <= 3;
                 if (isFollowUpRequest) {
                     const lastUserMessage = conversationHistory.filter(m => m.role === 'user').slice(-2, -1)[0];
                     if (lastUserMessage?.text) {
                         imagePrompt = `A diagram about the physics concept: ${lastUserMessage.text}`;
                     }
                 }
                 const { text, imageUrl } = await generateImageForPrompt(imagePrompt);
                 modelResponse = { role: 'model', text, imageUrl };
            } else {
                const chatInstance = getChatInstance(activeChatId);
                const responseText = await getJosephSirAIResponse(chatInstance, inputText);
                modelResponse = { role: 'model', text: responseText };
            }

            setChatSessions(prev => {
                const finalChat = prev[activeChatId];
                return {
                    ...prev,
                    [activeChatId]: {
                        ...finalChat,
                        messages: [...finalChat.messages, modelResponse]
                    }
                }
            });

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                role: 'model',
                text: 'Oops! Something went wrong. Konchem sepu aagi try cheyandi.'
            };
            setChatSessions(prev => {
                const finalChat = prev[activeChatId];
                return {
                    ...prev,
                    [activeChatId]: {
                        ...finalChat,
                        messages: [...finalChat.messages, errorMessage]
                    }
                }
            });
        } finally {
            setIsLoading(false);
        }

    }, [isLoading, activeChatId, chatSessions, getChatInstance]);

    const activeMessages = activeChatId ? chatSessions[activeChatId]?.messages : [];

    if (isApiKeyRequired) {
        return <ApiKeyModal onSave={handleSaveApiKey} />;
    }

    return (
        <ThemeProvider>
            <div className="flex flex-col h-screen font-sans bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
                <Header onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <div className="flex flex-1 overflow-hidden relative">
                    <Sidebar 
                        // Fix: Explicitly typed `a` and `b` as `ChatSession` to fix type inference issue.
                        chatSessions={Object.values(chatSessions).sort((a: ChatSession, b: ChatSession) => parseInt(b.id.split('_')[1]) - parseInt(a.id.split('_')[1]))}
                        activeChatId={activeChatId}
                        onNewChat={handleNewChat}
                        onSelectChat={handleSelectChat}
                        isOpen={isSidebarOpen}
                    />
                    <main className="flex-1 overflow-hidden">
                        <ChatInterface 
                            messages={activeMessages || [welcomeMessage]}
                            isLoading={isLoading}
                            onSendMessage={handleSendMessage}
                        />
                    </main>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default App;
