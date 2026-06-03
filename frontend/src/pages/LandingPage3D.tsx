import React, { Component, ReactNode, Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Code2, Eye, FlaskConical, BookOpen, Award, Network, Zap, LayoutGrid, Sun, Moon, Sliders } from "lucide-react";
import { Link } from "react-router-dom";
import * as THREE from "three";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";

export const AlgoSphereLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="landingLogoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
        <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
      </linearGradient>
      <filter id="landingLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#landingLogoGrad)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.3" />
    <path d="M12 2C16 5.5 16 18.5 12 22" stroke="url(#landingLogoGrad)" strokeWidth="1" opacity="0.4" />
    <path d="M12 2C8 5.5 8 18.5 12 22" stroke="url(#landingLogoGrad)" strokeWidth="1" opacity="0.4" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="url(#landingLogoGrad)" strokeWidth="1" opacity="0.4" />
    <path d="M12 7 L17 12 L12 17 L7 12 Z" stroke="url(#landingLogoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 2 L12 22" stroke="url(#landingLogoGrad)" strokeWidth="1" />
    <circle cx="12" cy="12" r="2.5" fill="url(#landingLogoGrad)" filter="url(#landingLogoGlow)" />
    <circle cx="12" cy="7" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="17" cy="12" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="12" cy="17" r="1.2" fill="currentColor" className="text-foreground" />
    <circle cx="7" cy="12" r="1.2" fill="currentColor" className="text-foreground" />
  </svg>
);

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WebGL error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Stunning 3D particle sphere globe with interactive cursor-parallax and color variations
function ParticleGlobe({ isDark, speed, colorTheme }: { isDark: boolean; speed: number; colorTheme: "amber" | "emerald" | "rose" }) {
  const pointsRef = useRef<THREE.Points>(null);

  const pointsCount = 1200;
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(pointsCount * 3);
    const cols = new Float32Array(pointsCount * 3);
    
    let baseColorStr = "#f59e0b"; // amber
    let secondaryColorStr = "#f43f5e"; // rose
    let tertiaryColorStr = "#f97316"; // orange
    
    if (colorTheme === "emerald") {
      baseColorStr = isDark ? "#10b981" : "#065f46"; 
      secondaryColorStr = isDark ? "#3b82f6" : "#1e3a8a"; 
      tertiaryColorStr = isDark ? "#06b6d4" : "#155e75"; 
    } else if (colorTheme === "rose") {
      baseColorStr = isDark ? "#f43f5e" : "#9f1239"; 
      secondaryColorStr = isDark ? "#a855f7" : "#581c87"; 
      tertiaryColorStr = isDark ? "#ec4899" : "#831843"; 
    } else { // amber
      baseColorStr = isDark ? "#f59e0b" : "#78350f"; 
      secondaryColorStr = isDark ? "#f43f5e" : "#9d174d"; 
      tertiaryColorStr = isDark ? "#f97316" : "#9a3412"; 
    }

    const color1 = new THREE.Color(baseColorStr);
    const color2 = new THREE.Color(secondaryColorStr);
    const color3 = new THREE.Color(tertiaryColorStr);

    for (let i = 0; i < pointsCount; i++) {
      const theta = Math.acos(1 - 2 * (i / pointsCount));
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const r = 2.1 + Math.random() * 0.12; 
      pos[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      pos[i * 3 + 2] = r * Math.cos(theta);

      const mixRatio = (pos[i * 3 + 1] + 2.2) / 4.4;
      const c = new THREE.Color().copy(color1).lerp(mixRatio > 0.5 ? color2 : color3, Math.min(Math.max(mixRatio, 0), 1));
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    return [pos, cols];
  }, [isDark, colorTheme]);

  // Track cursor pointer to create smooth 3D tilt interaction
  useFrame((state) => {
    if (pointsRef.current) {
      const targetY = state.clock.getElapsedTime() * 0.09 * speed + state.pointer.x * 0.45;
      const targetX = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.1 + state.pointer.y * -0.45;

      pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, targetY, 0.05);
      pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetX, 0.05);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={isDark ? 0.80 : 0.55}
        sizeAttenuation={true}
      />
    </points>
  );
}

