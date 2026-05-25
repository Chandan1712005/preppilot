import React from 'react';
import { Bell, Search } from 'lucide-react';
import { UserButton, useUser } from '@clerk/react';

export const Navbar = () => {
  const { user, isLoaded } = useUser();

  return (
    <header id="navbar" className="fixed top-0 left-0 right-0 h-16 bg-cyber-navy/50 backdrop-blur-xl border-bottom border-white/5 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 group cursor-pointer">
          <img 
            src="/preppilot_logo.png" 
            alt="PrepPilot Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search resources, topics, or trends..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-cyber-blue rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-white/10 cursor-pointer group">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-white group-hover:text-cyber-blue transition-colors">
              {isLoaded && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User' : 'Guest'}
            </span>
            <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Candidate</span>
          </div>
          <div className="flex items-center justify-center">
            <UserButton />
          </div>
        </div>
      </div>
    </header>
  );
};
