import React from 'react';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-100 dark:bg-slate-800 p-4 shadow-md z-10 relative transition-colors duration-300">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">Joseph Physics Assistant</h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">Your Step-by-Step Problem Solving Mawa</p>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;