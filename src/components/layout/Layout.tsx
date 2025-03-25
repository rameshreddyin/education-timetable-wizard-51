
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

type LayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

export default function Layout({ children, title, subtitle, className }: LayoutProps) {
  return (
    <div className={`flex h-screen w-full bg-background ${className}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
