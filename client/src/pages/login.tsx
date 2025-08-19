import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LucideLogIn } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password should be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Create form with validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check if already logged in
  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include' // Include cookies for session management
        });
        const data = await response.json();
        if (data.authenticated) {
          setLocation('/projects');
        }
      } catch (error) {
        // Not authenticated or error, stay on login page
      }
    };
    
    checkAuth();
  }, [setLocation]);

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Invalidate cache to fetch fresh user data
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        toast({
          title: "Login successful",
          description: "Welcome back to the project management system."
        });
        
        // Redirect to projects page
        setLocation('/projects');
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: result.message || "Invalid email or password.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "An error occurred during login. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-tl from-gray-900 to-slate-800">
      <Card className="w-full max-w-md border-none shadow-lg bg-white/5 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-400 to-violet-500 text-transparent bg-clip-text">
            Project Management System
          </CardTitle>
          <CardDescription className="text-center text-gray-300">
            Enter your credentials to sign in
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your.email@example.com" 
                        {...field} 
                        className="bg-gray-800/60 border-gray-700 text-gray-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="bg-gray-800/60 border-gray-700 text-gray-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LucideLogIn className="mr-2 h-4 w-4" /> Sign In
                  </span>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex flex-col p-6 border-t border-gray-700/50">
          <div className="w-full text-center text-gray-400 text-sm mb-4">
            Sample accounts for testing:
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
            <div className="text-center p-2 rounded bg-gray-800/60 text-xs">
              <div className="font-bold text-blue-400 mb-1">Admin</div>
              <div className="text-gray-300">admin@example.com</div>
              <div className="text-gray-400">admin123</div>
            </div>
            
            <div className="text-center p-2 rounded bg-gray-800/60 text-xs">
              <div className="font-bold text-green-400 mb-1">Scrum Master</div>
              <div className="text-gray-300">scrum@example.com</div>
              <div className="text-gray-400">scrum123</div>
            </div>
            
            <div className="text-center p-2 rounded bg-gray-800/60 text-xs">
              <div className="font-bold text-amber-400 mb-1">User</div>
              <div className="text-gray-300">user@example.com</div>
              <div className="text-gray-400">user123</div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}