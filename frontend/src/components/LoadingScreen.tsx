import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

// Local logo helper component with isolated SVG gradients to prevent circular imports
export const AlgoArenaLogo = ({ className = "w-6 h-6", variant = "dark" }: { className?: string; variant?: "light" | "dark" }) => {
  const gradId = variant === "light" ? "loaderLogoGradLight" : "loaderLogoGradDark";
  const glowId = variant === "light" ? "loaderLogoGlowLight" : "loaderLogoGlowDark";
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="loaderLogoGradDark" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
          <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
        </linearGradient>
        <linearGradient id="loaderLogoGradLight" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="0.5" stopColor="hsl(var(--primary) / 0.95)" />
          <stop offset="1" stopColor="hsl(var(--primary) / 0.75)" />
        </linearGradient>
        <filter id="loaderLogoGlowDark" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" opacity="0.85" operator="over" />
        </filter>
        <filter id="loaderLogoGlowLight" x="-20%" y="-20%" width="140%" height="140%">
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

const LOGO_TEXT = "ALGOARENA";

const bootMessages = [
  "Synchronizing sandbox engine...",
  "Loading algorithmic battle graphs...",
  "Establishing peer socket clusters...",
  "Compiling test runner instances...",
  "Preparing sandbox workspace..."
];

export const LoadingScreen = ({ message }: { message?: string }) => {
  const { isDark } = useTheme();
  const [bootMsg, setBootMsg] = useState(message || bootMessages[0]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (message) {
      setBootMsg(message);
      return;
    }
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % bootMessages.length;
      setBootMsg(bootMessages[msgIdx]);
    }, 1800);

    return () => clearInterval(msgInterval);
  }, [message]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, 40);

    return () => clearInterval(progressInterval);
  }, []);

  const containerVariants: any = {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const letterVariants: any = {
    initial: { y: 0, opacity: 0.35, scale: 0.95 },
    animate: {
      y: [0, -3, 0],
      opacity: [0.35, 1, 0.35],
      scale: [0.95, 1.05, 0.95],
      transition: {
        duration: 1.4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center select-none overflow-hidden relative">
      {/* Sci-fi tech grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444405_1px,transparent_1px),linear-gradient(to_bottom,#ef444405_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Floating logo within technical spinning rings */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-8">
        {/* Orbital technical rings */}
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed border-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-t-2 border-r border-primary/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-4 rounded-full bg-primary/5 border border-primary/10"
          animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Brand Shield Logo Symbol */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 filter drop-shadow-[0_0_12px_rgba(239,68,68,0.25)]"
        >
          <AlgoArenaLogo className="w-9 h-9 text-primary" variant={isDark ? "dark" : "light"} />
        </motion.div>
      </div>

      {/* Staggered letter-by-letter Logo Type Loading text */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="flex items-center gap-1.5 mb-5 font-mono text-xl tracking-[0.25em] font-extrabold"
      >
        {LOGO_TEXT.split("").map((char, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className="text-foreground transition-all duration-300 drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]"
            style={{
              textShadow: "0 0 12px var(--primary)",
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>

      {/* Mini loading progress bar */}
      <div className="w-48 h-1 bg-secondary/30 rounded-full overflow-hidden mb-4 border border-border/10 relative">
        <motion.div
          className="absolute top-0 bottom-0 left-0 bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
          style={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut" }}
        />
      </div>

      {/* High-tech status prompt */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
          {bootMsg}
        </p>
      </div>
    </div>
  );
};
