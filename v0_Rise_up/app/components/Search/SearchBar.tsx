'use client';

import { useState, useEffect } from 'react';
import SearchDialog from './SearchDialog';

export default function SearchBar() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect OS
    setIsMac(navigator.platform.toLowerCase().includes('mac'));

    // Listen for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
      >
        <span>🔍</span>
        <span className="hidden sm:inline">Search...</span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5">
          {shortcut}
        </span>
      </button>

      <SearchDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