// Spinning wireframe core (Geometric Core) that complements stardust globe
function GeometricCore({ isDark, speed, colorTheme, show }: { isDark: boolean; speed: number; colorTheme: "amber" | "emerald" | "rose"; show: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = -state.clock.getElapsedTime() * 0.14 * speed;
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.07 * speed;
    }
  });

  if (!show) return null;

  let wireColor = isDark ? "#f59e0b" : "#78350f";
  if (colorTheme === "emerald") wireColor = isDark ? "#10b981" : "#065f46";
  if (colorTheme === "rose") wireColor = isDark ? "#f43f5e" : "#9f1239";

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.25, 1]} />
      <meshBasicMaterial 
        color={wireColor} 
        wireframe 
        transparent 
        opacity={isDark ? 0.18 : 0.28} 
      />
    </mesh>
  );
}

function Scene({ isDark, speed, colorTheme, showWireframe }: { isDark: boolean; speed: number; colorTheme: "amber" | "emerald" | "rose"; showWireframe: boolean }) {
  let sparkColor = isDark ? "#f97316" : "#78350f";
  if (colorTheme === "emerald") sparkColor = isDark ? "#10b981" : "#065f46";
  if (colorTheme === "rose") sparkColor = isDark ? "#f43f5e" : "#9f1239";

  return (
    <>
      <ambientLight intensity={isDark ? 0.3 : 0.5} />
      <pointLight position={[10, 10, 10]} intensity={isDark ? 1.6 : 2.0} color={sparkColor} />
      <pointLight position={[-10, -10, -10]} intensity={isDark ? 1.2 : 1.4} color={isDark ? "#f43f5e" : "#9d174d"} />
      <ParticleGlobe isDark={isDark} speed={speed} colorTheme={colorTheme} />
      <GeometricCore isDark={isDark} speed={speed} colorTheme={colorTheme} show={showWireframe} />
      <Sparkles count={isDark ? 30 : 15} scale={6} size={2.2} speed={0.2 * speed} opacity={isDark ? 0.4 : 0.28} color={sparkColor} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.2 * speed} />
    </>
  );
}

