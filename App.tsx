import React, { useState, useEffect, useRef, createContext, useContext, PropsWithChildren } from 'react';
// FIX: Import `GenerateContentResponse`, `Chat`, `FunctionDeclaration` and `Type` for function calling.
import { GoogleGenAI, GenerateContentResponse, Chat, FunctionDeclaration, Type } from "@google/genai";

// This is a browser-based app, so we can access window.
declare global {
  interface Window {
    process: {
      env: {
        API_KEY: string;
      }
    }
  }
}

// --- TYPES ---
type Message = {
  id: number;
  text: string | React.ReactElement;
  sender: 'user' | 'model';
};

type ChatSession = {
  id: number;
  title: string;
  messages: Message[];
};

type Theme = 'dark' | 'light';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

// --- GEMINI SERVICE ---
const API_KEY = window.process?.env?.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
}

// FIX: Updated system instruction to use function calling instead of placeholder text.
const systemInstruction = `You are Joseph Sir AI, a friendly and energetic physics and science teacher.
- Your personality is enthusiastic, encouraging, and a little bit quirky.
- You explain complex concepts in a simple, relatable way using a mix of Telugu and English (Tanglish).
- Use real-life examples and analogies to make learning fun and memorable.
- Start conversations with a friendly greeting like "Hey mawa!" or "Hi dude!".
- Keep your responses conversational and engaging.
- When a user asks for an image, diagram, drawing, or any kind of visual explanation, you MUST use the 'generate_image' tool. Do not attempt to describe the image in text. Call the tool with a clear, descriptive prompt summary for the image generation model.
- If a user asks for something that is not related to physics, science, or generating an image, politely steer the conversation back to those topics.`;

// NEW: Define the function declaration for the image generation tool.
const generateImageFunctionDeclaration: FunctionDeclaration = {
  name: 'generate_image',
  description: 'Generates an image or diagram based on a user\'s request. Use this when the user asks for a visual explanation, drawing, diagram, or image.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt_summary: {
        type: Type.STRING,
        description: 'A concise, descriptive prompt for an image generation model, summarizing the user\'s request. For example, "A simple diagram of Ohm\'s law showing voltage, current, and resistance in a circuit."'
      },
    },
    required: ['prompt_summary'],
  },
};


