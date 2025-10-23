import React from 'react';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen font-sans bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
        <Header />
        <main className="flex-1 overflow-hidden">
          <ChatInterface />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;
