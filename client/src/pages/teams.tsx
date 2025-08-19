import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { TeamCard } from "@/components/teams/team-card";
import { CreateTeam } from "@/components/teams/create-team";
import { InviteModal } from "@/components/modals/invite-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal";
import { useToast } from "@/hooks/use-toast";
import { Users, PlusCircle, Search, UserPlus } from "lucide-react";
import { Team, User } from "@shared/schema";

// TeamCardWithMembers component that fetches its own member data
function TeamCardWithMembers({ 
  team, 
  creator, 
  projectCount 
}: { 
  team: Team; 
  creator?: User; 
  projectCount: number; 
}) {
  // Fetch team members for this specific team
  const { data: teamMembersData = [], refetch } = useQuery<any[]>({
    queryKey: [`/api/teams/${team.id}/members`],
    enabled: !!team.id,
    refetchInterval: false, // Don't auto-refetch
    refetchOnWindowFocus: false, // Don't refetch on focus
  });

  // Extract user objects from team members data
  const teamMembers = teamMembersData.map(member => member.user).filter(Boolean);

  return (
    <TeamCard
      team={team}
      creator={creator}
      members={teamMembers}
      projectCount={projectCount}
      onMembersChange={refetch} // Pass refetch function to refresh data
    />
  );
}

export default function Teams() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { 
    modalType, 
    isOpen, 
    openModal, 
    closeModal 
  } = useModal();
  
  // Fetch current user
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/users/64'], // Using user 64 which exists in the system
  });
  
  // Fetch teams
  const { data: teams = [], refetch: refetchTeams } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });
  
  // Fetch projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });
  
  // Fetch all users
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Create a helper function to get team member count
  const getTeamMemberCount = (teamId: number) => {
    // This will be replaced with actual API calls, but for now return a consistent count
    return 0;
  };
  
  const handleTeamCreated = async (team: any) => {
    refetchTeams();
    toast({
      title: "Success",
      description: "Team created successfully",
    });
    return team;
  };
  
  // Filter teams based on search query
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={currentUser}
        teams={teams}
        projects={projects}
        onCreateTeam={() => openModal("createTeam")}
        onCreateProject={() => openModal("createProject")}
      />
      
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-10">
        <Button
          className="rounded-full shadow-lg p-3 h-12 w-12"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Users className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold mb-1">Teams</h1>
                <p className="text-neutral-600">Manage your teams and team members</p>
              </div>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    className="pl-9 w-[240px]"
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={() => openModal("inviteMembers")}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
                <Button onClick={() => openModal("createTeam")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Team
                </Button>
              </div>
            </div>
            
            {/* Teams grid */}
            {filteredTeams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No teams found</h3>
                <p className="text-neutral-500 mb-4">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Create your first team to start collaborating"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => openModal("createTeam")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map(team => {
                  const creator = users.find(user => user.id === team.createdBy);
                  const teamProjects = projects.filter(project => project.teamId === team.id);
                  
                  return (
                    <TeamCardWithMembers
                      key={team.id}
                      team={team}
                      creator={creator}
                      projectCount={teamProjects.length}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      <CreateTeam
        isOpen={isOpen && modalType === "createTeam"}
        onClose={closeModal}
        onSuccess={handleTeamCreated}
        userId={currentUser?.id || 1}
      />
      
      <InviteModal
        isOpen={isOpen && modalType === "inviteMembers"}
        onClose={closeModal}
        teams={teams}
        onCreateTeam={handleTeamCreated}
      />
    </div>
  );
}
