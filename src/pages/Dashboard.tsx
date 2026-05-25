import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import {
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Zap,
  ArrowUpRight,
  Target,
  BrainCircuit,
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const performanceData = [
  { day: 'Mon', score: 65, avg: 60 },
  { day: 'Tue', score: 72, avg: 61 },
  { day: 'Wed', score: 68, avg: 62 },
  { day: 'Thu', score: 85, avg: 63 },
  { day: 'Fri', score: 82, avg: 64 },
  { day: 'Sat', score: 90, avg: 65 },
  { day: 'Sun', score: 94, avg: 66 },
];

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="glass-card neon-border p-6 group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg bg-${color}/10 text-${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-xs font-mono px-2 py-1 rounded bg-green-500/10 text-green-400 flex items-center gap-1`}>
        <ArrowUpRight className="w-3 h-3" /> {trend}
      </span>
    </div>
    <div className="space-y-1">
      <p className="text-gray-400 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const displayName = isLoaded && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Candidate' : 'Candidate';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-cyber-blue/10 via-cyber-navy to-cyber-purple/10 border border-white/5">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome Back, {displayName}</h1>
          <p className="text-gray-400 max-w-xl">Your AI readiness score has improved by <span className="text-cyber-blue font-bold">12%</span> this week. You have 2 mock interviews scheduled for today.</p>
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => navigate('/interview')}
              className="bg-cyber-blue text-cyber-navy font-bold px-6 py-2.5 rounded-lg hover:bg-cyber-blue/90 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              Quick Session
            </button>
            <button className="bg-white/5 text-white font-bold px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
              View Insights
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <BrainCircuit className="w-full h-full scale-150 rotate-12" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Target} label="Readiness Score" value="94%" trend="+2.4%" color="cyber-blue" />
        <StatCard icon={MessageSquare} label="Sessions Completed" value="28" trend="+4" color="cyber-purple" />
        <StatCard icon={Users} label="Peer Comparisons" value="Top 5%" trend="+1.2%" color="blue-400" />
        <StatCard icon={Award} label="Skill Badges" value="12" trend="+3" color="yellow-400" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graph Section */}
        <div className="lg:col-span-2 glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Performance Analytics</h3>
              <p className="text-gray-400 text-sm">Weekly simulation score trends vs community average</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-white/5 rounded-md text-xs font-mono text-gray-400">1W</button>
              <button className="p-2 bg-cyber-blue/20 rounded-md text-xs font-mono text-cyber-blue">1M</button>
              <button className="p-2 bg-white/5 rounded-md text-xs font-mono text-gray-400">3M</button>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A0A10',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#22D3EE"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorScore)"
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#6B7280"
                  strokeDasharray="5 5"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="glass-card p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">Upcoming Simulations</h3>
            <div className="space-y-4">
              {[
                { time: '2:30 PM', role: 'Staff Eng @ Google', difficulty: 'Senior' },
                { time: '5:15 PM', role: 'Frontend Lead @ Vercel', difficulty: 'Lead' },
                { time: 'Tomorrow', role: 'Solutions Architect @ AWS', difficulty: 'Senior' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                  <div className="w-12 h-12 rounded bg-white/5 flex flex-col items-center justify-center border border-white/10">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">{item.time.split(' ')[1] || 'TMR'}</span>
                    <span className="text-sm font-bold text-cyber-blue">{item.time.split(' ')[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{item.role}</p>
                    <p className="text-xs text-gray-500">{item.difficulty} Level</p>
                  </div>
                  <button className="text-gray-500 hover:text-white">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 border border-dashed border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 hover:text-white transition-all">
              Schedule New Simulation
            </button>
          </div>

          <div className="glass-card p-6 border border-white/10 overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyber-purple/10 rounded-full blur-2xl"></div>
            <h3 className="text-lg font-bold text-white mb-2 underline decoration-cyber-purple/50">Tactile Insights</h3>
            <p className="text-sm text-gray-400 mb-4 italic">"Your stress levels spiked during the system design phase. Try practicing deep-breathing techniques during technical deep-dives."</p>
            <div className="flex items-center gap-2 text-cyber-purple font-mono text-[10px] uppercase tracking-widest">
              <Clock className="w-3 h-3" /> 2 hours ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