async function generateImageForPrompt(prompt: string): Promise<string> {
    if (!ai) return "API Key not configured.";
    try {
        const imageModel = 'imagen-4.0-generate-001';
        const response = await ai.models.generateImages({
            model: imageModel,
            prompt: `A clear, educational diagram explaining the physics concept of: ${prompt}. Style: simple, clean, colorful, with clear labels.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            return "Sorry, I couldn't generate an image for that. Please try a different prompt.";
        }
    } catch (error) {
        console.error("Error generating image:", error);
        return "Sorry, I'm having a little trouble drawing that. Please try again in a moment.";
    }
}

// --- THEME CONTEXT ---
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// FIX: Use PropsWithChildren to fix the TypeScript error where 'children' was reported as missing.
const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    document.documentElement.classList.remove(theme === 'dark' ? 'light' : 'dark');
    document.documentElement.classList.add(theme);
    document.body.className = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// --- ICONS ---
const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);


// --- COMPONENTS ---

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-colors">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
};

const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
    return (
        <header className="bg-slate-800 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2 rounded-md hover:bg-slate-700">
                    <MenuIcon />
                </button>
                <h1 className="text-xl font-bold">Joseph Sir AI</h1>
            </div>
            <ThemeToggle />
        </header>
    );
};

const Sidebar = ({
    chatSessions,
    activeChatId,
    onNewChat,
    onSelectChat,
    isOpen,
    onClose,
}: {
    chatSessions: ChatSession[];
    activeChatId: number;
    onNewChat: () => void;
    onSelectChat: (id: number) => void;
    isOpen: boolean;
    onClose: () => void;
}) => {
    return (
        <>
            <aside className={`bg-slate-800 text-white w-64 p-4 flex flex-col space-y-4 absolute md:relative inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-20`}>
                <button onClick={onNewChat} className="flex items-center justify-center gap-2 w-full p-2 rounded-md bg-sky-600 hover:bg-sky-500 font-semibold transition-colors">
                    <PlusIcon />
                    New Chat
                </button>
                <nav className="flex-grow overflow-y-auto">
                    <ul>
                        {chatSessions.sort((a: ChatSession, b: ChatSession) => b.id - a.id).map(session => (
                            <li key={session.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); onSelectChat(session.id); onClose(); }}
                                   className={`block p-2 rounded-md truncate ${activeChatId === session.id ? 'bg-slate-700' : 'hover:bg-slate-700'}`}>
                                    {session.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/50 z-10 md:hidden"></div>}
        </>
    );
};

const MessageDisplay = ({ messages }: { messages: Message[] }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-grow p-4 space-y-4 overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`p-3 rounded-lg max-w-lg ${msg.sender === 'user' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-white'}`}>
            {typeof msg.text === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
            ) : (
                msg.text
            )}
          </div>
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};


const InputBar = ({ onSendMessage, isLoading }: { onSendMessage: (input: string) => void, isLoading: boolean }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="p-4 bg-slate-800 border-t border-slate-700">
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isLoading ? "Generating response..." : "Emaina doubt adugu..."}
          disabled={isLoading}
          className="w-full p-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Chat input"
        />
        <button type="submit" disabled={isLoading} className="p-3 rounded-full bg-sky-600 text-white hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
};


const ChatInterface = ({
    activeChat,
    onSendMessage,
    isLoading
}: {
    activeChat: ChatSession | undefined;
    onSendMessage: (input: string) => void;
    isLoading: boolean;
}) => {
    if (!activeChat) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <h2 className="text-2xl font-semibold">Start a new chat</h2>
                <p>Select a chat or start a new one to begin.</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col h-full bg-slate-900">
            <MessageDisplay messages={activeChat.messages} />
            {isLoading && <div className="px-4 pb-2 text-slate-400 text-center">Joseph Sir is thinking...</div>}
            <InputBar onSendMessage={onSendMessage} isLoading={isLoading} />
        </div>
    );
};

// --- MAIN APP COMPONENT ---
function App() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
        const savedChats = localStorage.getItem('chatSessions');
        if (savedChats) {
          return JSON.parse(savedChats);
        }
    } catch (e) {
        console.error("Could not parse chat sessions from localStorage", e);
    }
    return [{
        id: Date.now(),
        title: "Introduction",
        messages: [{
            id: 1,
            text: "Hey mawa! Joseph Physics Assistant ni! మళ్ళీ వచ్చావా? Physics లో ఏం help కావాలి? ఏ doubt ఉన్నా అడుగు, simple గా తెలుగు-ఇంగ్లీష్ మిక్స్ లో explain చేస్తా! 😉",
            sender: 'model'
        }]
    }];
  });

  const [activeChatId, setActiveChatId] = useState<number>(() => chatSessions.length > 0 ? chatSessions.sort((a,b) => b.id - a.id)[0].id : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
  }, [chatSessions]);

  const activeChat = chatSessions.find(session => session.id === activeChatId);

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now(),
      title: "New Chat",
      messages: [{
            id: 1,
            text: "Hey dude! New chat ready. What physics concept can I break down for you today?",
            sender: 'model'
        }]
    };
    setChatSessions(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const handleSelectChat = (id: number) => {
    setActiveChatId(id);
  };
  
  const addMessageToChat = (chatId: number, message: Message) => {
      setChatSessions(prevSessions => {
          return prevSessions.map(session => {
              if (session.id === chatId) {
                  const updatedMessages = [...session.messages, message];
                  
                  const firstUserMessage = updatedMessages.find(m => m.sender === 'user');
                  let newTitle = session.title;
                  if (session.title === "New Chat" && firstUserMessage && typeof firstUserMessage.text === 'string') {
                      newTitle = firstUserMessage.text.substring(0, 30);
                  }

                  return { ...session, messages: updatedMessages, title: newTitle };
              }
              return session;
          });
      });
  };

  // REFACTORED: `handleSendMessage` to use Function Calling
  const handleSendMessage = async (input: string) => {
    if (!activeChat || !ai) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    addMessageToChat(activeChat.id, userMessage);
    setIsLoading(true);

    try {
        const chatHistory = activeChat.messages
            .filter(msg => typeof msg.text === 'string')
            .map(msg => ({
                role: msg.sender,
                parts: [{ text: msg.text as string }]
            }));
        
        const contents = [...chatHistory, { role: 'user', parts: [{ text: input }] }];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: [generateImageFunctionDeclaration] }],
            },
        });
        
        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            if (fc.name === 'generate_image') {
                const imagePrompt = fc.args.prompt_summary;

                const thinkingMessage: Message = {
                    id: Date.now() + 1,
                    text: `Okay, let me draw a diagram for "${imagePrompt}"...`,
                    sender: 'model'
                };
                addMessageToChat(activeChat.id, thinkingMessage);

                const imageUrl = await generateImageForPrompt(imagePrompt);

                let imageMessage: Message;
                if (imageUrl.startsWith("data:image")) {
                    imageMessage = {
                        id: Date.now() + 2,
                        text: <img src={imageUrl} alt={imagePrompt} className="rounded-lg" />,
                        sender: 'model'
                    };
                } else {
                    imageMessage = {
                        id: Date.now() + 2,
                        text: imageUrl, // This will be the error message
                        sender: 'model'
                    };
                }
                addMessageToChat(activeChat.id, imageMessage);
            }
        } else {
            const modelMessage: Message = { id: Date.now() + 1, text: response.text, sender: 'model' };
            addMessageToChat(activeChat.id, modelMessage);
        }

    } catch (error) {
        console.error("Error during message generation:", error);
        const errorMessage: Message = {
            id: Date.now() + 1,
            text: "Sorry, something went wrong on my end. Please try again.",
            sender: 'model'
        };
        addMessageToChat(activeChat.id, errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  if (!API_KEY) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl border border-red-500/50 max-w-md text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Application Error</h2>
            <p className="text-slate-300 mb-2">API Key not found. Please ensure the API_KEY is configured in your `index.html` file.</p>
            <p className="text-slate-400 text-sm">This application requires a Google Gemini API key to function. Please make sure it is provided in the environment settings.</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen font-sans bg-slate-900 text-white">
        <Sidebar 
            chatSessions={chatSessions} 
            activeChatId={activeChatId}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex flex-col flex-grow">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-grow overflow-hidden">
             <ChatInterface 
                activeChat={activeChat}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
             />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;