import React, { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Chat, Modality } from "@google/genai";

// --- START OF types.ts ---
interface Message {
  role: 'user' | 'model';
  text?: string;
  imageUrl?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

// --- START OF components/icons/MenuIcon.tsx ---
const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

// --- START OF components/icons/PlusIcon.tsx ---
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);


// --- START OF contexts/ThemeContext.tsx ---
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return savedTheme || (userPrefersDark ? 'dark' : 'light');
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// --- START OF components/ThemeToggle.tsx ---
const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591" />
    </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <MoonIcon className="w-6 h-6" />
      ) : (
        <SunIcon className="w-6 h-6" />
      )}
    </button>
  );
};


// --- START OF services/geminiService.ts ---
const systemInstruction = `You are a Physics Tutor AI named “Joseph Physics Assistant.”
Your job is to help students understand physics concepts and solve problems step-by-step in a simple Telugu-English mix.
You MUST always remember the last topic of conversation so you can answer follow-up questions. Forget the context only when the user types “new problem” or asks a completely unrelated question.

**Instructions:**

1.  **For Conceptual Questions (e.g., "What is Ohm's Law?"):**
    *   Provide a clear, simple explanation using the Telugu-English mix.
    *   Use real-life examples (like cycle, bus, rocket) to make it understandable.
    *   If the user asks a follow-up question like "explain in detail" or "why?", you MUST elaborate on your previous answer, providing more depth.
    *   End your explanation with an engaging question like "Arthamainda mawa?" or "Inka emaina doubt unda?".

2.  **For Numerical Problems (e.g., "A car travels 100m in 10s..."):**
    *   You MUST break the solution into small, logical steps. Do not solve the whole problem at once.
    *   Start with the given values, then the formula, then the calculation.
    *   At the end of each step, you MUST ask the user if they want to proceed, using this exact phrase: “Mawa, next step cheppala?”

3.  **General Rules:**
    *   If the user says “new problem”, you MUST forget the old context and be ready to start fresh. Acknowledge this by saying something like "Okay mawa, new problem cheppu!"
    *   Use a simple, conversational Telugu-English mix. Explain concepts in Telugu and use English for formulas.
    *   Keep your tone energetic and friendly.

**Example Conceptual Interaction:**
User: "explain ohms law"
You: "Ohm's Law ante simple mawa! Oka conductor lo current (I), voltage (V) ki directly proportional and resistance (R) ki inversely proportional untundi. Ante, voltage perigithe current perugutundi. Formula vachi: V = I × R. Just like water pipe lo pressure ekkuva unte water fast ga vastundi kada, alage! Arthamainda mawa?"
User: "explain in detail"
You: "Sure mawa! Inka detail ga ante... Ohm's Law conductors ki matrame apply avutundi, adi kuda temperature constant ga unnappudu. For example, oka bulb ki manam ekkuva voltage isthe, adi bright ga velugutundi, endukante daanilo ekkuva current pass avutundi. But, ee law semiconductors ki apply avvadu. Ippudu clear eh na?"

**Example Numerical Interaction:**
User: "A ball is thrown at 20 m/s at 30 degrees. Find max height."
You: "Got it! Projectile motion problem. Manam step-by-step solve cheddam. First, manam ఇచ్చినవి (given values) raasukundam. Initial velocity (u) = 20 m/s and angle (θ) = 30 degrees. Correct eh na? Mawa, next step cheppala?”`;

let ai: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    // In this no-build environment, process.env is attached to the window object by the host.
    const apiKey = (window as any).process?.env?.API_KEY;

    if (!apiKey) {
        throw new Error("API Key not found. Please ensure the API_KEY is configured in your execution environment.");
    }
    ai = new GoogleGenAI({ apiKey });
    return ai;
};

const initializeChat = (): Chat => {
  const aiInstance = getAIInstance();
  return aiInstance.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
  });
};

const getJosephSirAIResponse = async (chat: Chat, prompt: string): Promise<string> => {
  try {
    const result = await chat.sendMessage({ message: prompt });
    const responseText = result.text;
    
    if (!responseText && (result.candidates?.[0]?.finishReason === 'SAFETY' || result.promptFeedback?.blockReason === 'SAFETY')) {
        console.warn("Chat response blocked for safety reasons.", JSON.stringify(result.promptFeedback, null, 2));
        return "Sorry, I cannot answer that question as it might violate safety policies. Please ask something else.";
    }

    if (!responseText) {
        console.warn("Gemini API returned an empty text response.", JSON.stringify(result, null, 2));
        return "Sorry, I seem to be at a loss for words. Could you please rephrase your question?";
    }
    
    return responseText;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having a little trouble right now. Please try again in a moment.";
  }
};

