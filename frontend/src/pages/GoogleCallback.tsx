import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LoadingScreen } from "@/components/LoadingScreen";

const GOOGLE_OAUTH_STATE_STORAGE_KEY = "algosphere-google-oauth-state";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = window.sessionStorage.getItem(GOOGLE_OAUTH_STATE_STORAGE_KEY);
    window.sessionStorage.removeItem(GOOGLE_OAUTH_STATE_STORAGE_KEY);

    if (!code) {
      toast.error("Google sign-in failed", { description: "No authorization code received." });
      navigate("/auth", { replace: true });
      return;
    }

    if (!state || !storedState || state !== storedState) {
      toast.error("Google sign-in failed", { description: "The sign-in session expired or was invalid. Please try again." });
      navigate("/auth", { replace: true });
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;

    api
      .googleAuth(code, redirectUri)
      .then((response) => {
        setSession(response.accessToken, response.user);
        toast.success("Signed in with Google");
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        toast.error("Google sign-in failed", { description: "Could not authenticate with Google. Please try again." });
        navigate("/auth", { replace: true });
      });
  }, [searchParams, navigate, setSession]);

  return <LoadingScreen message="Authenticating with Google..." />;
};

export default GoogleCallback;
