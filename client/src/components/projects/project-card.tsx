import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Layers, Users, CalendarDays } from "lucide-react";
import { Project, Team, User } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  creator?: User;
  team?: Team;
  stats?: {
    epics: number;
    features: number;
    stories: number;
    tasks: number;
    bugs: number;
  };
}

export function ProjectCard({ 
  project, 
  creator, 
  team,
  stats = { epics: 0, features: 0, stories: 0, tasks: 0, bugs: 0 }
}: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-amber-100 text-amber-800 border-amber-200";
      case "COMPLETED": return "bg-green-100 text-green-800 border-green-200";
      case "ARCHIVED": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
          
          {team && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Users className="h-3 w-3 mr-1" />
              {team.name}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg font-semibold mt-2">{project.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {project.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex justify-between text-sm text-neutral-600 mb-4">
          <div className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            {formatDate(new Date(project.createdAt))}
          </div>
          
          {creator && (
            <div className="flex items-center">
              <span className="mr-1">Created by:</span>
              <Avatar className="h-5 w-5 mr-1">
                <AvatarImage src={creator.avatarUrl || undefined} alt={creator.fullName} />
                <AvatarFallback className="text-xs">
                  {creator.fullName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span>{creator.fullName}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="flex flex-col items-center p-2 bg-blue-50 rounded-md">
            <span className="font-semibold text-blue-700">{stats.epics}</span>
            <span className="text-neutral-600">Epics</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-purple-50 rounded-md">
            <span className="font-semibold text-purple-700">{stats.features}</span>
            <span className="text-neutral-600">Features</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-indigo-50 rounded-md">
            <span className="font-semibold text-indigo-700">{stats.stories}</span>
            <span className="text-neutral-600">Stories</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-green-50 rounded-md">
            <span className="font-semibold text-green-700">{stats.tasks}</span>
            <span className="text-neutral-600">Tasks</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-red-50 rounded-md">
            <span className="font-semibold text-red-700">{stats.bugs}</span>
            <span className="text-neutral-600">Bugs</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        <Link href={`/projects/${project.id}`}>
          <Button variant="default" className="w-full">
            <Layers className="h-4 w-4 mr-2" />
            View Project
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
