
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  Home,
  LayoutGrid,
  Settings,
  Users,
  UserRound,
  Mail,
  BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
};

const NavItem = ({ to, icon, label, isActive }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 w-full',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    )}
  >
    <div className="w-5 h-5 flex items-center justify-center">
      {icon}
    </div>
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6">
    <div className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
      {title}
    </div>
    <div className="space-y-1">{children}</div>
  </div>
);

export default function Sidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="bg-sidebar w-64 h-screen flex flex-col border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-2">
        <BookOpen className="w-8 h-8 text-sidebar-foreground" strokeWidth={1.5} />
        <h1 className="text-xl font-semibold text-sidebar-foreground">EduManager</h1>
      </div>
      
      <div className="p-4 flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
          <UserRound className="w-5 h-5 text-sidebar-foreground" />
        </div>
        <div>
          <div className="text-sidebar-foreground font-medium">Super Admin</div>
          <div className="text-sidebar-foreground/60 text-xs">Super Admin</div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavSection title="Main">
          <NavItem to="/" icon={<Home size={18} />} label="Dashboard" isActive={currentPath === '/'} />
          <NavItem 
            to="/timetable-wizard" 
            icon={<LayoutGrid size={18} />} 
            label="Timetable Wizard" 
            isActive={currentPath.includes('/timetable-wizard')} 
          />
          <NavItem 
            to="/leads" 
            icon={<Users size={18} />} 
            label="Leads & Enrollments" 
            isActive={currentPath === '/leads'} 
          />
          <NavItem 
            to="/students" 
            icon={<Users size={18} />} 
            label="Students" 
            isActive={currentPath === '/students'} 
          />
          <NavItem 
            to="/staff" 
            icon={<UserRound size={18} />} 
            label="Staff" 
            isActive={currentPath === '/staff'} 
          />
        </NavSection>
        
        <NavSection title="Academic">
          <NavItem 
            to="/classes" 
            icon={<ClipboardList size={18} />} 
            label="Classes" 
            isActive={currentPath === '/classes'} 
          />
          <NavItem 
            to="/subjects" 
            icon={<BookOpen size={18} />} 
            label="Subjects" 
            isActive={currentPath === '/subjects'} 
          />
          <NavItem 
            to="/course-management" 
            icon={<BookOpen size={18} />} 
            label="Course Management" 
            isActive={currentPath === '/course-management'} 
          />
          <NavItem 
            to="/attendance" 
            icon={<Calendar size={18} />} 
            label="Attendance" 
            isActive={currentPath === '/attendance'} 
          />
        </NavSection>
        
        <NavSection title="Administration">
          <NavItem 
            to="/finance" 
            icon={<BarChart3 size={18} />} 
            label="Finance" 
            isActive={currentPath === '/finance'} 
          />
          <NavItem 
            to="/events" 
            icon={<Calendar size={18} />} 
            label="Events" 
            isActive={currentPath === '/events'} 
          />
          <NavItem 
            to="/messages" 
            icon={<Mail size={18} />} 
            label="Messages" 
            isActive={currentPath === '/messages'} 
          />
          <NavItem 
            to="/settings" 
            icon={<Settings size={18} />} 
            label="Settings" 
            isActive={currentPath === '/settings'} 
          />
        </NavSection>
      </div>
    </div>
  );
}
