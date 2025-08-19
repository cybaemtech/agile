import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Layers,
  Users,
  Calendar,
  BarChart,
  Settings,
  PlusCircle,
  Ship,
  LogOut,

} from "lucide-react";
import { Team, Project, User } from "@shared/schema";

interface SidebarProps {
  user?: User;
  teams?: Team[];
  projects?: Project[];
  onCreateTeam?: () => void;
  onCreateProject?: () => void;
}

export function Sidebar({
  user,
  teams = [],
  projects = [],
  onCreateTeam,
  onCreateProject,
}: SidebarProps) {
  const [location] = useLocation();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/login"; // full redirect
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="bg-white w-64 border-r border-neutral-200 flex-shrink-0 hidden md:flex flex-col h-full">
      <div className="p-4 border-b border-neutral-200 flex items-center">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white mr-3">
          <Ship className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-primary">ProjectHub</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <h2 className="text-xs uppercase font-semibold text-neutral-500 mb-2">
            Workspace
          </h2>
          <ul>
            <li className="mb-1">
              <Link href="/projects">
                <div
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-neutral-100",
                    location === "/" ||
                      location === "/projects" ||
                      location.startsWith("/projects/")
                      ? "text-primary bg-primary/10"
                      : "text-neutral-700"
                  )}
                >
                  <Layers className="h-4 w-4 mr-3" />
                  <span>Projects</span>
                </div>
              </Link>
            </li>
            <li className="mb-1">
              <Link href="/dashboard">
                <div
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-neutral-100",
                    location === "/dashboard"
                      ? "text-primary bg-primary/10"
                      : "text-neutral-700"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4 mr-3" />
                  <span>Dashboard</span>
                </div>
              </Link>
            </li>
            <li className="mb-1">
              <Link href="/teams">
                <div
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-neutral-100",
                    location === "/teams" || location.startsWith("/teams/")
                      ? "text-primary bg-primary/10"
                      : "text-neutral-700"
                  )}
                >
                  <Users className="h-4 w-4 mr-3" />
                  <span>Teams</span>
                </div>
              </Link>
            </li>
            <li className="mb-1">
              <Link href="/calendar">
                <div
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-neutral-100",
                    location === "/calendar"
                      ? "text-primary bg-primary/10"
                      : "text-neutral-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  <span>Calendar</span>
                </div>
              </Link>
            </li>
            <li className="mb-1">
              <Link href="/reports">
                <div
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-neutral-100",
                    location === "/reports"
                      ? "text-primary bg-primary/10"
                      : "text-neutral-700"
                  )}
                >
                  <BarChart className="h-4 w-4 mr-3" />
                  <span>Reports</span>
                </div>
              </Link>
            </li>
           
          </ul>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-neutral-200">
        {user && user.fullName ? (
          <div className="space-y-3">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-3">
                <AvatarImage
                  src={user.avatarUrl || undefined}
                  alt={user.fullName}
                />
                <AvatarFallback>
                  {user.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.fullName}</p>
                <p className="text-xs text-neutral-500 truncate">
                  {user.email}
                </p>
              </div>
              {/* <button className="ml-2 text-neutral-500 hover:text-neutral-700">
                <Settings className="h-4 w-4" />
              </button> */}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Register
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