// Premium Bento Grid Widgets
function SolverFeedWidget() {
  const [items, setItems] = useState([
    { id: 1, user: "alex", problem: "Two Sum", platform: "LeetCode", diff: "Easy", time: "Just now" },
    { id: 2, user: "maya", problem: "Frog 1", platform: "AtCoder", diff: "Medium", time: "8m ago" },
    { id: 3, user: "joe", problem: "Watermelon", platform: "Codeforces", diff: "Easy", time: "24m ago" },
    { id: 4, user: "kim", problem: "Number of Islands", platform: "LeetCode", diff: "Medium", time: "1h ago" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setItems((prev) => {
        const next = [...prev];
        const last = next.pop()!;
        last.time = "Just now";
        next.forEach((item) => {
          if (item.time === "Just now") item.time = "1m ago";
          else if (item.time.endsWith("m ago")) {
            const min = parseInt(item.time) + 3;
            item.time = `${min}m ago`;
          }
        });
        return [last, ...next];
      });
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full justify-between text-left">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <span className="text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 font-mono">Live Squad feed</span>
        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
      </div>
      <div className="space-y-2 mt-3 flex-1 overflow-hidden">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 dark:bg-slate-900/30 border border-border/30 dark:border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">@{item.user}</span>
              <span className="text-muted-foreground font-medium">solved</span>
              <span className="text-amber-700 dark:text-amber-300 font-semibold truncate max-w-[120px]">{item.problem}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                item.diff === "Easy" ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
              }`}>{item.diff}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemDesignFlowWidget() {
  return (
    <div className="flex flex-col h-full justify-between text-left">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <span className="text-xs uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400 font-mono">Scaling architecture</span>
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="relative flex flex-col gap-2 mt-4 items-center justify-center flex-1 py-1 font-mono text-[9px] text-muted-foreground">
        <div className="px-2.5 py-1 bg-white dark:bg-slate-950 border border-border/60 dark:border-white/10 rounded text-foreground font-bold relative shadow-sm">
          Client
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[1px] h-2 bg-gradient-to-b from-primary to-transparent animate-pulse"></div>
        </div>
        
        <div className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-500/20 rounded mt-1.5 text-amber-700 dark:text-amber-300">
          Weighted LB
        </div>
        
        <div className="flex items-center gap-6 mt-1 relative">
          <div className="px-2 py-0.5 bg-white dark:bg-slate-950 border border-border/40 dark:border-white/5 rounded shadow-sm">Web A</div>
          <div className="px-2 py-0.5 bg-white dark:bg-slate-950 border border-border/40 dark:border-white/5 rounded shadow-sm">Web B</div>
        </div>

        <div className="px-2.5 py-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-500/20 rounded mt-2 text-rose-700 dark:text-rose-300 font-medium">
          Redis Cache
        </div>
      </div>
    </div>
  );
}

function SortingTerminal() {
  const [array, setArray] = useState<number[]>([]);
  const [sorting, setSorting] = useState(false);
  const [currentIndexes, setCurrentIndexes] = useState<number[]>([]);
  const [comparisons, setComparisons] = useState(0);
  const [swaps, setSwaps] = useState(0);

  const resetArray = () => {
    const newArray = Array.from({ length: 8 }, () => Math.floor(Math.random() * 55) + 12);
    setArray(newArray);
    setCurrentIndexes([]);
    setComparisons(0);
    setSwaps(0);
  };

  useEffect(() => {
    resetArray();
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const bubbleSort = async () => {
    if (sorting) return;
    setSorting(true);
    const arr = [...array];
    const n = arr.length;
    let comp = 0;
    let swp = 0;

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        setCurrentIndexes([j, j + 1]);
        comp++;
        setComparisons(comp);
        await sleep(250);

        if (arr[j] > arr[j + 1]) {
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          swp++;
          setSwaps(swp);
          setArray([...arr]);
          await sleep(250);
        }
      }
    }
    setCurrentIndexes([]);
    setSorting(false);
  };

  return (
    <div className="flex flex-col h-full bg-white/70 dark:bg-slate-950/70 border border-border/50 dark:border-white/5 rounded-2xl p-5 justify-between shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85"></span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground ml-1.5">BubbleSort.tsx</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={resetArray} 
            disabled={sorting} 
            className="p-1 px-2 text-[10px] font-mono bg-secondary hover:bg-secondary/80 border border-border/50 dark:border-white/5 rounded text-foreground disabled:opacity-40 transition-colors cursor-pointer"
          >
            Shuffle
          </button>
          <button 
            onClick={bubbleSort} 
            disabled={sorting} 
            className="p-1 px-2.5 text-[10px] font-mono bg-primary hover:bg-primary/95 rounded text-white disabled:opacity-40 font-bold transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            Run Visualizer
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between h-28 px-3 py-2 mt-4 bg-secondary/35 dark:bg-slate-900/40 rounded-xl">
        {array.map((value, idx) => {
          const isComparing = currentIndexes.includes(idx);
          return (
            <motion.div
              key={idx}
              layout
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-[8%] flex flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isComparing
                    ? "bg-gradient-to-t from-pink-500 to-orange-400 shadow-md shadow-pink-500/20 scale-105"
                    : "bg-gradient-to-t from-primary to-amber-500 dark:to-violet-400"
                }`}
                style={{ height: `${value}px` }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mt-4 border-t border-border/40 dark:border-white/5 pt-2.5">
        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" /> State hooks:</span>
        <div className="flex gap-3">
          <span>comps: <strong className="text-foreground font-medium">{comparisons}</strong></span>
          <span>swaps: <strong className="text-rose-500 font-medium">{swaps}</strong></span>
        </div>
      </div>
    </div>
  );
}

function PlatformsWidget() {
  return (
    <div className="flex flex-col h-full justify-between text-left">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <span className="text-xs uppercase tracking-wider font-semibold text-primary font-mono">Connected arenas</span>
        <Network className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3.5 flex-1">
        {["LeetCode", "Codeforces", "AtCoder", "CodeChef", "HackerRank", "GFG"].map((plat) => (
          <div key={plat} className="flex flex-col items-center justify-center p-2 rounded-lg bg-secondary/50 dark:bg-slate-905/30 border border-border/30 dark:border-white/5 text-[10px] font-medium text-foreground/80 hover:border-border/60 dark:hover:border-white/10 hover:bg-slate-900/10 dark:hover:bg-slate-900/20 transition-all">
            <span className="font-mono text-foreground opacity-85">{plat}</span>
            <span className="text-[8px] text-green-600 dark:text-green-500 font-mono mt-0.5">● Connected</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage3D() {
  const { isAuthenticated, token } = useAuth();
  const isLoggedIn = isAuthenticated || Boolean(token);
  const { isDark, toggle: toggleTheme } = useTheme();

  // 3D Engine States
  const [showWireframe, setShowWireframe] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [colorTheme, setColorTheme] = useState<"amber" | "emerald" | "rose">("amber");
  const [isCalibratorOpen, setIsCalibratorOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-y-auto overflow-x-hidden transition-colors duration-300 selection:bg-primary/20">
      {/* High tech grid background pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(230,126,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(230,126,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#2a1d12_1px,transparent_1px),linear-gradient(to_bottom,#2a1d12_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_at_center,black_75%,transparent_100%)] opacity-70 dark:opacity-35 font-mono"></div>

      {/* Radial glows */}
      <div className="absolute top-[10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[60%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background/75 backdrop-blur-xl border-b border-border/40 dark:border-white/5 transition-all duration-300">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3.5">
            <AlgoSphereLogo className="w-7 h-7" />
            <span className="text-sm font-bold tracking-[0.15em] uppercase text-foreground font-mono">
              AlgoSphere
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono tracking-wider uppercase text-muted-foreground">
            <button onClick={() => scrollToSection("bento-features")} className="hover:text-foreground transition-colors cursor-pointer">Workspace</button>
            <button onClick={() => scrollToSection("terminal-widget")} className="hover:text-foreground transition-colors cursor-pointer">Visual Engine</button>
            <button onClick={() => scrollToSection("cta")} className="hover:text-foreground transition-colors cursor-pointer">Register</button>
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-secondary/50 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer" onClick={toggleTheme}>
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </Button>

            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button className="bg-primary/10 dark:bg-[#18112c] hover:bg-primary/20 dark:hover:bg-[#20173a] text-primary dark:text-amber-200 border border-primary/30 shadow-sm font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer">
                  Workspace Console &rarr;
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 text-xs h-9 px-3.5 rounded-lg cursor-pointer">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/20 text-xs font-bold h-9 px-4 rounded-lg cursor-pointer">
                    Initialize
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section - 3D Background Layout */}
      <section className="relative z-10 container mx-auto px-6 min-h-[96vh] flex flex-col items-center justify-center pt-28 pb-16 text-center">
        {/* Fullscreen Background Canvas */}
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden select-none">
          <div className="w-full h-full absolute inset-0 z-0 opacity-60 dark:opacity-80">
            <WebGLErrorBoundary
              fallback={
                <div className="w-full h-full flex items-center justify-center opacity-10">
                  <Code2 className="w-24 h-24 text-primary animate-pulse" />
                </div>
              }
            >
              <Canvas camera={{ position: [0, 0, 5.8], fov: 48 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
                <Suspense fallback={null}>
                  <Scene isDark={isDark} speed={speed} colorTheme={colorTheme} showWireframe={showWireframe} />
                </Suspense>
              </Canvas>
            </WebGLErrorBoundary>
          </div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-6 pointer-events-auto">
          {/* Version Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/90 dark:bg-slate-950/80 border border-border/40 dark:border-white/10 backdrop-blur-md">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
            <span className="text-[10px] font-mono text-muted-foreground dark:text-slate-300 uppercase tracking-widest">
              v1.0.0 Stable Build
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08] font-sans">
            Solve in sync.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 dark:from-amber-400 dark:via-yellow-400 dark:to-orange-400">
              Visualize algorithms.
            </span>
          </h1>

          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed backdrop-blur-[1px]">
            A collaborative developer ledger linking LeetCode, Codeforces, and AtCoder profiles in a unified workspace. Form squads, challenge peers, and inspect structured data trees and sort models on interactive canvases.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
              <Button size="lg" className="h-11 px-6 text-xs font-bold rounded-lg gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-md cursor-pointer">
                {isLoggedIn ? "Open Dashboard" : "Get Started Now"} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-xs font-medium rounded-lg border-border bg-background/60 dark:bg-slate-950/40 text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:hover:bg-slate-905/30 cursor-pointer backdrop-blur-sm"
              onClick={() => scrollToSection("bento-features")}
            >
              Inspect Ecosystem
            </Button>
          </div>
        </div>

      </section>

      {/* Bento Grid Features Section with 3D tilts & Asymmetric Spans */}
      <section id="bento-features" className="py-24 px-6 bg-background/90 dark:bg-background/80 border-t border-border/40 dark:border-white/5 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center mb-16 max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-primary flex items-center gap-1.5 mb-2">
              <LayoutGrid className="w-3.5 h-3.5" /> Product Architecture
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
              An ecosystem engineered for problem solvers.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
              AlgoSphere compiles active user squads, connected arena loyalty integrations, interactive visual canvas code, and distributed backend scaling components in a single workspace.
            </p>
          </div>

          {/* Balanced Asymmetrical 6-Column Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 perspective-[1200px] mb-8">
            {/* Bento Card 1: Live Ticker Feed (Wide - 4 Columns) */}
            <motion.div 
              whileHover={{ y: -5, rotateX: 1.0, rotateY: 0.5, z: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group relative lg:col-span-4 rounded-2xl bg-card/45 dark:bg-card/20 border border-border/45 dark:border-white/5 p-6 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transform-style-3d min-h-[260px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <SolverFeedWidget />
            </motion.div>

            {/* Bento Card 2: Platform Arenas (Compact - 2 Columns) */}
            <motion.div 
              whileHover={{ y: -5, rotateX: 1.0, rotateY: -0.5, z: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group relative lg:col-span-2 rounded-2xl bg-card/45 dark:bg-card/20 border border-border/45 dark:border-white/5 p-6 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transform-style-3d min-h-[260px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <PlatformsWidget />
            </motion.div>

            {/* Bento Card 3: System Flow Widget (Compact - 2 Columns) */}
            <motion.div 
              whileHover={{ y: -5, rotateX: 1.0, rotateY: 0.5, z: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group relative lg:col-span-2 rounded-2xl bg-card/45 dark:bg-card/20 border border-border/45 dark:border-white/5 p-6 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transform-style-3d min-h-[260px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <SystemDesignFlowWidget />
            </motion.div>

            {/* Bento Card 4: Squad Leaderboard (Wide - 4 Columns) */}
            <motion.div 
              whileHover={{ y: -5, rotateX: -0.5, rotateY: 0.5, z: 10 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group relative lg:col-span-4 rounded-2xl bg-card/45 dark:bg-card/20 border border-border/45 dark:border-white/5 p-6 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transform-style-3d min-h-[260px] flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex flex-col justify-between h-full text-left">
                <div className="space-y-2">
                  <div className="p-2 w-max rounded-lg bg-pink-500/10 border border-border/30 dark:border-white/5 text-pink-500">
                    <Award className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-3 font-mono uppercase tracking-wider">Ranked Guild Arena</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Compare performance metrics with peers inside customized groups. Monitor solving velocity, platform loyalty logs, and problem difficulty breakdowns.
                  </p>
                </div>
                <div className="bg-secondary/30 dark:bg-slate-950/40 rounded-xl border border-border/30 dark:border-white/5 p-4 flex flex-col justify-between text-xs mt-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/30 dark:border-white/5 pb-2">Squad leaderboard</span>
                  <div className="space-y-2 mt-3 font-mono">
                    {[
                      { rank: 1, name: "alex", score: "12 solved", width: "w-full", color: "bg-primary" },
                      { rank: 2, name: "maya", score: "9 solved", width: "w-[75%]", color: "bg-rose-500" },
                      { rank: 3, name: "joe", score: "8 solved", width: "w-[66%]", color: "bg-indigo-500 dark:bg-indigo-400" },
                    ].map((row) => (
                      <div key={row.rank} className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-foreground font-medium">#{row.rank} @{row.name}</span>
                          <span className="text-muted-foreground">{row.score}</span>
                        </div>
                        <div className="w-full h-1.5 bg-secondary/80 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.color} ${row.width}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Dedicated Full-Width Algorithm Visualizer Showcase Panel */}
          <div id="terminal-widget" className="mt-8">
            <motion.div 
              whileHover={{ y: -5, z: 10 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className="group relative rounded-2xl bg-card/45 dark:bg-card/20 border border-border/45 dark:border-white/5 p-6 md:p-8 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="md:w-5/12 flex flex-col justify-between gap-6 text-left">
                  <div className="space-y-3">
                    <div className="p-2 w-max rounded-lg bg-primary/10 dark:bg-primary/20 border border-border/30 dark:border-white/5 text-primary">
                      <Eye className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground font-mono">Algorithm Canvas Visualizer</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Say goodbye to static code logic. Randomize, shuffle, and step through standard algorithms inside our reactive execution sandbox engine. Observe comparator indexes, iterations, swaps, and running state metrics in real time.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 font-mono text-[9px] text-primary font-bold">
                    <span className="px-2 py-0.5 rounded bg-primary/10">STACK & QUEUE</span>
                    <span className="px-2 py-0.5 rounded bg-primary/10">TREES & GRAPHS</span>
                    <span className="px-2 py-0.5 rounded bg-primary/10">DIJKSTRA PATHS</span>
                  </div>
                </div>
                <div className="md:w-7/12 w-full">
                  <SortingTerminal />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="cta" className="py-28 px-6 bg-background dark:bg-background border-t border-border/40 dark:border-white/5 relative z-10">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative p-10 md:p-16 rounded-3xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:to-orange-950/15 border border-border/40 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-2xl flex flex-col items-center text-center gap-6"
          >
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Ready to claim your place?
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
              Initialize your profile, assemble your squad, and explore visual algorithms in your own dedicated sandbox workspace.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
              <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                <Button size="lg" className="h-12 px-6 text-xs font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-[1.02] cursor-pointer">
                  {isLoggedIn ? "Enter Workspace" : "Initialize Console"}
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="ghost" className="h-12 px-6 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
                  Sign In to Account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background dark:bg-background border-t border-border/40 dark:border-white/5 py-12 px-6 text-xs text-muted-foreground relative z-10">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AlgoSphereLogo className="w-6.5 h-6.5" />
            <span className="font-bold text-foreground tracking-tight uppercase font-mono text-sm">AlgoSphere</span>
          </div>
          
          <p className="text-center md:text-left text-muted-foreground/80 font-mono">
            &copy; {new Date().getFullYear()} AlgoSphere. Engineered for data structures and scalable system engineering.
          </p>

          <div className="flex items-center gap-6 font-mono text-[10px] uppercase">
            <Link to="/auth" className="hover:text-foreground transition-colors">Access Console</Link>
            <button onClick={() => scrollToSection("bento-features")} className="hover:text-foreground transition-colors cursor-pointer">Workspace</button>
            <button onClick={() => scrollToSection("terminal-widget")} className="hover:text-foreground transition-colors cursor-pointer">Playground</button>
          </div>
        </div>
      </footer>

      {/* Floating 3D Calibrator Panel DOCKED collapsible */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-mono">
        <AnimatePresence>
          {isCalibratorOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-72 bg-card/95 dark:bg-slate-950/90 border border-border/50 dark:border-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex flex-col gap-4 text-xs text-muted-foreground"
            >
              <div className="flex justify-between items-center border-b border-border/30 dark:border-white/5 pb-2 text-[10px] uppercase font-bold text-foreground">
                <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-primary" /> GL Engine Controls</span>
                <button 
                  onClick={() => setIsCalibratorOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Controls: Speed */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[9px] uppercase font-semibold text-foreground tracking-wider">Velocity Speed</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "Slow", val: 0.3 },
                    { label: "Normal", val: 1.0 },
                    { label: "Hyper", val: 3.5 }
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSpeed(s.val)}
                      className={`py-1 rounded text-[9px] text-center font-mono cursor-pointer transition-all border ${
                        speed === s.val
                          ? "bg-primary border-primary text-white font-bold"
                          : "bg-secondary border-border hover:bg-secondary/70 text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls: Color Spectrum */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[9px] uppercase font-semibold text-foreground tracking-wider">Spectrum coordinates</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "Gold", val: "amber" },
                    { label: "Blue", val: "emerald" },
                    { label: "Rose", val: "rose" }
                  ].map((c) => (
                    <button
                      key={c.label}
                      onClick={() => setColorTheme(c.val as any)}
                      className={`py-1 rounded text-[9px] text-center font-mono cursor-pointer transition-all border ${
                        colorTheme === c.val
                          ? "bg-primary border-primary text-white font-bold"
                          : "bg-secondary border-border hover:bg-secondary/70 text-foreground"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls: Core Wireframe Toggle */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[9px] uppercase font-semibold text-foreground tracking-wider">Geodesic Core</label>
                <button
                  onClick={() => setShowWireframe(!showWireframe)}
                  className={`w-full py-1.5 rounded-lg border text-[9px] font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    showWireframe
                      ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 font-semibold"
                      : "bg-secondary border-border hover:bg-secondary/70 text-muted-foreground"
                  }`}
                >
                  <FlaskConical className="w-3 h-3" />
                  {showWireframe ? "Deconstruct" : "Initialize"}
                </button>
              </div>

              {/* Column 4: Diagnostics */}
              <div className="font-mono text-[8px] text-muted-foreground flex flex-col justify-center space-y-0.5 text-left bg-secondary/15 dark:bg-slate-900/40 p-2 rounded-lg border border-border/20 dark:border-white/5">
                <div className="flex justify-between border-b border-border/20 dark:border-white/5 pb-1 mb-1 font-bold text-foreground tracking-wider uppercase">
                  <span>GPU LOG</span>
                  <span className="text-green-500 font-semibold">OK</span>
                </div>
                <div className="flex justify-between">
                  <span>TILT:</span>
                  <span className="text-foreground">ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>SPEED:</span>
                  <span className="text-primary font-bold">{speed}x</span>
                </div>
                <div className="flex justify-between">
                  <span>COLOR:</span>
                  <span className="text-foreground uppercase">{colorTheme}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calibrator floating trigger button */}
        <button
          onClick={() => setIsCalibratorOpen(!isCalibratorOpen)}
          className={`flex items-center gap-2 p-3 px-4 rounded-full border shadow-xl backdrop-blur-md transition-all duration-300 group cursor-pointer ${
            isCalibratorOpen
              ? "bg-primary border-primary text-white font-bold"
              : "bg-card/90 dark:bg-slate-950/80 border-border/60 hover:border-primary/50 text-foreground hover:text-primary"
          }`}
        >
          <Sliders className={`w-4 h-4 transition-transform duration-300 ${isCalibratorOpen ? "rotate-90" : "group-hover:rotate-12"}`} />
          <span className="text-xs uppercase font-bold tracking-wider">3D Controller</span>
        </button>
      </div>
    </div>
  );
}
