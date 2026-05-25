import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquareCode, FileText, Globe, Settings, LucideIcon, Edit3, Briefcase } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

const NavItem = ({ to, icon: Icon, label }: NavItemProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group",
        isActive 
          ? "bg-cyber-accent/20 text-cyber-blue shadow-[0_0_15px_rgba(34,211,238,0.1)] border-l-2 border-cyber-blue" 
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
      )
    }
  >
    <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
    <span className="font-medium tracking-wide">{label}</span>
  </NavLink>
);

export const Sidebar = () => {
  return (
    <aside id="sidebar" className="fixed left-0 top-0 h-screen w-64 bg-cyber-navy/80 backdrop-blur-md border-r border-white/5 z-40 flex flex-col pt-20">
      <nav className="flex-1 px-4 space-y-2">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/interview" icon={MessageSquareCode} label="AI Interview" />
        <NavItem to="/resume" icon={FileText} label="Resume Analysis" />
        <NavItem to="/research" icon={Globe} label="Research Hub" />
        <NavItem to="/cv-maker" icon={Edit3} label="CV Maker" />
        <NavItem to="/job-search" icon={Briefcase} label="Job Search" />
      </nav>
      
      <div className="p-4 border-t border-white/5">
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  );
};