const generateImageForPrompt = async (prompt: string): Promise<{ text?: string, imageUrl?: string }> => {
  const aiInstance = getAIInstance();
  try {
    const fullPrompt = `A clear, simple, educational diagram or graph for a 10th-12th grade physics student about: "${prompt}". The diagram should be easy to understand, with clear labels on a white background.`;
    const response = await aiInstance.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    const candidate = response.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.length) {
      const finishReason = candidate?.finishReason;
      const blockReason = response.promptFeedback?.blockReason;

      if (blockReason === 'SAFETY' || finishReason === 'SAFETY') {
        console.warn("Image generation blocked for safety reasons.", JSON.stringify(response.promptFeedback, null, 2));
        return { text: "Nenu ee image ni draw cheyalenu, it might be against the safety policy. Vere question adugu please." };
      }
      
      if (finishReason === 'NO_IMAGE') {
        console.warn("Image generation resulted in NO_IMAGE.", JSON.stringify(response, null, 2));
        return { text: "Sorry mawa, ee topic ki image generate cheyadam kastam ga undi. Vere la adigi chudu?" };
      }
      
      console.error("Invalid response structure from Gemini Image API:", JSON.stringify(response, null, 2));
      return { text: "Sorry, I couldn't generate an image for that. The API returned an empty or invalid response. Please try a different prompt." };
    }

    let textResponse: string | undefined;
    let imageResponse: string | undefined;

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        const base64ImageBytes: string = part.inlineData.data;
        imageResponse = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
      if (part.text) {
        textResponse = part.text;
      }
    }
    
    if (!imageResponse) {
       return { text: textResponse || "Sorry, I couldn't draw that for you right now. Try asking in a different way?" };
    }

    const finalText = textResponse ? `Chala manchi question! Here is a diagram for you:\n${textResponse}` : 'Chala manchi question! Here is a diagram for you:';
    return { text: finalText, imageUrl: imageResponse };

  } catch (error) {
    console.error("Gemini Image API error:", error);
    return { text: "Sorry, I'm having a little trouble drawing that. Please try again in a moment." };
  }
};


// --- START OF components/Header.tsx ---
const Header: React.FC<{ onToggleSidebar: () => void; }> = ({ onToggleSidebar }) => {
  return (
    <header className="bg-slate-100 dark:bg-slate-800 p-4 shadow-md z-10 relative transition-colors duration-300">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
            <button 
                onClick={onToggleSidebar} 
                className="md:hidden p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                aria-label="Toggle sidebar"
            >
                <MenuIcon className="w-6 h-6" />
            </button>
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">Joseph Physics Assistant</h1>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mt-1">Your Step-by-Step Problem Solving Mawa</p>
            </div>
        </div>
        <div className="flex items-center">
            <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

// --- START OF components/Sidebar.tsx ---
const Sidebar: React.FC<{
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  isOpen: boolean;
}> = ({ chatSessions, activeChatId, onNewChat, onSelectChat, isOpen }) => {
  return (
    <aside className={`absolute md:relative z-20 flex flex-col h-full bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 shrink-0`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors duration-300"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Chat</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2 space-y-1">
          {chatSessions.map((session) => (
            <li key={session.id}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectChat(session.id);
                }}
                className={`block w-full text-left p-2 rounded-md truncate text-sm transition-colors duration-200 ${
                  activeChatId === session.id
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                aria-current={activeChatId === session.id ? 'page' : undefined}
              >
                {session.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

// --- START OF components/MessageDisplay.tsx ---
const MessageDisplay: React.FC<{ message: Message; }> = ({ message }) => {
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

// --- START OF components/InputBar.tsx ---
const InputBar: React.FC<{
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="container mx-auto">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          className="relative flex items-end"
        >
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Emaina doubt adugu..."
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


// --- START OF components/ChatInterface.tsx ---
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

const ChatInterface: React.FC<{
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (inputText: string) => void;
}> = ({ messages, isLoading, onSendMessage }) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);
  
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


// --- START OF App.tsx ---
const App: React.FC = () => {
    const [chatSessions, setChatSessions] = useState<Record<string, ChatSession>>({});
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const chatInstances = useRef<Map<string, Chat>>(new Map());

    useEffect(() => {
        try {
            getAIInstance();
        } catch (error: any) {
            setApiKeyError(error.message);
        }
    }, []);

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
        if (apiKeyError) return;
        const newId = `chat_${Date.now()}`;
        const newChat: ChatSession = {
            id: newId,
            title: 'New Chat',
            messages: [welcomeMessage]
        };
        setChatSessions(prev => ({...prev, [newId]: newChat}));
        setActiveChatId(newId);
        getChatInstance(newId);
        setSidebarOpen(false);
    }, [getChatInstance, apiKeyError]);

    useEffect(() => {
        if (apiKeyError) return;

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
                        const mostRecentChatId = Object.keys(parsedSessions).sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]))[0];
                        setActiveChatId(mostRecentChatId);
                    }
                } else {
                     handleNewChat();
                }
            } else {
                handleNewChat();
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage", error);
            handleNewChat();
        }
    }, [handleNewChat, apiKeyError]);

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
        setSidebarOpen(false);
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
        
        if (currentChat.messages.length === 1) {
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

    if (apiKeyError) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900 text-white p-4 font-sans">
                <div className="text-center bg-slate-800 p-8 rounded-lg shadow-xl max-w-lg">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Application Error</h1>
                    <p className="text-slate-300">{apiKeyError}</p>
                    <p className="mt-4 text-slate-400 text-sm">
                        This application requires a Google Gemini API key to function. Please make sure it is provided in the environment settings.
                    </p>
                </div>
            </div>
        );
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
                        {activeChatId ? <ChatInterface 
                            messages={activeMessages || [welcomeMessage]}
                            isLoading={isLoading}
                            onSendMessage={handleSendMessage}
                        /> : <div className="flex h-full items-center justify-center text-slate-500">Select a chat or start a new one.</div>
                        }
                    </main>
                </div>
            </div>
        </ThemeProvider>
    );
};


// --- FINAL RENDER ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);