import { useQuery } from "@tanstack/react-query";
import { User } from "../../../shared/schema";

export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Not authenticated");
      }

      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  });

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
  };
}
