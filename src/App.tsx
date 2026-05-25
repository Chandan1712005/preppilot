import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { motion, AnimatePresence } from 'motion/react';
import { SignIn, useUser } from '@clerk/react';
import { cn } from './lib/utils';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Interview = React.lazy(() => import('./pages/Interview'));
const Resume = React.lazy(() => import('./pages/Resume'));
const Research = React.lazy(() => import('./pages/Research'));
const CVMaker = React.lazy(() => import('./components/CVMaker'));
const JobSearch = React.lazy(() => import('./pages/JobSearch'));

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

function SyncUserWithBackend() {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    if (isLoaded && user) {
      // Sync strictly clerkid to the main backend server on port 5000
      fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkid: user.id
        }),
      }).catch(err => console.error('Failed to sync user:', err));
    }
  }, [user, isLoaded]);
  return null;
}

export default function App() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-cyber-navy flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyber-blue/20 border-t-cyber-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-cyber-navy flex items-center justify-center relative overflow-hidden px-4">
        {/* Background neon glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyber-blue/5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyber-purple/5 blur-3xl pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10 flex flex-col items-center gap-6"
        >
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <img
              src="/preppilot_logo.png"
              alt="PrepPilot Logo"
              className="h-20 w-auto object-contain"
            />
          </div>

          <p className="text-sm text-gray-400 text-center max-w-xs font-sans">
            Elevate your engineering potential with real-time biometric mock simulations.
          </p>

          {/* Glassmorphic Clerk wrapper */}
          <div className="w-full glass-card p-2 border border-white/10 shadow-2xl relative bg-black/40">
            <SignIn
              appearance={{
                elements: {
                  card: "bg-transparent shadow-none border-none",
                  headerTitle: "text-white text-xl font-bold",
                  headerSubtitle: "text-gray-400 text-sm",
                  socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-medium",
                  socialButtonsBlockButtonText: "text-white",
                  formButtonPrimary: "bg-cyber-blue hover:bg-cyber-blue/90 text-cyber-navy font-bold uppercase tracking-wider transition-all border-none",
                  formFieldLabel: "text-gray-300 font-mono uppercase tracking-widest text-[10px]",
                  formFieldInput: "bg-white/5 border border-white/10 text-white rounded-lg focus:border-cyber-blue/50 focus:ring-cyber-blue/20 transition-all",
                  footerActionLink: "text-cyber-blue hover:text-cyber-blue/90 transition-colors",
                  identityPreviewText: "text-white",
                  userButtonPopoverActionButtonText: "text-white"
                }
              }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <SyncUserWithBackend />
      <div className="min-h-screen bg-cyber-navy text-gray-200 font-sans">
        <Navbar />
        <Sidebar />

        <main className="pl-64 pt-16 h-screen overflow-hidden">
          <div className="h-full p-8 overflow-y-auto custom-scrollbar">
            <React.Suspense fallback={
              <div className="h-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-cyber-blue/20 border-t-cyber-blue rounded-full animate-spin"></div>
              </div>
            }>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
                  <Route path="/interview" element={<PageWrapper><Interview /></PageWrapper>} />
                  <Route path="/resume" element={<PageWrapper><Resume /></PageWrapper>} />
                  <Route path="/research" element={<PageWrapper><Research /></PageWrapper>} />
                  <Route path="/cv-maker" element={<PageWrapper><CVMaker /></PageWrapper>} />
                  <Route path="/job-search" element={<PageWrapper><JobSearch /></PageWrapper>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AnimatePresence>
            </React.Suspense>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
