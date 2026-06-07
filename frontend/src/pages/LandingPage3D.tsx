import React, { Component, ReactNode, Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowRight, Code2, Eye, FlaskConical, BookOpen, Award, Network, Zap, LayoutGrid, Sun, Moon, Sliders } from "lucide-react";
import { Link } from "react-router-dom";
import * as THREE from "three";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";

export const AlgoArenaLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="landingLogoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="hsl(var(--primary))" />
        <stop offset="0.5" stopColor="hsl(var(--primary) / 0.85)" />
        <stop offset="1" stopColor="hsl(var(--primary) / 0.4)" />
      </linearGradient>
      <filter id="landingLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" opacity="0.85" operator="over" />
      </filter>
    </defs>
    
    {/* Triangular Team Network Graph (Crest) */}
    <path d="M8 7 L12 4 L16 7 Z" stroke="url(#landingLogoGrad)" strokeWidth="1.0" strokeLinejoin="round" opacity="0.4" />
    <circle cx="12" cy="4" r="1.5" fill="url(#landingLogoGrad)" filter="url(#landingLogoGlow)" />
    <circle cx="8" cy="7" r="1.5" fill="url(#landingLogoGrad)" />
    <circle cx="16" cy="7" r="1.5" fill="url(#landingLogoGrad)" />
    
    {/* Crossed Swords (Clashing slashes) */}
    <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" stroke="url(#landingLogoGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8" y1="14.5" x2="9.5" y2="16" stroke="url(#landingLogoGrad)" strokeWidth="1.2" />
    
    <line x1="15.5" y1="15.5" x2="8.5" y2="8.5" stroke="url(#landingLogoGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16" y1="14.5" x2="14.5" y2="16" stroke="url(#landingLogoGrad)" strokeWidth="1.2" />

    {/* Interlocking Code Brackets (Shield sides) */}
    <path d="M7.2 8 C6.2 8, 5.5 8.8, 5.5 9.8 L5.5 11.2 C5.5 11.8, 4.8 12.1, 4.3 12.5 C4.8 12.9, 5.5 13.2, 5.5 13.8 L5.5 15.2 C5.5 16.2, 6.2 17, 7.2 17" stroke="url(#landingLogoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    <path d="M16.8 8 C17.8 8, 18.5 8.8, 18.5 9.8 L18.5 11.2 C18.5 11.8, 19.2 12.1, 19.7 12.5 C19.2 12.9, 18.5 13.2, 18.5 13.8 L18.5 15.2 C18.5 16.2, 17.8 17, 16.8 17" stroke="url(#landingLogoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    
    {/* Bottom Code Lines / Battle Ground */}
    <line x1="10" y1="19" x2="14" y2="19" stroke="url(#landingLogoGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="9" y1="21" x2="15" y2="21" stroke="url(#landingLogoGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
    <line x1="11" y1="23" x2="13" y2="23" stroke="url(#landingLogoGrad)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
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

interface NodeItem {
  id: number;
  position: [number, number, number];
  color: string;
}

interface EdgeItem {
  start: [number, number, number];
  end: [number, number, number];
}

// Stunning 3D Algorithm Network Graph representing AlgoArena
function NetworkGraph3D({ isDark, speed, colorTheme, showWireframe }: { isDark: boolean; speed: number; colorTheme: "red" | "emerald" | "rose"; showWireframe: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate nodes and edges
  const { nodes, edges, packets } = useMemo(() => {
    const nodeCount = 24;
    const generatedNodes: NodeItem[] = [];
    const generatedEdges: EdgeItem[] = [];
    const generatedPackets: { edgeIndex: number; progress: number; speed: number }[] = [];

    let baseColorStr = "#ef4444"; // red
    let secondaryColorStr = "#be123c"; // rose
    
    if (colorTheme === "emerald") {
      baseColorStr = isDark ? "#10b981" : "#065f46"; 
      secondaryColorStr = isDark ? "#06b6d4" : "#155e75"; 
    } else if (colorTheme === "rose") {
      baseColorStr = isDark ? "#f43f5e" : "#9f1239"; 
      secondaryColorStr = isDark ? "#ec4899" : "#831843"; 
    } else { // red
      baseColorStr = isDark ? "#ef4444" : "#991b1b"; 
      secondaryColorStr = isDark ? "#dc2626" : "#7f1d1d"; 
    }

    const color1 = new THREE.Color(baseColorStr);
    const color2 = new THREE.Color(secondaryColorStr);

    // Position nodes spherically
    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.acos(1 - 2 * (i / nodeCount));
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;
      const radius = 2.0;

      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(theta);

      const mixRatio = (y + radius) / (2 * radius);
      const col = color1.clone().lerp(color2, mixRatio).getStyle();

      generatedNodes.push({
        id: i,
        position: [x, y, z],
        color: col
      });
    }

    // Connect nodes (edges) if they are close to each other
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dx = generatedNodes[i].position[0] - generatedNodes[j].position[0];
        const dy = generatedNodes[i].position[1] - generatedNodes[j].position[1];
        const dz = generatedNodes[i].position[2] - generatedNodes[j].position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Maximum distance to connect
        if (dist < 1.7) {
          generatedEdges.push({
            start: [generatedNodes[i].position[0] * 1.55, generatedNodes[i].position[1], generatedNodes[i].position[2]],
            end: [generatedNodes[j].position[0] * 1.55, generatedNodes[j].position[1], generatedNodes[j].position[2]]
          });
        }
      }
    }

    // Scale node positions horizontally
    for (let i = 0; i < nodeCount; i++) {
      generatedNodes[i].position[0] *= 1.55;
    }

    // Generate packets traversing the edges
    const packetCount = 12;
    for (let i = 0; i < packetCount; i++) {
      if (generatedEdges.length > 0) {
        generatedPackets.push({
          edgeIndex: Math.floor(Math.random() * generatedEdges.length),
          progress: Math.random(),
          speed: 0.15 + Math.random() * 0.2
        });
      }
    }

    return { nodes: generatedNodes, edges: generatedEdges, packets: generatedPackets };
  }, [isDark, colorTheme]);

  const packetRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetY = state.clock.getElapsedTime() * 0.08 * speed + state.pointer.x * 0.35;
      const targetX = Math.sin(state.clock.getElapsedTime() * 0.04) * 0.1 + state.pointer.y * -0.35;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.05);
    }

    // Animate packets traversing along the edges
    packets.forEach((p, idx) => {
      const mesh = packetRefs.current[idx];
      if (mesh) {
        p.progress += delta * p.speed * speed;
        if (p.progress > 1.0) {
          p.progress = 0;
          p.edgeIndex = Math.floor(Math.random() * edges.length);
        }

        const edge = edges[p.edgeIndex];
        if (edge) {
          const x = THREE.MathUtils.lerp(edge.start[0], edge.end[0], p.progress);
          const y = THREE.MathUtils.lerp(edge.start[1], edge.end[1], p.progress);
          const z = THREE.MathUtils.lerp(edge.start[2], edge.end[2], p.progress);
          mesh.position.set(x, y, z);
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Draw Nodes */}
      {nodes.map((node) => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshBasicMaterial color={node.color} />
        </mesh>
      ))}

      {/* Draw Edges */}
      {showWireframe && edges.map((edge, idx) => {
        const points = [new THREE.Vector3(...edge.start), new THREE.Vector3(...edge.end)];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <line key={idx} geometry={lineGeom} {...({} as any)}>
            <lineBasicMaterial
              color={isDark ? "#ffffff" : "#000000"}
              transparent
              opacity={isDark ? 0.08 : 0.12}
            />
          </line>
        );
      })}

      {/* Draw Traversing Packets */}
      {packets.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            if (el) packetRefs.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial
            color={colorTheme === "emerald" ? "#38bdf8" : colorTheme === "rose" ? "#ec4899" : "#ef4444"}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

interface HelixNode {
  id: number;
  position: [number, number, number];
  color: string;
  strand: 1 | 2;
}

// Stunning 3D Algorithm Helix Vortex representing AlgoArena
function HelixVortex3D({ isDark, speed, colorTheme, showWireframe }: { isDark: boolean; speed: number; colorTheme: "red" | "emerald" | "rose"; showWireframe: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate nodes and edges
  const { nodes, edges, packets } = useMemo(() => {
    const generatedNodes: HelixNode[] = [];
    const generatedEdges: EdgeItem[] = [];
    const generatedPackets: { edgeIndex: number; progress: number; speed: number }[] = [];
    
    const turns = 2.5;
    const nodeCountPerStrand = 18;
    const radius = 1.6;
    const height = 4.2;

    let baseColorStr = "#ef4444"; // red
    let secondaryColorStr = "#be123c"; // rose/crimson

    if (colorTheme === "emerald") {
      baseColorStr = isDark ? "#10b981" : "#065f46";
      secondaryColorStr = isDark ? "#06b6d4" : "#155e75";
    } else if (colorTheme === "rose") {
      baseColorStr = isDark ? "#f43f5e" : "#9f1239";
      secondaryColorStr = isDark ? "#ec4899" : "#831843";
    } else { // red
      baseColorStr = isDark ? "#ef4444" : "#991b1b";
      secondaryColorStr = isDark ? "#dc2626" : "#7f1d1d";
    }

    const color1 = new THREE.Color(baseColorStr);
    const color2 = new THREE.Color(secondaryColorStr);

    for (let i = 0; i < nodeCountPerStrand; i++) {
      const t = i / (nodeCountPerStrand - 1);
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;

      // Strand 1
      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const mixRatio = t;
      const col1 = color1.clone().lerp(color2, mixRatio).getStyle();

      generatedNodes.push({
        id: i * 2,
        position: [x1 * 1.55, y, z1],
        color: col1,
        strand: 1
      });

      // Strand 2 (180 degrees offset)
      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;
      const col2 = color1.clone().lerp(color2, 1 - mixRatio).getStyle();

      generatedNodes.push({
        id: i * 2 + 1,
        position: [x2 * 1.55, y, z2],
        color: col2,
        strand: 2
      });

      // Connect corresponding nodes between Strand 1 and Strand 2 (horizontal rungs)
      generatedEdges.push({
        start: [x1 * 1.55, y, z1],
        end: [x2 * 1.55, y, z2]
      });

      // Connect successive nodes along the same strand (helical rails)
      if (i > 0) {
        const prevT = (i - 1) / (nodeCountPerStrand - 1);
        const prevAngle = prevT * turns * Math.PI * 2;
        const prevY = (prevT - 0.5) * height;

        const prevX1 = Math.cos(prevAngle) * radius;
        const prevZ1 = Math.sin(prevAngle) * radius;
        const prevX2 = Math.cos(prevAngle + Math.PI) * radius;
        const prevZ2 = Math.sin(prevAngle + Math.PI) * radius;

        generatedEdges.push({
          start: [prevX1 * 1.55, prevY, prevZ1],
          end: [x1 * 1.55, y, z1]
        });
        generatedEdges.push({
          start: [prevX2 * 1.55, prevY, prevZ2],
          end: [x2 * 1.55, y, z2]
        });
      }
    }

    // Generate packets traversing along the helical structures
    const packetCount = 12;
    for (let i = 0; i < packetCount; i++) {
      if (generatedEdges.length > 0) {
        generatedPackets.push({
          edgeIndex: Math.floor(Math.random() * generatedEdges.length),
          progress: Math.random(),
          speed: 0.2 + Math.random() * 0.25
        });
      }
    }

    return { nodes: generatedNodes, edges: generatedEdges, packets: generatedPackets };
  }, [isDark, colorTheme]);

  const packetRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate the group based on clock and pointer interaction
      const targetY = state.clock.getElapsedTime() * 0.1 * speed + state.pointer.x * 0.35;
      const targetX = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.12 + state.pointer.y * -0.35;

      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.05);
    }

    // Animate packets traversing along the edges
    packets.forEach((p, idx) => {
      const mesh = packetRefs.current[idx];
      if (mesh) {
        p.progress += delta * p.speed * speed;
        if (p.progress > 1.0) {
          p.progress = 0;
          p.edgeIndex = Math.floor(Math.random() * edges.length);
        }

        const edge = edges[p.edgeIndex];
        if (edge) {
          const x = THREE.MathUtils.lerp(edge.start[0], edge.end[0], p.progress);
          const y = THREE.MathUtils.lerp(edge.start[1], edge.end[1], p.progress);
          const z = THREE.MathUtils.lerp(edge.start[2], edge.end[2], p.progress);
          mesh.position.set(x, y, z);
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Draw Nodes */}
      {nodes.map((node) => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color={node.color} />
        </mesh>
      ))}

      {/* Draw Edges */}
      {showWireframe && edges.map((edge, idx) => {
        const points = [new THREE.Vector3(...edge.start), new THREE.Vector3(...edge.end)];
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <line key={idx} geometry={lineGeom} {...({} as any)}>
            <lineBasicMaterial
              color={isDark ? "#ffffff" : "#000000"}
              transparent
              opacity={isDark ? 0.08 : 0.12}
            />
          </line>
        );
      })}

      {/* Draw Traversing Packets */}
      {packets.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            if (el) packetRefs.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial
            color={colorTheme === "emerald" ? "#38bdf8" : colorTheme === "rose" ? "#ec4899" : "#ef4444"}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// Stunning 3D Algorithm Wave Field representing AlgoArena
function WaveField3D({ isDark, speed, colorTheme, showWireframe }: { isDark: boolean; speed: number; colorTheme: "red" | "emerald" | "rose"; showWireframe: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate nodes on a grid
  const { nodes, edges } = useMemo(() => {
    const generatedNodes: { id: number; gridX: number; gridZ: number; color: string }[] = [];
    const generatedEdges: EdgeItem[] = [];
    const cols = 9;
    const rows = 9;
    const spacing = 0.5;

    let baseColorStr = "#ef4444";
    let secondaryColorStr = "#be123c";

    if (colorTheme === "emerald") {
      baseColorStr = isDark ? "#10b981" : "#065f46";
      secondaryColorStr = isDark ? "#06b6d4" : "#155e75";
    } else if (colorTheme === "rose") {
      baseColorStr = isDark ? "#f43f5e" : "#9f1239";
      secondaryColorStr = isDark ? "#ec4899" : "#831843";
    } else { // red
      baseColorStr = isDark ? "#ef4444" : "#991b1b";
      secondaryColorStr = isDark ? "#dc2626" : "#7f1d1d";
    }

    const color1 = new THREE.Color(baseColorStr);
    const color2 = new THREE.Color(secondaryColorStr);

    let id = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const gridX = (c - (cols - 1) / 2) * spacing;
        const gridZ = (r - (rows - 1) / 2) * spacing;
        
        // Color based on distance from center
        const dist = Math.sqrt(gridX * gridX + gridZ * gridZ);
        const mixRatio = Math.min(dist / 2.5, 1.0);
        const col = color1.clone().lerp(color2, mixRatio).getStyle();

        generatedNodes.push({
          id: id++,
          gridX,
          gridZ,
          color: col
        });
      }
    }

    // Connect neighbors for wireframe mesh
    if (showWireframe) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const idx = c * rows + r;
          // Connect to right neighbor
          if (c < cols - 1) {
            generatedEdges.push({
              start: [idx, 0, 0], // Store indices first, positions updated in frame loop
              end: [(c + 1) * rows + r, 0, 0]
            });
          }
          // Connect to bottom neighbor
          if (r < rows - 1) {
            generatedEdges.push({
              start: [idx, 0, 0],
              end: [c * rows + (r + 1), 0, 0]
            });
          }
        }
      }
    }

    return { nodes: generatedNodes, edges: generatedEdges };
  }, [isDark, colorTheme, showWireframe]);

  const nodeRefs = useRef<THREE.Mesh[]>([]);
  const lineRefs = useRef<THREE.Line[]>([]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Rotation based on time and pointer interaction
      groupRef.current.rotation.y = time * 0.05 * speed + state.pointer.x * 0.25;
      groupRef.current.rotation.x = -0.4 + state.pointer.y * -0.25; // Tilt forward
    }

    // Animate node heights in grid wave
    const positions: [number, number, number][] = [];
    nodes.forEach((node, idx) => {
      const mesh = nodeRefs.current[idx];
      if (mesh) {
        const x = node.gridX * 1.55;
        const z = node.gridZ;
        const dist = Math.sqrt(node.gridX * node.gridX + node.gridZ * node.gridZ);
        const y = Math.sin(time * 1.2 * speed - dist * 1.5) * 0.45;
        mesh.position.set(x, y, z);
        positions.push([x, y, z]);
      }
    });

    // Update lines connecting the waving nodes
    if (showWireframe && edges.length > 0) {
      edges.forEach((edge, idx) => {
        const line = lineRefs.current[idx];
        if (line) {
          const startIdx = edge.start[0];
          const endIdx = edge.end[0];
          const startPos = positions[startIdx];
          const endPos = positions[endIdx];
          if (startPos && endPos) {
            // Update line geometry dynamically
            const points = [new THREE.Vector3(...startPos), new THREE.Vector3(...endPos)];
            line.geometry.setFromPoints(points);
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Render Grid Nodes */}
      {nodes.map((node, idx) => (
        <mesh
          key={node.id}
          ref={(el) => {
            if (el) nodeRefs.current[idx] = el;
          }}
          position={[node.gridX * 1.55, 0, node.gridZ]}
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color={node.color} />
        </mesh>
      ))}

      {/* Render Dynamic Edges */}
      {showWireframe && edges.map((edge, idx) => {
        return (
          <line
            key={idx}
            ref={(el) => {
              if (el) lineRefs.current[idx] = el as THREE.Line;
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({} as any)}
          >
            <bufferGeometry />
            <lineBasicMaterial
              color={isDark ? "#ffffff" : "#000000"}
              transparent
              opacity={isDark ? 0.07 : 0.11}
            />
          </line>
        );
      })}
    </group>
  );
}

function Scene({ isDark, speed, colorTheme, showWireframe, bgEffect }: { isDark: boolean; speed: number; colorTheme: "red" | "emerald" | "rose"; showWireframe: boolean; bgEffect: "network" | "helix" | "wave" }) {
  let sparkColor = isDark ? "#ef4444" : "#991b1b";
  if (colorTheme === "emerald") sparkColor = isDark ? "#10b981" : "#065f46";
  if (colorTheme === "rose") sparkColor = isDark ? "#f43f5e" : "#9f1239";

  return (
    <>
      <ambientLight intensity={isDark ? 0.3 : 0.5} />
      <pointLight position={[10, 10, 10]} intensity={isDark ? 1.6 : 2.0} color={sparkColor} />
      <pointLight position={[-10, -10, -10]} intensity={isDark ? 1.2 : 1.4} color={isDark ? "#f43f5e" : "#9d174d"} />
      {bgEffect === "network" ? (
        <NetworkGraph3D isDark={isDark} speed={speed} colorTheme={colorTheme} showWireframe={showWireframe} />
      ) : bgEffect === "helix" ? (
        <HelixVortex3D isDark={isDark} speed={speed} colorTheme={colorTheme} showWireframe={showWireframe} />
      ) : (
        <WaveField3D isDark={isDark} speed={speed} colorTheme={colorTheme} showWireframe={showWireframe} />
      )}
      <Sparkles count={isDark ? 40 : 20} scale={6} size={2.2} speed={0.2 * speed} opacity={isDark ? 0.4 : 0.28} color={sparkColor} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.2 * speed} />
    </>
  );
}

// Premium Bento Grid Widgets
const FEED_EVENTS = [
  { user: "sarah_dev", problem: "LCS DP", platform: "AtCoder", diff: "Medium" },
  { user: "kyle99", problem: "LRU Cache", platform: "LeetCode", diff: "Hard" },
  { user: "chao_wang", problem: "Dijkstra SP", platform: "Codeforces", diff: "Hard" },
  { user: "lucia", problem: "Binary Search", platform: "LeetCode", diff: "Easy" },
  { user: "nitin_s", problem: "Subtree Sum", platform: "Codeforces", diff: "Medium" },
  { user: "elena", problem: "Edit Distance", platform: "LeetCode", diff: "Hard" },
  { user: "zen_coder", problem: "QuickSort", platform: "AtCoder", diff: "Easy" },
];

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  whileHover?: string | object;
  variants?: Variants;
}

export function BentoCard({ children, className, whileHover, variants }: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      variants={variants}
      whileHover={whileHover}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={`group relative rounded-2xl bg-card/45 dark:bg-card/25 border border-border/45 dark:border-white/5 p-6 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transform-style-3d min-h-[260px] cursor-pointer ${className || ""}`}
      style={{
        "--mouse-x": `${coords.x}px`,
        "--mouse-y": `${coords.y}px`
      } as React.CSSProperties}
    >
      {/* Background Spotlight Glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(350px circle at var(--mouse-x) var(--mouse-y), rgba(239, 68, 68, 0.07), transparent 75%)`
        }}
      />
      {/* Border Spotlight Glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl border border-red-500/20"
        style={{
          maskImage: `radial-gradient(130px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
          WebkitMaskImage: `radial-gradient(130px circle at var(--mouse-x) var(--mouse-y), black, transparent)`
        }}
      />
      {children}
    </motion.div>
  );
}

function SolverFeedWidget() {
  const [items, setItems] = useState([
    { id: 1, user: "alex", problem: "Two Sum", platform: "LeetCode", diff: "Easy", time: "Just now" },
    { id: 2, user: "maya", problem: "Frog 1", platform: "AtCoder", diff: "Medium", time: "8m ago" },
    { id: 3, user: "joe", problem: "Watermelon", platform: "Codeforces", diff: "Easy", time: "24m ago" },
    { id: 4, user: "kim", problem: "Number of Islands", platform: "LeetCode", diff: "Medium", time: "1h ago" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const randomEvent = FEED_EVENTS[Math.floor(Math.random() * FEED_EVENTS.length)];
      setItems((prev) => {
        const newItem = {
          id: Date.now(),
          user: randomEvent.user,
          problem: randomEvent.problem,
          platform: randomEvent.platform,
          diff: randomEvent.diff,
          time: "Just now"
        };
        const updatedPrev = prev.map(item => {
          if (item.time === "Just now") return { ...item, time: "1m ago" };
          if (item.time.endsWith("m ago")) {
            const min = parseInt(item.time) + Math.floor(Math.random() * 3) + 1;
            return { ...item, time: `${min}m ago` };
          }
          return item;
        });
        return [newItem, ...updatedPrev.slice(0, 3)];
      });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full justify-between text-left font-mono relative">
      <div className="absolute inset-0 bg-[radial-gradient(#ef4444_1px,transparent_1px)] bg-[size:16px_16px] opacity-[0.03] pointer-events-none rounded-2xl"></div>
      
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">root@algoarena:~# tail -f live_events.log</span>
        </div>
        <span className="text-[9px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border/40 font-mono">LIVE TICKER</span>
      </div>
      
      <div className="mt-3.5 flex-1 space-y-2.5 overflow-hidden min-h-[175px]">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, height: 0, margin: 0, padding: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto", margin: "inherit", padding: "10px" }}
              exit={{ opacity: 0, x: 20, height: 0, margin: 0, padding: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="flex items-center justify-between rounded-lg bg-secondary/35 dark:bg-slate-900/20 border border-border/30 dark:border-white/5 text-xs hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300 backdrop-blur-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-foreground">@{item.user}</span>
                <span className="text-muted-foreground font-medium text-[9px] border border-border/30 dark:border-white/5 px-1 py-0.2 rounded bg-background/50">solved</span>
                <span className="text-red-600 dark:text-red-300 font-bold truncate max-w-[120px]">{item.problem}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] text-muted-foreground/80 font-mono">{item.platform}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                  item.diff === "Easy" 
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" 
                    : item.diff === "Medium"
                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 animate-pulse"
                }`}>{item.diff}</span>
                <span className="text-[9px] text-muted-foreground/80 tabular-nums">{item.time}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SystemDesignFlowWidget() {
  return (
    <div className="flex flex-col h-full justify-between text-left font-mono relative">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <span className="text-xs uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">Scaling architecture</span>
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      
      <svg width="100%" height="155" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="mt-4 flex-1">
        {/* Connective Paths */}
        <path id="c-to-lb" d="M 200 30 L 200 55" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border dark:text-white/10" />
        <path id="lb-to-weba" d="M 200 75 L 110 105" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border dark:text-white/10" />
        <path id="lb-to-webb" d="M 200 75 L 290 105" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border dark:text-white/10" />
        <path id="weba-to-cache" d="M 110 125 L 200 155" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border dark:text-white/10" />
        <path id="webb-to-cache" d="M 290 125 L 200 155" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border dark:text-white/10" />

        {/* Dynamic Telemetry Glow Packets */}
        <circle r="2" fill="hsl(var(--primary))">
          <animateMotion dur="1.8s" repeatCount="indefinite" path="M 200 30 L 200 55" />
        </circle>
        <circle r="1.5" fill="hsl(var(--primary))" opacity="0.6">
          <animateMotion dur="1.8s" begin="0.4s" repeatCount="indefinite" path="M 200 30 L 200 55" />
        </circle>

        <circle r="2.5" fill="hsl(var(--primary))">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M 200 75 L 110 105" />
        </circle>
        <circle r="2" fill="hsl(var(--primary))" opacity="0.5">
          <animateMotion dur="2.4s" begin="0.6s" repeatCount="indefinite" path="M 200 75 L 110 105" />
        </circle>

        <circle r="2.5" fill="#f43f5e">
          <animateMotion dur="2.8s" begin="1s" repeatCount="indefinite" path="M 200 75 L 290 105" />
        </circle>
        <circle r="2" fill="#f43f5e" opacity="0.5">
          <animateMotion dur="2.8s" begin="1.6s" repeatCount="indefinite" path="M 200 75 L 290 105" />
        </circle>

        <circle r="2" fill="#ec4899">
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M 110 125 L 200 155" />
        </circle>
        <circle r="2" fill="#3b82f6">
          <animateMotion dur="2.5s" begin="0.5s" repeatCount="indefinite" path="M 290 125 L 200 155" />
        </circle>

        {/* Nodes Rendering with Pulsing Health Lamps */}
        {/* Client (x: 200, y: 20) */}
        <g transform="translate(150, 10)">
          <rect width="100" height="24" rx="5" className="fill-background stroke-border dark:stroke-white/10" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.5" fill="#22c55e" className="animate-pulse" />
          <text x="56" y="15" textAnchor="middle" className="fill-foreground text-[8px] font-bold">Client (Active)</text>
        </g>

        {/* Weighted LB (x: 200, y: 70) */}
        <g transform="translate(140, 52)">
          <rect width="120" height="24" rx="5" className="fill-red-500/5 dark:fill-red-950/20 stroke-red-500/20" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.5" fill="#22c55e" className="animate-pulse" />
          <text x="64" y="15" textAnchor="middle" className="fill-red-700 dark:fill-red-400 text-[8px] font-bold">LB (100% SLA)</text>
        </g>

        {/* Web Server A (x: 90, y: 120) */}
        <g transform="translate(50, 102)">
          <rect width="110" height="24" rx="5" className="fill-background stroke-border dark:stroke-white/10" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.5" fill="#22c55e" />
          <text x="60" y="15" textAnchor="middle" className="fill-foreground text-[8px] font-semibold">Web A (99.9% Up)</text>
        </g>

        {/* Web Server B (x: 310, y: 120) */}
        <g transform="translate(240, 102)">
          <rect width="110" height="24" rx="5" className="fill-background stroke-border dark:stroke-white/10" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.5" fill="#22c55e" />
          <text x="60" y="15" textAnchor="middle" className="fill-foreground text-[8px] font-semibold">Web B (Online)</text>
        </g>

        {/* Redis Cache (x: 200, y: 170) */}
        <g transform="translate(140, 148)">
          <rect width="120" height="24" rx="5" className="fill-rose-500/5 dark:fill-rose-950/20 stroke-rose-500/20" strokeWidth="1" />
          <circle cx="12" cy="12" r="2.5" fill="#38bdf8" className="animate-pulse" />
          <text x="66" y="15" textAnchor="middle" className="fill-rose-700 dark:fill-rose-300 text-[8px] font-bold">Redis (0.8ms RT)</text>
        </g>
      </svg>
    </div>
  );
}

function SortingTerminal() {
  const [array, setArray] = useState<number[]>([]);
  const [sorting, setSorting] = useState(false);
  const [currentIndexes, setCurrentIndexes] = useState<number[]>([]);
  const [comparisons, setComparisons] = useState(0);
  const [swaps, setSwaps] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState<"bubble" | "selection">("bubble");

  const resetArray = () => {
    const newArray = Array.from({ length: 8 }, () => Math.floor(Math.random() * 55) + 12);
    setArray(newArray);
    setCurrentIndexes([]);
    setComparisons(0);
    setSwaps(0);
    setLogs([`[INIT] Shuffled new array: [${newArray.join(", ")}]`]);
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
    
    setLogs((prev) => [...prev.slice(-3), "[RUN] Bubble Sort visualizer initialized"]);

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        setCurrentIndexes([j, j + 1]);
        comp++;
        setComparisons(comp);
        setLogs((prev) => [...prev.slice(-3), `[COMPARE] arr[${j}] (${arr[j]}) vs arr[${j+1}] (${arr[j+1]})`]);
        await sleep(250);

        if (arr[j] > arr[j + 1]) {
          const temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
          swp++;
          setSwaps(swp);
          setLogs((prev) => [...prev.slice(-3), `[SWAP] Swapped indices ${j} & ${j+1} (${arr[j+1]} <-> ${arr[j]})`]);
          setArray([...arr]);
          await sleep(250);
        }
      }
    }
    setCurrentIndexes([]);
    setLogs((prev) => [...prev.slice(-3), `[SUCCESS] Bubble Sort complete. comps: ${comp}, swaps: ${swp}`]);
    setSorting(false);
  };

  const selectionSort = async () => {
    if (sorting) return;
    setSorting(true);
    const arr = [...array];
    const n = arr.length;
    let comp = 0;
    let swp = 0;
    
    setLogs((prev) => [...prev.slice(-3), "[RUN] Selection Sort visualizer initialized"]);

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      setLogs((prev) => [...prev.slice(-3), `[ITER] Pass ${i+1}: Finding min from index ${i}`]);
      for (let j = i + 1; j < n; j++) {
        setCurrentIndexes([minIdx, j]);
        comp++;
        setComparisons(comp);
        setLogs((prev) => [...prev.slice(-3), `[COMPARE] arr[${j}] (${arr[j]}) < arr[${minIdx}] (${arr[minIdx]})`]);
        await sleep(250);

        if (arr[j] < arr[minIdx]) {
          minIdx = j;
        }
      }

      if (minIdx !== i) {
        const temp = arr[i];
        arr[i] = arr[minIdx];
        arr[minIdx] = temp;
        swp++;
        setSwaps(swp);
        setLogs((prev) => [...prev.slice(-3), `[SWAP] Found new min. Swapped indices ${i} & ${minIdx} (${arr[i]} <-> ${arr[minIdx]})`]);
        setArray([...arr]);
        await sleep(250);
      }
    }
    setCurrentIndexes([]);
    setLogs((prev) => [...prev.slice(-3), `[SUCCESS] Selection Sort complete. comps: ${comp}, swaps: ${swp}`]);
    setSorting(false);
  };

  return (
    <div className="flex flex-col h-full bg-white/70 dark:bg-slate-950/70 border border-border/50 dark:border-white/5 rounded-2xl p-5 justify-between shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85"></span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground ml-1.5">AlgVisualizer.tsx</span>
        </div>
        <div className="flex gap-2">
          <select 
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as "bubble" | "selection")}
            disabled={sorting}
            className="p-1 px-1.5 text-[10px] font-mono bg-secondary hover:bg-secondary/80 border border-border/50 dark:border-white/5 rounded text-foreground outline-none cursor-pointer transition-colors"
          >
            <option value="bubble">Bubble Sort</option>
            <option value="selection">Selection Sort</option>
          </select>
          <button 
            onClick={resetArray} 
            disabled={sorting} 
            className="p-1 px-2 text-[10px] font-mono bg-secondary hover:bg-secondary/80 border border-border/50 dark:border-white/5 rounded text-foreground disabled:opacity-40 transition-colors cursor-pointer"
          >
            Shuffle
          </button>
          <button 
            onClick={algorithm === "bubble" ? bubbleSort : selectionSort} 
            disabled={sorting} 
            className="p-1 px-2.5 text-[10px] font-mono bg-primary hover:bg-primary/95 rounded text-white disabled:opacity-40 font-bold transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            Run
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between h-28 px-3 py-2 mt-4 bg-secondary/35 dark:bg-slate-900/40 rounded-xl relative crt-lens">
        {array.map((value, idx) => {
          const isComparing = currentIndexes.includes(idx);
          return (
            <motion.div
              key={idx}
              layout
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-[8%] flex flex-col items-center gap-1 z-10"
            >
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isComparing
                    ? "bg-gradient-to-t from-pink-500 to-orange-400 shadow-md shadow-pink-500/20 scale-105"
                    : "bg-gradient-to-t from-primary to-rose-500 dark:to-violet-400"
                }`}
                style={{ height: `${value}px` }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-slate-950 border border-emerald-500/10 rounded-xl font-mono text-[9px] text-emerald-400 text-left h-24 overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 bg-scanline pointer-events-none opacity-[0.04]"></div>
        <div className="absolute top-2 right-2 flex gap-1 items-center">
          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[7px] text-emerald-500/40 uppercase">TTY1</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {logs.map((log, index) => (
            <div key={index} className="flex gap-1.5">
              <span className="text-emerald-500/30 select-none">&gt;</span>
              <span className={log.includes("[SWAP]") ? "text-amber-400 font-medium" : log.includes("[SUCCESS]") ? "text-cyan-400 font-bold" : "text-emerald-400"}>
                {log}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-emerald-500/20">Console active. Press 'Run' to stream.</div>
          )}
          {sorting && (
            <div className="flex gap-1 items-center text-emerald-500/60">
              <span className="text-emerald-500/30 select-none">&gt;</span>
              <span>Visualizing...</span>
              <span className="w-1 h-2 bg-emerald-400 animate-pulse"></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mt-4 border-t border-border/40 dark:border-white/5 pt-2.5">
        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-red-500" /> State hooks:</span>
        <div className="flex gap-3">
          <span>comps: <strong className="text-foreground font-medium">{comparisons}</strong></span>
          <span>swaps: <strong className="text-rose-500 font-medium">{swaps}</strong></span>
        </div>
      </div>
    </div>
  );
}

const BRAND_DETAILS: Record<string, { border: string; glow: string; text: string; bg: string }> = {
  LeetCode: { border: "hover:border-amber-500/40", glow: "hover:shadow-amber-500/20 hover:shadow-lg", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5" },
  Codeforces: { border: "hover:border-blue-500/40", glow: "hover:shadow-blue-500/20 hover:shadow-lg", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5" },
  AtCoder: { border: "hover:border-cyan-500/40", glow: "hover:shadow-cyan-500/20 hover:shadow-lg", text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/5" },
  CodeChef: { border: "hover:border-orange-500/40", glow: "hover:shadow-orange-500/20 hover:shadow-lg", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/5" },
  HackerRank: { border: "hover:border-green-500/40", glow: "hover:shadow-green-500/20 hover:shadow-lg", text: "text-green-600 dark:text-green-400", bg: "bg-green-500/5" },
  GFG: { border: "hover:border-emerald-500/40", glow: "hover:shadow-emerald-500/20 hover:shadow-lg", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5" },
};

function PlatformsWidget() {
  return (
    <div className="flex flex-col h-full justify-between text-left font-mono relative">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <span className="text-xs uppercase tracking-wider font-semibold text-primary">Connected arenas</span>
        <Network className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3.5 flex-1">
        {["LeetCode", "Codeforces", "AtCoder", "CodeChef", "HackerRank", "GFG"].map((plat) => {
          const brand = BRAND_DETAILS[plat] || { border: "", glow: "", text: "", bg: "" };
          return (
            <motion.div 
              key={plat}
              whileHover={{ y: -6, scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className={`flex flex-col items-center justify-center p-2 rounded-lg bg-secondary/35 dark:bg-slate-900/20 border border-border/30 dark:border-white/5 text-[10px] font-medium text-foreground/80 hover:bg-background/80 transition-all duration-300 shadow-sm cursor-pointer ${brand.border} ${brand.glow}`}
            >
              <span className={`font-bold ${brand.text}`}>{plat}</span>
              <span className="text-[7.5px] text-green-600 dark:text-green-500 font-mono mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Active
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const CODE_PARTICLES = [
  { text: "O(1)", top: "15%", left: "10%", delay: "0s", dur: "14s" },
  { text: "async", top: "25%", left: "80%", delay: "2s", dur: "18s" },
  { text: "await", top: "75%", left: "15%", delay: "4s", dur: "16s" },
  { text: "[]", top: "65%", left: "85%", delay: "1s", dur: "12s" },
  { text: "{}", top: "10%", left: "50%", delay: "3s", dur: "15s" },
  { text: "ptr->next", top: "85%", left: "45%", delay: "5s", dur: "20s" },
];

export default function LandingPage3D() {
  const { isAuthenticated, token } = useAuth();
  const isLoggedIn = isAuthenticated || Boolean(token);
  const { isDark, toggle: toggleTheme } = useTheme();

  // 3D Engine States
  const [showWireframe, setShowWireframe] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [colorTheme, setColorTheme] = useState<"red" | "emerald" | "rose">("red");
  const [bgEffect, setBgEffect] = useState<"network" | "helix" | "wave">("network");
  const [isCalibratorOpen, setIsCalibratorOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-y-auto overflow-x-hidden transition-colors duration-300 selection:bg-primary/20">
      <style>{`
        @keyframes float-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(40px, -50px) scale(1.12) rotate(120deg); }
          66% { transform: translate(-30px, 30px) scale(0.92) rotate(240deg); }
        }
        @keyframes float-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(-50px, 40px) scale(1.18) rotate(180deg); }
        }
        .animate-float-drift-1 {
          animation: float-drift-1 22s ease-in-out infinite;
        }
        .animate-float-drift-2 {
          animation: float-drift-2 26s ease-in-out infinite;
        }
        .bg-scanline {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.25) 50%
          ), linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.06),
            rgba(0, 255, 0, 0.02),
            rgba(0, 0, 255, 0.06)
          );
          background-size: 100% 4px, 6px 100%;
        }
        .crt-lens::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: radial-gradient(circle, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.45) 100%);
          pointer-events: none;
          border-radius: 12px;
          z-index: 20;
        }
      `}</style>
      {/* High tech grid background pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(239,68,68,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(239,68,68,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#2a0c0e_1px,transparent_1px),linear-gradient(to_bottom,#2a0c0e_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_at_center,black_75%,transparent_100%)] opacity-70 dark:opacity-35 font-mono"></div>

      {/* Radial glows */}
      <div className="absolute top-[10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[60%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="fixed top-0 w-full z-50 bg-background/80 dark:bg-background/75 backdrop-blur-xl border-b border-border/40 dark:border-white/5 transition-all duration-300">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3.5">
            <AlgoArenaLogo className="w-7 h-7" />
            <span className="text-sm font-bold tracking-[0.15em] uppercase text-foreground font-mono">
              AlgoArena
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
                <Button className="bg-primary/10 dark:bg-[#18112c] hover:bg-primary/20 dark:hover:bg-[#20173a] text-primary dark:text-red-200 border border-primary/30 shadow-sm font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer">
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
                  <Scene isDark={isDark} speed={speed} colorTheme={colorTheme} showWireframe={showWireframe} bgEffect={bgEffect} />
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-red-500 dark:from-red-400 dark:via-rose-400 dark:to-red-500">
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
              AlgoArena compiles active user squads, connected arena loyalty integrations, interactive visual canvas code, and distributed backend scaling components in a single workspace.
            </p>
          </div>

          {/* Balanced Asymmetrical 6-Column Bento Grid */}
          <motion.div 
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.12
                }
              }
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            className="grid grid-cols-1 lg:grid-cols-6 gap-6 perspective-[1200px] mb-8"
          >
            {/* Bento Card 1: Live Ticker Feed (Wide - 4 Columns) */}
            <BentoCard 
              variants={{
                hidden: { opacity: 0, y: 35, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              whileHover={{ y: -8, rotateX: 1.5, rotateY: 0.8, z: 12, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.08)" }}
              className="lg:col-span-4"
            >
              <SolverFeedWidget />
            </BentoCard>

            {/* Bento Card 2: Platform Arenas (Compact - 2 Columns) */}
            <BentoCard 
              variants={{
                hidden: { opacity: 0, y: 35, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              whileHover={{ y: -8, rotateX: 1.5, rotateY: -0.8, z: 12, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.08)" }}
              className="lg:col-span-2"
            >
              <PlatformsWidget />
            </BentoCard>

            {/* Bento Card 3: System Flow Widget (Compact - 2 Columns) */}
            <BentoCard 
              variants={{
                hidden: { opacity: 0, y: 35, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              whileHover={{ y: -8, rotateX: 1.5, rotateY: 0.8, z: 12, boxShadow: "0 20px 40px rgba(244, 63, 94, 0.08)" }}
              className="lg:col-span-2"
            >
              <SystemDesignFlowWidget />
            </BentoCard>

            {/* Bento Card 4: Squad Leaderboard (Wide - 4 Columns) */}
            <BentoCard 
              variants={{
                hidden: { opacity: 0, y: 35, scale: 0.96 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
              }}
              whileHover={{ y: -8, rotateX: -0.8, rotateY: 0.8, z: 12, boxShadow: "0 20px 40px rgba(236, 72, 153, 0.08)" }}
              className="lg:col-span-4"
            >
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
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: row.width }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                            className={`h-full rounded-full ${row.color}`}
                          ></motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>
          </motion.div>

          {/* Dedicated Full-Width Algorithm Visualizer Showcase Panel */}
          <div id="terminal-widget" className="mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              whileHover={{ y: -6, boxShadow: "0 25px 50px rgba(239, 68, 68, 0.06)" }}
              transition={{ type: "spring", stiffness: 150, damping: 18 }}
              className="group relative rounded-2xl bg-card/45 dark:bg-card/20 border border-border/45 dark:border-white/5 p-6 md:p-8 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 cursor-pointer"
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
            initial={{ opacity: 0, y: 35, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            whileHover={{ scale: 1.015, borderColor: "rgba(239, 68, 68, 0.35)", boxShadow: "0 0 50px rgba(239, 68, 68, 0.15)" }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            className="relative p-10 md:p-16 rounded-3xl bg-gradient-to-br from-red-500/5 via-rose-500/5 to-transparent dark:from-red-950/30 dark:to-rose-950/15 border border-border/40 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-2xl flex flex-col items-center text-center gap-6 cursor-pointer"
          >
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none animate-float-drift-1"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-float-drift-2"></div>

            {/* Drifting Code Syntax Particles */}
            {CODE_PARTICLES.map((p, idx) => (
              <span
                key={idx}
                className="absolute font-mono text-[9px] font-bold text-primary/15 dark:text-primary/20 pointer-events-none select-none animate-float-drift-1"
                style={{
                  top: p.top,
                  left: p.left,
                  animationDelay: p.delay,
                  animationDuration: p.dur,
                }}
              >
                {p.text}
              </span>
            ))}

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
            <AlgoArenaLogo className="w-6.5 h-6.5" />
            <span className="font-bold text-foreground tracking-tight uppercase font-mono text-sm">AlgoArena</span>
          </div>
          
          <p className="text-center md:text-left text-muted-foreground/80 font-mono">
            &copy; {new Date().getFullYear()} AlgoArena. Engineered for data structures and scalable system engineering.
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

              {/* Controls: Background Geometry */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[9px] uppercase font-semibold text-foreground tracking-wider">Background Geometry</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "Network", val: "network" },
                    { label: "Helix", val: "helix" },
                    { label: "Wave", val: "wave" }
                  ].map((bg) => (
                    <button
                      key={bg.label}
                      onClick={() => setBgEffect(bg.val as "network" | "helix" | "wave")}
                      className={`py-1 rounded text-[9px] text-center font-mono cursor-pointer transition-all border ${
                        bgEffect === bg.val
                          ? "bg-primary border-primary text-white font-bold"
                          : "bg-secondary border-border hover:bg-secondary/70 text-foreground"
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls: Color Spectrum */}
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[9px] uppercase font-semibold text-foreground tracking-wider">Spectrum coordinates</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "Crimson", val: "red" },
                    { label: "Blue", val: "emerald" },
                    { label: "Rose", val: "rose" }
                  ].map((c) => (
                    <button
                      key={c.label}
                      onClick={() => setColorTheme(c.val as "red" | "emerald" | "rose")}
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
                <div className="flex justify-between">
                  <span>GEOM:</span>
                  <span className="text-foreground uppercase">{bgEffect}</span>
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
