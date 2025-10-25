import React from 'react';
import { ChatSession } from '../types';
import PlusIcon from './icons/PlusIcon';

interface SidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ chatSessions, activeChatId, onNewChat, onSelectChat, isOpen }) => {
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

export default Sidebar;
