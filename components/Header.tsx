import React from 'react';
import ThemeToggle from './ThemeToggle';
import MenuIcon from './icons/MenuIcon';

interface HeaderProps {
    onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
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

export default Header;
