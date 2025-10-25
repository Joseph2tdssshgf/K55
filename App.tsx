import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInterface from './components/ChatInterface.tsx';
import Header from './components/Header.tsx';
import Sidebar from './components/Sidebar.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { Message, ChatSession } from './types.ts';
import { getJosephSirAIResponse, initializeChat, generateImageForPrompt } from './services/geminiService.ts';
import * as chatHistoryService from './services/chatHistoryService.ts';
import type { Chat } from '@google/genai';

// Conditionally enable history manipulation to prevent errors in sandboxed environments
const canManipulateHistory = window.location.protocol !== 'blob:';

const App: React.FC = () => {
    const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({});
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isAppLoading, setIsAppLoading] = useState(true);
    const chatInstances = useRef<Map<string, Chat>>(new Map());

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

    const handleNewChat = useCallback(async () => {
        const newId = `chat_${Date.now()}`;
        const newChat: ChatSession = {
            id: newId,
            title: 'New Chat',
            messages: [welcomeMessage]
        };
        
        setChatSessions(prev => ({...prev, [newId]: newChat}));
        await chatHistoryService.saveChatSession(newChat);

        setActiveChatId(newId);
        await chatHistoryService.setActiveChatId(newId);
        if (canManipulateHistory) {
            window.history.pushState({ chatId: newId }, '', `#/chat/${newId}`);
        }

        getChatInstance(newId);
        setSidebarOpen(false);
    }, [getChatInstance, welcomeMessage]);


    // Load from URL/storage on initial render
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const savedSessions = await chatHistoryService.getAllChatSessions();

                if (Object.keys(savedSessions).length === 0) {
                    // First ever session. Create one.
                    const newId = `chat_${Date.now()}`;
                    const newChat: ChatSession = {
                        id: newId,
                        title: 'New Chat',
                        messages: [welcomeMessage]
                    };
                    setChatSessions({ [newId]: newChat });
                    setActiveChatId(newId);
                    await chatHistoryService.saveChatSession(newChat);
                    await chatHistoryService.setActiveChatId(newId);
                    if (canManipulateHistory) {
                        window.history.replaceState({ chatId: newId }, '', `#/chat/${newId}`);
                    }
                    setIsAppLoading(false);
                    return;
                }

                setChatSessions(savedSessions);
                
                const path = window.location.hash;
                const match = path.match(/#\/chat\/(chat_\d+)/);
                let idToActivate: string | null = null;

                if (match && canManipulateHistory) {
                    const chatIdFromUrl = match[1];
                    if (savedSessions[chatIdFromUrl]) {
                        idToActivate = chatIdFromUrl;
                    }
                } 
                
                if (!idToActivate) {
                    const savedActiveId = await chatHistoryService.getActiveChatId();
                    if (savedActiveId && savedSessions[savedActiveId]) {
                        idToActivate = savedActiveId;
                    } else {
                        idToActivate = Object.keys(savedSessions).sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]))[0];
                    }
                }

                if (idToActivate) {
                    setActiveChatId(idToActivate);
                    await chatHistoryService.setActiveChatId(idToActivate);
                    if (canManipulateHistory) {
                        window.history.replaceState({ chatId: idToActivate }, '', `#/chat/${idToActivate}`);
                    }
                }
                
            } catch (error) {
                console.error("Failed to load chat history", error);
                // Fallback to a new session if loading fails
                const newId = `chat_${Date.now()}`;
                const newChat: ChatSession = { id: newId, title: 'New Chat', messages: [welcomeMessage] };
                setChatSessions({ [newId]: newChat });
                setActiveChatId(newId);
                await chatHistoryService.saveChatSession(newChat).catch(e => console.error("Failed to save initial chat", e));
                if (canManipulateHistory) {
                    window.history.replaceState({ chatId: newId }, '', `#/chat/${newId}`);
                }
            } finally {
                setIsAppLoading(false);
            }
        };

        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const path = window.location.hash;
            const match = path.match(/#\/chat\/(chat_\d+)/);
            if (match) {
                const chatIdFromUrl = match[1];
                if (chatSessions[chatIdFromUrl]) {
                    setActiveChatId(chatIdFromUrl);
                }
            }
        };

        if (canManipulateHistory) {
            window.addEventListener('popstate', handlePopState);
        }
        return () => {
            if (canManipulateHistory) {
                window.removeEventListener('popstate', handlePopState);
            }
        };
    }, [chatSessions]);


    const handleSelectChat = useCallback(async (id: string) => {
        if (activeChatId === id) {
            setSidebarOpen(false);
            return;
        }
        setActiveChatId(id);
        await chatHistoryService.setActiveChatId(id);
        if (canManipulateHistory) {
            window.history.pushState({ chatId: id }, '', `#/chat/${id}`);
        }
        setSidebarOpen(false);
    }, [activeChatId]);

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

        let updatedChatWithUserMessage = {
            ...currentChat,
            messages: [...currentChat.messages, userMessage]
        };
        
        if (currentChat.messages.length === 1) { // This is the first user message
            updatedChatWithUserMessage.title = generateTitle(inputText);
        }
        
        setChatSessions(prev => ({ ...prev, [activeChatId]: updatedChatWithUserMessage }));
        await chatHistoryService.saveChatSession(updatedChatWithUserMessage);

        setIsLoading(true);

        const imageKeywords = ['draw', 'diagram', 'graph', 'image', 'picture', 'sketch', 'illustrate'];
        const lowerCaseInput = inputText.toLowerCase();
        const shouldGenerateImage = imageKeywords.some(keyword => lowerCaseInput.includes(keyword));

        try {
            let modelResponse: Message;
            const conversationHistory = updatedChatWithUserMessage.messages;

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

            const finalChat = { ...updatedChatWithUserMessage, messages: [...updatedChatWithUserMessage.messages, modelResponse]};
            setChatSessions(prev => ({ ...prev, [activeChatId]: finalChat }));
            await chatHistoryService.saveChatSession(finalChat);

        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                role: 'model',
                text: 'Oops! Something went wrong. Konchem sepu aagi try cheyandi.'
            };
            const finalChat = { ...updatedChatWithUserMessage, messages: [...updatedChatWithUserMessage.messages, errorMessage]};
            setChatSessions(prev => ({ ...prev, [activeChatId]: finalChat }));
            await chatHistoryService.saveChatSession(finalChat);
        } finally {
            setIsLoading(false);
        }

    }, [isLoading, activeChatId, chatSessions, getChatInstance]);

    const activeMessages = activeChatId ? chatSessions[activeChatId]?.messages : [];

    if (isAppLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-900">
                <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-cyan-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h2 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-200">Loading your chats...</h2>
                </div>
            </div>
        )
    }

    return (
        <ThemeProvider>
            <div className="flex flex-col h-screen font-sans bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
                <Header onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <div className="flex flex-1 overflow-hidden relative">
                    <Sidebar 
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