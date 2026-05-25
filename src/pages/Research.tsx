import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Filter,
  Search,
  Zap,
  ExternalLink,
  Send,
  Bot,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const defaultVideos = [
  {
    id: "5VnSjG9e1jA",
    title: "System Design Interview Prep Checklist",
    description: "The complete checklist for mastering system design interviews at Tier 1 tech companies.",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop",
    channel: "TechMastery",
    url: "https://www.youtube.com/watch?v=5VnSjG9e1jA"
  },
  {
    id: "udDYn3Sja3M",
    title: "Cracking the Coding Interview - Key Patterns",
    description: "Deep dive into the 14 core patterns of algorithmic problem solving.",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&auto=format&fit=crop",
    channel: "AlgoExpert",
    url: "https://www.youtube.com/watch?v=udDYn3Sja3M"
  }
];

export default function Research() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [videosList, setVideosList] = useState<any[]>(defaultVideos);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // Chatbot State
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      role: 'assistant',
      content: 'Hi! I am your Technical Assistant. Ask me anything about system design, coding patterns, or the masterclass tutorials!'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput.trim();
    setChatInput('');

    const userMsg = { id: Date.now(), role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'companion',
          messages: messages.map(m => ({
            sender: m.role === 'user' ? 'user' : 'bot',
            text: m.content
          })),
          userText,
          experienceLevel: 'Advanced',
          topic: 'Technical Masterclass Study'
        }),
      });

      const data = await response.json();
      if (data.success && data.response) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response
        }]);
      } else {
        throw new Error(data.error || 'Failed to get chat response');
      }
    } catch (error: any) {
      console.error("Chatbot assistant failed:", error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Sorry, I encountered an issue connecting. Please try asking again!"
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    setYoutubeError(null);
    setVideosList([]);

    try {
      const youtubeResponse = await fetch('/api/research/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmedQuery }),
      });

      const youtubeData = await youtubeResponse.json();
      if (youtubeResponse.ok && Array.isArray(youtubeData) && youtubeData.length > 0) {
        setVideosList(youtubeData);
      } else if (!youtubeResponse.ok) {
        setYoutubeError(youtubeData?.error || 'Sorry, the YouTube search failed. Please try again.');
      } else {
        setYoutubeError(`No videos found for "${trimmedQuery}". Try a different search term.`);
      }
    } catch (error) {
      console.error('YouTube search failed:', error);
      setYoutubeError('Unable to fetch videos. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: 'Hi! I am your Technical Assistant. Ask me anything about system design, coding patterns, or the masterclass tutorials!'
      }
    ]);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Video Masterclasses</h1>
          <p className="text-gray-400">Immersive, live-streamed mock technical masterclasses from YouTube.</p>
        </div>
        <div className="flex gap-3">
          <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Bookmark className="w-5 h-5" />
          </button>
          <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: Video Feed */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyber-purple to-cyber-blue rounded-2xl blur opacity-10 group-hover:opacity-20 transition-all"></div>
            <div className="relative glass-card flex items-center p-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Query masterclasses, design patterns, or system architectures..."
                className="flex-1 bg-transparent border-none py-4 px-6 text-gray-200 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="bg-cyber-purple text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-cyber-purple/10 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {isSearching ? <Zap className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Analyze
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videosList.length > 0 ? (
              videosList.map((video, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedVideo(video)}
                  className="glass-card neon-border group cursor-pointer hover:bg-white/[0.03] transition-all overflow-hidden"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-black/40">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-cyber-purple text-white flex items-center justify-center shadow-lg shadow-cyber-purple/50 animate-pulse">
                        <Zap className="w-6 h-6 fill-current" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold tracking-widest uppercase py-0.5 px-2 bg-cyber-purple/10 border border-cyber-purple/20 rounded text-cyber-purple">
                        {video.channel}
                      </span>
                    </div>
                    <h3
                      className="text-base font-bold text-white mb-2 group-hover:text-cyber-purple transition-colors line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: video.title }}
                    />
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 mb-4">
                      {video.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[10px] text-gray-500 font-mono">YouTube Video</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVideo(video);
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-cyber-purple uppercase tracking-widest hover:underline decoration-cyber-purple/30 underline-offset-4 cursor-pointer"
                      >
                        Watch Video <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-card border border-white/10 p-8 text-gray-400 text-center col-span-full">
                {isSearching
                  ? 'Searching for videos...'
                  : youtubeError || 'No videos available. Enter a search term to discover related masterclass videos.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant Chatbot */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card flex flex-col h-[580px] border border-white/10 overflow-hidden relative group">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyber-purple to-cyber-blue"></div>

            {/* Chatbot Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center text-cyber-purple">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Study Assistant
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Doubts Clarifier</p>
                </div>
              </div>
              <button
                onClick={handleResetChat}
                title="Reset Chat"
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-2xl p-3 text-xs border transition-all duration-200",
                    msg.role === 'user'
                      ? "bg-cyber-purple/10 border-cyber-purple/30 text-white rounded-br-none ml-auto"
                      : "bg-white/[0.03] border-white/10 text-gray-200 rounded-bl-none mr-auto"
                  )}
                >
                  <span className="font-mono text-[9px] text-gray-500 uppercase mb-1 flex items-center gap-1">
                    {msg.role === 'user' ? 'Candidate' : 'AI Coach'}
                    {msg.role === 'assistant' && <Sparkles className="w-2.5 h-2.5 text-cyber-purple" />}
                  </span>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-bl-none p-3 text-xs text-gray-400 mr-auto max-w-[85%] flex items-center gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-cyber-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyber-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyber-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="font-mono text-[8px] uppercase tracking-wider text-gray-500 ml-1">Analyzing doubt...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Section */}
            <div className="p-3 border-t border-white/10 bg-white/[0.01]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a technical doubt..."
                  disabled={chatLoading}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyber-purple/50 transition-all disabled:opacity-40"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-cyber-purple text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center cursor-pointer shadow-lg shadow-cyber-purple/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Video Player Modal Overlay */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedVideo(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-4xl glass-card overflow-hidden border border-white/10 shadow-2xl z-10"
          >
            {/* Header / Info bar */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase py-0.5 px-2 bg-cyber-purple/10 border border-cyber-purple/20 rounded text-cyber-purple mb-1 inline-block">
                  {selectedVideo.channel}
                </span>
                <h3 className="text-sm font-bold text-white line-clamp-1" dangerouslySetInnerHTML={{ __html: selectedVideo.title }} />
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Iframe Container (16:9 aspect ratio) */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
