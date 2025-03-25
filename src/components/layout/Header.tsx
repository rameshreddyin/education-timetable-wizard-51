
import { Bell, MessageSquare, Search, User } from 'lucide-react';
import React from 'react';

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background">
      <div>
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-9 pr-4 py-2 bg-secondary rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>
        
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
        </button>
        
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
          <MessageSquare className="w-5 h-5 text-foreground" />
        </button>
        
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors">
          <User className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>
  );
}
