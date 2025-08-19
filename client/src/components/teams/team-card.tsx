import { useState } from "react";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamMembersModal } from "@/components/modals/team-members-modal";
import { Users, CalendarDays, Settings } from "lucide-react";
import { Team, User } from "@shared/schema";

interface TeamCardProps {
  team: Team;
  creator?: User;
  members?: User[];
  projectCount?: number;
  onMembersChange?: () => void;
}

export function TeamCard({ 
  team, 
  creator,
  members = [], 
  projectCount = 0,
  onMembersChange
}: TeamCardProps) {
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Display up to 5 members, with a "+X more" indicator if needed
  const displayMembers = members.slice(0, 5);
  const additionalMembers = Math.max(0, members.length - 5);

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
            {team.name.split(' ').map(word => word[0]).join('').substring(0, 2)}
          </div>
          
          <Badge variant="outline" className="bg-blue-50 text-blue-700 flex items-center flex-shrink-0 text-xs">
            <Users className="h-3 w-3 mr-1" />
            {members.length} {members.length === 1 ? 'Member' : 'Members'}
          </Badge>
        </div>
        <CardTitle className="text-lg font-semibold">{team.name}</CardTitle>
        <CardDescription className="line-clamp-1 text-sm">
          {team.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2">
        <div className="flex justify-between items-center text-xs text-neutral-600 mb-3">
          <div className="flex items-center">
            <CalendarDays className="h-3 w-3 mr-1 flex-shrink-0" />
            <span>{formatDate(new Date(team.createdAt))}</span>
          </div>
          
          {creator && (
            <div className="flex items-center min-w-0">
              <span className="mr-1 text-xs">By:</span>
              <Avatar className="h-4 w-4 mr-1 flex-shrink-0">
                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.fullName} />
                <AvatarFallback className="text-xs">
                  {creator.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs">{creator.fullName}</span>
            </div>
          )}
        </div>
        
        <div className="border-t border-neutral-200 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <span className="text-xs text-neutral-500 block mb-1">Members</span>
              <div className="flex flex-wrap gap-1">
                {displayMembers.slice(0, 3).map((member, index) => (
                  <Avatar key={index} className="h-5 w-5 border border-white">
                    <AvatarImage 
                      src={member.avatarUrl || undefined} 
                      alt={member.fullName} 
                    />
                    <AvatarFallback className="text-xs font-medium">
                      {member.fullName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                
                {members.length > 3 && (
                  <div className="h-5 w-5 rounded-full bg-neutral-100 border border-white flex items-center justify-center text-xs font-medium text-neutral-600">
                    +{members.length - 3}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center">
              <span className="text-xs text-neutral-500 block">Projects</span>
              <p className="text-xl font-semibold text-primary">{projectCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex gap-2 mt-auto">
        <Link href={`/teams/${team.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Users className="h-3 w-3 mr-1" />
            View
          </Button>
        </Link>
        
        <Button 
          variant="default" 
          size="sm"
          className="flex-1"
          onClick={() => setShowMembersModal(true)}
        >
          <Settings className="h-3 w-3 mr-1" />
          Manage
        </Button>
      </CardFooter>

      {/* Team Members Modal */}
      <TeamMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        team={team}
        onMembersChange={onMembersChange}
      />
    </Card>
  );
}
