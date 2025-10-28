import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSave: (apiKey: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8 w-full max-w-md text-slate-900 dark:text-white">
        <h2 className="text-2xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Enter Gemini API Key</h2>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          To use this application on GitHub Pages or another static host, you need to provide your own Google Gemini API key.
        </p>
        <p className="mb-6 text-slate-600 dark:text-slate-300">
          You can get a free API key from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500 hover:underline"
          >
            Google AI Studio
          </a>.
        </p>
        <div className="mb-4">
          <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Your API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full p-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Enter your API key here"
            aria-label="Gemini API Key Input"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="w-full p-3 rounded-lg bg-cyan-500 text-white font-bold hover:bg-cyan-600 disabled:bg-slate-400 dark:disabled:bg-slate-500 transition-colors"
        >
          Save and Continue
        </button>
      </div>
    </div>
  );
};

export default ApiKeyModal;
