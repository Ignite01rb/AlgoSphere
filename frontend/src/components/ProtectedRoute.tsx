import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { LoadingScreen } from "@/components/LoadingScreen";

export const AlgoArenaLogo = ({ className = "w-6 h-6", variant = "dark" }: { className?: string; variant?: "light" | "dark" }) => {
  const gradId = variant === "light" ? "routeLogoGradLight" : "routeLogoGradDark";
  const glowId = variant === "light" ? "routeLogoGlowLight" : "routeLogoGlowDark";
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="routeLogoGradDark" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
          <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
        </linearGradient>
        <linearGradient id="routeLogoGradLight" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="0.5" stopColor="hsl(var(--primary) / 0.95)" />
          <stop offset="1" stopColor="hsl(var(--primary) / 0.75)" />
        </linearGradient>
        <filter id="routeLogoGlowDark" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" opacity="0.85" operator="over" />
        </filter>
        <filter id="routeLogoGlowLight" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.0" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" opacity="0.65" operator="over" />
        </filter>
      </defs>
      
      {/* Triangular Team Network Graph (Crest) */}
      <path d="M8 7 L12 4 L16 7 Z" stroke={`url(#${gradId})`} strokeWidth="1.0" strokeLinejoin="round" opacity="0.4" />
      <circle cx="12" cy="4" r="1.5" fill={`url(#${gradId})`} filter={`url(#${glowId})`} />
      <circle cx="8" cy="7" r="1.5" fill={`url(#${gradId})`} />
      <circle cx="16" cy="7" r="1.5" fill={`url(#${gradId})`} />
      
      {/* Crossed Swords (Clashing slashes) */}
      <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="14.5" x2="9.5" y2="16" stroke={`url(#${gradId})`} strokeWidth="1.2" />
      
      <line x1="15.5" y1="15.5" x2="8.5" y2="8.5" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="14.5" x2="14.5" y2="16" stroke={`url(#${gradId})`} strokeWidth="1.2" />

      {/* Interlocking Code Brackets (Shield sides) */}
      <path d="M7.2 8 C6.2 8, 5.5 8.8, 5.5 9.8 L5.5 11.2 C5.5 11.8, 4.8 12.1, 4.3 12.5 C4.8 12.9, 5.5 13.2, 5.5 13.8 L5.5 15.2 C5.5 16.2, 6.2 17, 7.2 17" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <path d="M16.8 8 C17.8 8, 18.5 8.8, 18.5 9.8 L18.5 11.2 C18.5 11.8, 19.2 12.1, 19.7 12.5 C19.2 12.9, 18.5 13.2, 18.5 13.8 L18.5 15.2 C18.5 16.2, 17.8 17, 16.8 17" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      
      {/* Bottom Code Lines / Battle Ground */}
      <line x1="10" y1="19" x2="14" y2="19" stroke={`url(#${gradId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="21" x2="15" y2="21" stroke={`url(#${gradId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
      <line x1="11" y1="23" x2="13" y2="23" stroke={`url(#${gradId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
};

export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { isDark } = useTheme();

  if (isLoading) {
    return <LoadingScreen message="Synchronizing Workspace..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
