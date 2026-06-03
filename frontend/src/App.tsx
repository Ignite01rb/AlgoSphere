import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppProvider } from "@/lib/app-context";
import { MainLayout } from "@/components/layout/MainLayout";

const LandingPage3D = lazy(() => import("./pages/LandingPage3D"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CompanyProblemsPage = lazy(() => import("./pages/CompanyProblemsPage"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VisualizePage = lazy(() => import("./pages/VisualizePage"));
const LinearSearchViz = lazy(() => import("./pages/visualize/LinearSearch"));
const BinarySearchViz = lazy(() => import("./pages/visualize/BinarySearch"));
const StackViz = lazy(() => import("./pages/visualize/StackViz"));
const LinkedListViz = lazy(() => import("./pages/visualize/LinkedListViz"));
const BinaryTreeViz = lazy(() => import("./pages/visualize/BinaryTreeViz"));
const BFSGridViz = lazy(() => import("./pages/visualize/BFSGrid"));
const BubbleSortViz = lazy(() => import("./pages/visualize/BubbleSort"));
const MergeSortViz = lazy(() => import("./pages/visualize/MergeSort"));
const QuickSortViz = lazy(() => import("./pages/visualize/QuickSort"));
const QueueViz = lazy(() => import("./pages/visualize/QueueViz"));
const DFSGridViz = lazy(() => import("./pages/visualize/DFSGrid"));
const DijkstraViz = lazy(() => import("./pages/visualize/Dijkstra"));
const TestCaseGeneratorPage = lazy(() => import("./pages/TestCaseGeneratorPage"));
const SystemDesignPage = lazy(() => import("./pages/SystemDesignPage"));
const SystemDesignTopicPage = lazy(() => import("./pages/SystemDesignTopicPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/" element={<LandingPage3D />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/companies" element={<CompanyProblemsPage />} />
                  <Route path="/challenges" element={<ChallengesPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/visualize" element={<VisualizePage />} />
                  <Route path="/visualize/linear-search" element={<LinearSearchViz />} />
                  <Route path="/visualize/binary-search" element={<BinarySearchViz />} />
                  <Route path="/visualize/stack" element={<StackViz />} />
                  <Route path="/visualize/linked-list" element={<LinkedListViz />} />
                  <Route path="/visualize/binary-tree" element={<BinaryTreeViz />} />
                  <Route path="/visualize/bfs-grid" element={<BFSGridViz />} />
                  <Route path="/visualize/bubble-sort" element={<BubbleSortViz />} />
                  <Route path="/visualize/merge-sort" element={<MergeSortViz />} />
                  <Route path="/visualize/quick-sort" element={<QuickSortViz />} />
                  <Route path="/visualize/queue" element={<QueueViz />} />
                  <Route path="/visualize/dfs-grid" element={<DFSGridViz />} />
                  <Route path="/visualize/dijkstra" element={<DijkstraViz />} />
                  <Route path="/test-generator" element={<TestCaseGeneratorPage />} />
                  <Route path="/system-design" element={<SystemDesignPage />} />
                  <Route path="/system-design/:slug" element={<SystemDesignTopicPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
