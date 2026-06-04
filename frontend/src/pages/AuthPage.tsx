import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Code2, Loader2, Lock, Mail, User, Workflow, Layers3, XCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getAuthErrorContent } from "@/lib/auth-errors";
import type { GlobalStatsResponse } from "@/lib/types";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_OAUTH_STATE_STORAGE_KEY = "algosphere-google-oauth-state";

const createGoogleOAuthState = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const buildGoogleOAuthUrl = () => {
  const state = createGoogleOAuthState();
  window.sessionStorage.setItem(GOOGLE_OAUTH_STATE_STORAGE_KEY, state);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const AlgoArenaLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="authLogoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
        <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
      </linearGradient>
      <filter id="authLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" stroke="url(#authLogoGrad)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.35" />
    <path d="M12 3 L20 7.5 L20 16.5 L12 21 L4 16.5 L4 7.5 Z" stroke="url(#authLogoGrad)" strokeWidth="1" strokeLinejoin="round" strokeDasharray="2 2" opacity="0.2" />
    <line x1="12" y1="6" x2="7" y2="11" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.4" />
    <line x1="12" y1="6" x2="17" y2="11" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.4" />
    <line x1="7" y1="11" x2="12" y2="16" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.4" />
    <line x1="17" y1="11" x2="12" y2="16" stroke="url(#authLogoGrad)" strokeWidth="1" opacity="0.4" />
    <line x1="12" y1="6" x2="12" y2="16" stroke="url(#authLogoGrad)" strokeWidth="1.2" opacity="0.6" />
    <path d="M12 6 L17 11 L12 16 L7 11 Z" stroke="url(#authLogoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="11" r="2.5" fill="url(#authLogoGrad)" filter="url(#authLogoGlow)" />
    <circle cx="12" cy="6" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="17" cy="11" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="12" cy="16" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="7" cy="11" r="1.2" fill="currentColor" className="text-foreground" />
  </svg>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteTopic, setFavoriteTopic] = useState("");
  const [favoritePlatform, setFavoritePlatform] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setSession } = useAuth();

  useEffect(() => {
    api.getGlobalStats().then(setStats).catch(console.error);
  }, []);

  const checkUsername = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await api.checkUsername(trimmed);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 300);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Code2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = isLogin
        ? await api.login({ identifier, password })
        : await api.register({
            email,
            password,
            username,
            displayName,
            favoriteTopic: favoriteTopic || undefined,
            favoritePlatform: favoritePlatform || undefined,
          });

      setSession(response.accessToken, response.user);
      toast.success(isLogin ? "Welcome back!" : "Account created");
      navigate("/dashboard");
    } catch (error) {
      const content = getAuthErrorContent(error, isLogin ? "login" : "register");
      toast.error(content.title, content.description ? { description: content.description } : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex select-none overflow-hidden">
      {/* Left side panel: Squad CP Pitch (Animated and Decorated) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.98),#030712)] relative before:absolute before:inset-0 before:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] before:bg-[size:40px_40px] before:pointer-events-none p-12 flex-col justify-between overflow-hidden border-r border-border/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 transition-all">
            <AlgoArenaLogo className="w-5.5 h-5.5" />
          </div>
          <span className="text-lg font-bold tracking-[0.15em] uppercase font-mono text-white">AlgoArena</span>
        </div>
        
        <div className="text-left space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            className="text-5xl font-extrabold tracking-tight text-white leading-tight font-sans"
          >
            The shared ledger of your
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
              squad&apos;s coding grind.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="text-base text-slate-400 max-w-md leading-relaxed"
          >
            Share problem links from any platform. Track what your squad is solving.
            Analyze difficulty mix, platform loyalty, and practice velocity in one place.
          </motion.p>
        </div>

        <div className="flex items-center gap-6">
          {[
            { label: "Squads created", value: stats?.groupsCreated?.toLocaleString() ?? "..." },
            { label: "Problems shared", value: stats?.problemsShared?.toLocaleString() ?? "..." },
            { label: "Active members", value: stats?.activeMembers?.toLocaleString() ?? "..." },
          ].map((stat) => (
            <div 
              key={stat.label}
              className="group/stat bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-primary/20 transition-all rounded-2xl p-4 min-w-[125px] text-left shadow-sm backdrop-blur-md"
            >
              <span className="text-2xl font-mono tabular-nums font-extrabold text-white group-hover/stat:text-primary transition-colors">{stat.value}</span>
              <span className="block text-xs text-slate-400 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side panel: Auth Card Area (Interactive Overlay Glows) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.02),transparent_60%)] relative overflow-hidden">
        {/* Soft background glow lights */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-md bg-card/40 backdrop-blur-xl border border-border/40 p-8 rounded-3xl shadow-elevated relative overflow-hidden"
        >
          {/* Top subtle golden light strip */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <AlgoArenaLogo className="w-6.5 h-6.5" />
            <span className="text-sm font-bold tracking-[0.1em] uppercase font-mono text-foreground">AlgoArena</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent text-left">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 font-sans text-left">
            {isLogin ? "Sign in with your email or username." : "Join the squad CP solving ledger."}
          </p>

          {(GOOGLE_CLIENT_ID || import.meta.env.DEV) && (
            <div className="mt-8">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-sm font-medium gap-3 bg-secondary/15 hover:bg-secondary/35 border-border/40 hover:border-primary/30 transition-all rounded-xl cursor-pointer"
                onClick={() => {
                  if (!GOOGLE_CLIENT_ID) {
                    toast.error("Google Auth Config Missing", {
                      description: "Please configure VITE_GOOGLE_CLIENT_ID in your frontend/.env file.",
                    });
                    return;
                  }
                  window.location.href = buildGoogleOAuthUrl();
                }}
              >
                <GoogleIcon />
                {GOOGLE_CLIENT_ID ? "Continue with Google" : "Continue with Google (Config Missing)"}
              </Button>
              {!GOOGLE_CLIENT_ID && (
                <p className="text-[10px] text-muted-foreground text-center mt-2 font-mono">
                  To enable Google Sign-In, set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code>.
                </p>
              )}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/20" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                  <span className="bg-background px-3 text-muted-foreground">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {!isLogin && (
              <>
                <div className="relative group/input">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Display Name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="pl-11 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all"
                    required
                  />
                </div>
                <div className="relative group/input">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      checkUsername(event.target.value);
                    }}
                    className={`pl-11 pr-10 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all ${
                      usernameStatus === "taken"
                        ? "border-red-500/50 focus-visible:ring-red-500/30"
                        : usernameStatus === "available"
                          ? "border-green-500/50 focus-visible:ring-green-500/30"
                          : ""
                    }`}
                    required
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    )}
                    {usernameStatus === "available" && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {usernameStatus === "taken" && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                {usernameStatus === "taken" && (
                  <p className="text-xs text-red-500 pl-2 font-mono">That username is already taken</p>
                )}
                <div className="relative group/input">
                  <Layers3 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Favorite Topic (Optional)"
                    value={favoriteTopic}
                    onChange={(event) => setFavoriteTopic(event.target.value)}
                    className="pl-11 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all"
                  />
                </div>
                <div className="relative group/input">
                  <Workflow className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                  <Input
                    type="text"
                    placeholder="Favorite Platform (Optional)"
                    value={favoritePlatform}
                    onChange={(event) => setFavoritePlatform(event.target.value)}
                    className="pl-11 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all"
                  />
                </div>
              </>
            )}

            {isLogin ? (
              <div className="relative group/input">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Email or username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="pl-11 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all"
                  required
                />
              </div>
            ) : (
              <div className="relative group/input">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-11 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all"
                  required
                />
              </div>
            )}

            <div className="relative group/input">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-11 pr-10 h-12 text-sm bg-secondary/10 border-border/30 focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary rounded-xl transition-all"
                minLength={isLogin ? 1 : 10}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-muted-foreground leading-normal pl-2 font-mono">Use at least 10 characters for your password.</p>
            )}

            <Button type="submit" className="w-full h-12 text-sm font-bold gap-2 mt-4 rounded-xl shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] cursor-pointer" disabled={isSubmitting}>
              {isSubmitting ? "Please wait" : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setUsernameStatus("idle"); }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer font-mono hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
