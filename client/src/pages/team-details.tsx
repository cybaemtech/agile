import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Mail, Calendar, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/data-utils";

import { toast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TeamDetails() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const queryClient = useQueryClient();
  const teamId = window.location.pathname.split('/').pop();
  const teamIdNum = teamId ? parseInt(teamId) : 0;
  
  // Fetch current user
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/users/64'],
  });
  
  // Fetch teams
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });
  
  // Fetch team details
  const { data: team } = useQuery<any>({
    queryKey: ['/api/teams', teamId],
    enabled: !!teamId,
  });
  
  // Fetch projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });
  
  // Fetch users
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });
  
  // Fetch team members
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery<any[]>({
    queryKey: [`/api/teams/${teamId}/members`],
    enabled: !!teamId,
  });
  
  // Get team projects
  const teamProjects = projects.filter((project: any) => project.teamId === teamIdNum);
  
  // Function to remove a team member
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberToRemove.user.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: "Member removed",
          description: `${memberToRemove.user.email} has been removed from the team.`,
        });
        
        // Invalidate team members query to refresh the list
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
      } else {
        toast({
          title: "Error",
          description: "Failed to remove team member.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setMemberToRemove(null);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar
        user={currentUser}
        teams={teams}
        projects={projects}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center mb-6">
            <Button variant="ghost" className="mr-6 font-medium" asChild>
              <a href="/teams">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to teams
              </a>
            </Button>
            
            {team && <h1 className="text-2xl font-bold">{team.name}</h1>}
          </div>
          
          {!team ? (
            <div className="text-center py-12">
              <p>Loading team details...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Team info card */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Description</h3>
                      <p className="mt-1">{team.description || "No description provided"}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Created</h3>
                      <p className="mt-1">{formatDate(team.createdAt)}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Team Lead</h3>
                      <div className="flex items-center mt-1">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback>
                            {currentUser?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{currentUser?.fullName || 'Team Lead'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Members card */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMembers ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-neutral-500">Loading team members...</p>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-neutral-500">No team members added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {teamMembers.map((member: any) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarFallback>
                                {member.user?.fullName?.split(' ').map((n: string) => n[0]).join('') || 
                                member.user?.username?.substring(0, 2)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.user?.fullName || member.user?.username || 'Unknown User'}
                              </div>
                              <div className="text-sm text-neutral-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {member.user?.email}
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Projects card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Team Projects</CardTitle>
                  <Calendar className="h-4 w-4 text-neutral-500" />
                </CardHeader>
                <CardContent>
                  {teamProjects.length === 0 ? (
                    <p className="text-neutral-500">No projects assigned to this team</p>
                  ) : (
                    <div className="space-y-4">
                      {teamProjects.map((project: any) => (
                        <div key={project.id} className="border-b pb-3 last:border-0 last:pb-0">
                          <a 
                            href={`/projects/${project.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {project.name}
                          </a>
                          <div className="text-sm text-neutral-500 mt-1">
                            {project.key} · {project.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
      
      
      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.user?.email} from this team? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}