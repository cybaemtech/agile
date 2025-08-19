import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Team, User } from "@shared/schema";
import { UserPlus, UserMinus, Users } from "lucide-react";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  onMembersChange?: () => void;
}

interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: User;
}

export function TeamMembersModal({ isOpen, onClose, team, onMembersChange }: TeamMembersModalProps) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("MEMBER");

  // Fetch team members
  const { data: teamMembers = [], refetch: refetchMembers } = useQuery<TeamMember[]>({
    queryKey: [`/api/teams/${team.id}/members`],
    enabled: isOpen && !!team.id,
  });

  // Fetch all users to show available users to add
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: isOpen,
  });

  // Get users who are not already team members
  const memberUserIds = new Set(teamMembers.map(member => member.userId));
  const availableUsers = allUsers.filter(user => !memberUserIds.has(user.id));

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      return apiRequest('POST', `/api/teams/${team.id}/members`, data);
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team.id}/members`] });
      onMembersChange?.(); // Call the callback to refresh parent data
      setSelectedUserId("");
      setSelectedRole("MEMBER");
      toast({
        title: "Member added",
        description: "Team member has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add team member.",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest('DELETE', `/api/teams/${team.id}/members/${userId}`);
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team.id}/members`] });
      onMembersChange?.(); // Call the callback to refresh parent data
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member.",
        variant: "destructive",
      });
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to add.",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      userId: parseInt(selectedUserId),
      role: selectedRole,
    });
  };

  const handleRemoveMember = (userId: number) => {
    removeMemberMutation.mutate(userId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Manage Team Members - {team.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add new member section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium">Add New Member</h3>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleAddMember}
                disabled={!selectedUserId || addMemberMutation.isPending}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Current members section */}
          <div className="space-y-4">
            <h3 className="font-medium">Current Members ({teamMembers.length})</h3>
            
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No team members yet</p>
                <p className="text-sm">Add members to start collaborating</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user.avatarUrl || undefined} />
                        <AvatarFallback>
                          {member.user.fullName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.fullName}</p>
                        <p className="text-sm text-gray-500">{member.user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {member.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removeMemberMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}