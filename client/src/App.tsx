import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetails from "@/pages/project-details";
import Teams from "@/pages/teams";
import TeamDetails from "@/pages/team-details";
import Calendar from "@/pages/calendar";
import Reports from "@/pages/reports";
import LoginPage from "@/pages/login";
import Register from "@/pages/register";
import { useAuth } from "./hooks/useAuth";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect "/" to "/dashboard" if authenticated, else to "/login"
  useEffect(() => {
    if (!isLoading && location === "/") {
      setLocation(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [location, setLocation, isAuthenticated, isLoading]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={Register} />

      {/* Protected routes - redirect to login if not authenticated */}
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <LoginPage />}
      </Route>
      <Route path="/projects">
        {isAuthenticated ? <Projects /> : <LoginPage />}
      </Route>
      <Route path="/projects/:id">
        {isAuthenticated ? <ProjectDetails /> : <LoginPage />}
      </Route>
      <Route path="/teams">
        {isAuthenticated ? <Teams /> : <LoginPage />}
      </Route>
      <Route path="/teams/:id">
        {isAuthenticated ? <TeamDetails /> : <LoginPage />}
      </Route>
      <Route path="/calendar">
        {isAuthenticated ? <Calendar /> : <LoginPage />}
      </Route>
      <Route path="/reports">
        {isAuthenticated ? <Reports /> : <LoginPage />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
