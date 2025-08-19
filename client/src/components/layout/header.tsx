import React from "react";
import { Link, useLocation } from "wouter";
import { Menu, Search, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Project } from "@shared/schema";

interface HeaderProps {
  currentProject?: Project;
  projects?: Project[];
  onMobileMenuToggle?: () => void;
}

export function Header({ 
  currentProject, 
  projects = [],
  onMobileMenuToggle 
}: HeaderProps) {
  const [location, navigate] = useLocation();
  
  const handleBackToTeams = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/teams');
  };
  
  return (
    <header className="bg-white border-b border-neutral-200 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button 
          className="md:hidden text-neutral-500"
          onClick={onMobileMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {currentProject && (
          <div className="relative">
            <div className="flex items-center text-neutral-800 font-medium bg-neutral-100 rounded-md px-4 py-2 hover:bg-neutral-200 cursor-pointer">
              <span className="truncate max-w-[160px] md:max-w-[240px]">
                {currentProject.name}
              </span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </div>
          </div>
        )}
        
        {/* {!currentProject && location.startsWith('/projects') && (
          <Link href="/projects">
            <div className="mr-6 text-neutral-900 font-medium hover:text-primary flex items-center cursor-pointer">
              <ChevronDown className="rotate-90 mr-1 h-4 w-4" />
              Back to projects
            </div>
          </Link>
        )} */}
        
        {!currentProject && location.startsWith('/teams') && (
          <div 
            className="mr-6 text-neutral-900 font-medium hover:text-primary flex items-center cursor-pointer"
            onClick={handleBackToTeams}
          >
            <ChevronDown className="rotate-90 mr-1 h-4 w-4" />
            Back to teams
          </div>
        )}
        
        {/* Main Navigation Links - Removed as requested since they're available in the sidebar */}
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="text-neutral-500 hover:text-neutral-700 p-2">
          <Search className="h-5 w-5" />
        </button>
        <button className="text-neutral-500 hover:text-neutral-700 p-2">
          <Bell className="h-5 w-5" />
        </button>
        <button className="text-neutral-500 hover:text-neutral-700 p-2">
          <HelpCircle className="h-5 w-5" />
        </button>
        
        <Avatar className="h-8 w-8 md:hidden">
          <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100" alt="User profile" />
          <AvatarFallback>AM</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
