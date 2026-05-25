import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    FileText, Upload, CheckCircle2, AlertTriangle, Zap,
    Briefcase, ChevronRight, Sparkles, RefreshCw, Target,
    BarChart3, BookOpen, Award, Code2, Eye, TrendingUp,
    Clock, Hash, Star, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { extractResumeText } from '../lib/utils';
import { analyzeResume, type ResumeAnalysis } from '../lib/analyzeResume';

/* ─────────────────────────────────────────────────────── */
/*  Animated score ring                                     */
/* ─────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
    const r = (size / 2) - 12;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * score) / 100;

    const color =
        score >= 80 ? '#22D3EE' :
            score >= 60 ? '#A855F7' : '#EC4899';

    const label =
        score >= 80 ? 'Excellent' :
            score >= 60 ? 'Moderate' : 'Needs Work';

    return (
        <div className="relative inline-flex items-center justify-center ring-glow">
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle cx={size / 2} cy={size / 2} r={r}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={10} fill="none" />
                {/* Progress */}
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r}
                    stroke={color} strokeWidth={10} fill="none"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.6, ease: [0.34, 1.56, 0.64, 1] }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center select-none">
                <motion.span
                    className="text-5xl font-black tracking-tighter"
                    style={{ color }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                >
                    {score}
                </motion.span>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500 mt-0.5">{label}</span>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Mini score bar                                          */
/* ─────────────────────────────────────────────────────── */
function ScoreBar({ label, score, color, delay = 0 }: {
    label: string; score: number; color: string; delay?: number;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-mono">{label}</span>
                <span className="font-bold" style={{ color }}>{score}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  ATS keyword chip                                        */
/* ─────────────────────────────────────────────────────── */
function KeywordChip({ word, found, i }: { word: string; found: boolean; i: number }) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border transition-all',
                found
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-red-500/5 border-red-500/15 text-red-400/60'
            )}
        >
            {found
                ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                : <XCircle className="w-3 h-3 shrink-0" />}
            {word}
        </motion.span>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Floating particle decoration                            */
/* ─────────────────────────────────────────────────────── */
function Particles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        width: `${4 + Math.random() * 6}px`,
                        height: `${4 + Math.random() * 6}px`,
                        background: i % 2 === 0 ? 'rgba(34,211,238,0.3)' : 'rgba(168,85,247,0.3)',
                        left: `${10 + Math.random() * 80}%`,
                        bottom: `${Math.random() * 20}%`,
                        animationDelay: `${i * 0.4}s`,
                        animationDuration: `${2.5 + Math.random() * 2}s`,
                    }}
                />
            ))}
        </div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Drop zone                                               */
/* ─────────────────────────────────────────────────────── */
function DropZone({
    fileName, onFile
}: {
    fileName: string;
    onFile: (f: File) => void;
}) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
    }, [onFile]);

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
                'relative glass-card border-2 border-dashed p-10 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all h-[240px] scan-line',
                dragging
                    ? 'border-cyan-400/60 bg-cyan-500/5 shadow-[0_0_40px_rgba(34,211,238,0.12)]'
                    : 'border-white/10 hover:border-cyan-400/30 hover:bg-white/[0.02]'
            )}
        >
            <Particles />

            <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all border z-10',
                dragging
                    ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_24px_rgba(34,211,238,0.3)]'
                    : 'bg-white/5 border-white/10 group-hover:border-cyan-400/50'
            )}>
                <Upload className={cn('w-7 h-7 transition-colors', dragging ? 'text-cyan-400' : 'text-gray-400')} />
            </div>

            <AnimatePresence mode="wait">
                {fileName ? (
                    <motion.div
                        key="filename"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-center z-10"
                    >
                        <p className="text-sm font-bold text-cyan-400 mb-1 flex items-center gap-2 justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                            {fileName}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">File ready — paste or click "Run Audit"</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="prompt"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-center z-10"
                    >
                        <p className="text-base font-bold text-white mb-1">
                            {dragging ? 'Drop it here!' : 'Drag & drop or click to upload'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">PDF or TXT · Max 5MB</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".txt,.pdf"
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Animated processing screen                              */
/* ─────────────────────────────────────────────────────── */
const STEPS = [
    'Parsing document structure…',
    'Extracting ATS signals…',
    'Scoring keyword density…',
    'Mapping role match rates…',
    'Generating refinement report…',
];

function ProcessingScreen() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setStep(s => (s + 1) % STEPS.length), 700);
        return () => clearInterval(id);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center space-y-10 relative overflow-hidden scan-line"
        >
            <Particles />

            {/* Orbit rings */}
            <div className="relative w-28 h-28">
                <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                <motion.div
                    className="absolute inset-0 border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute inset-3 border-4 border-b-purple-500 border-t-transparent border-r-transparent border-l-transparent rounded-full"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-9 h-9 text-cyan-400" />
                </div>
            </div>

            <div className="text-center space-y-3 z-10">
                <p className="text-xl font-bold text-white">Auditing Resume…</p>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="text-[11px] text-cyan-400 font-mono uppercase tracking-[0.2em]"
                    >
                        {STEPS[step]}
                    </motion.p>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="flex gap-2 justify-center pt-2">
                    {STEPS.map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            animate={{ background: i <= step ? '#22D3EE' : 'rgba(255,255,255,0.1)' }}
                            transition={{ duration: 0.3 }}
                        />
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Results panel                                           */
/* ─────────────────────────────────────────────────────── */
function ResultsPanel({
    analysis,
    onReset,
}: {
    analysis: ResumeAnalysis;
    onReset: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'roles'>('overview');

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
        { id: 'keywords' as const, label: 'Keywords', icon: Hash },
        { id: 'roles' as const, label: 'Role Match', icon: Target },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* ── Header strip ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-cyan-400" />
                    <div>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Audit complete</p>
                        <p className="text-white font-bold text-lg leading-tight">Resume Intelligence Report</p>
                    </div>
                </div>
                <div className="flex gap-2 text-[10px] font-mono text-gray-500 items-center">
                    <Clock className="w-3 h-3" />
                    {analysis.estimatedReadTime}
                    <span className="mx-1 text-white/10">|</span>
                    <Hash className="w-3 h-3" />
                    {analysis.wordCount} words
                </div>
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left: Score ── */}
                <div className="space-y-4">
                    {/* Overall score card */}
                    <div className="glass-card border border-white/10 p-6 flex flex-col items-center text-center relative overflow-hidden scan-line">
                        <Particles />
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-5 z-10">Overall ATS Score</p>
                        <div className="z-10 mb-5">
                            <ScoreRing score={analysis.overallScore} size={160} />
                        </div>
                        <div className="w-full space-y-3 z-10">
                            {analysis.sectionBreakdown.map((s, i) => (
                                <ScoreBar key={s.label} label={s.label} score={s.score} color={s.color} delay={0.2 + i * 0.15} />
                            ))}
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'ATS', value: analysis.atsScore, color: '#22D3EE', icon: Target },
                            { label: 'Read', value: analysis.readabilityScore, color: '#A855F7', icon: BookOpen },
                            { label: 'KW', value: analysis.keywordScore, color: '#EC4899', icon: Code2 },
                        ].map(({ label, value, color, icon: Icon }) => (
                            <motion.div
                                key={label}
                                whileHover={{ scale: 1.04 }}
                                className="glass-card border border-white/8 p-3 flex flex-col items-center gap-1 cursor-default"
                            >
                                <Icon className="w-4 h-4" style={{ color }} />
                                <span className="text-lg font-black" style={{ color }}>{value}</span>
                                <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">{label}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Top skills */}
                    {analysis.topSkills.length > 0 && (
                        <div className="glass-card border border-white/10 p-5">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
                                <Star className="w-3 h-3 text-yellow-400" />
                                Detected Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.topSkills.map((s, i) => (
                                    <motion.span
                                        key={s}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono"
                                    >
                                        {s}
                                    </motion.span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: Tab panel ── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Tab bar */}
                    <div className="flex gap-1 bg-white/3 rounded-xl p-1 border border-white/8">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
                                    activeTab === id
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-300'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ─ Overview Tab ─ */}
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-4"
                            >
                                {/* Strengths */}
                                <div className="glass-card border border-white/10 p-6">
                                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
                                        <div className="p-2.5 bg-green-500/10 rounded-lg">
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Syntactic Strengths</p>
                                            <p className="text-[10px] text-gray-500">Segments matching ATS & recruiter standards</p>
                                        </div>
                                        <span className="ml-auto text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                                            {analysis.keyStrengths.length} found
                                        </span>
                                    </div>
                                    {analysis.keyStrengths.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic text-center py-4">No major strengths detected — add more content to your resume.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {analysis.keyStrengths.map((s, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.08 }}
                                                    className="p-3.5 rounded-xl bg-green-500/5 border border-green-500/10 text-xs text-gray-300 flex items-start gap-3 leading-relaxed"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                                                    {s}
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Improvements */}
                                <div className="glass-card border border-white/10 p-6">
                                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/5">
                                        <div className="p-2.5 bg-yellow-500/10 rounded-lg">
                                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">Recommended Refinements</p>
                                            <p className="text-[10px] text-gray-500">Strategic tweaks to boost screening frequency</p>
                                        </div>
                                        <span className="ml-auto text-[10px] font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                                            {analysis.improvementAreas.length} actions
                                        </span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {analysis.improvementAreas.map((area, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.08 }}
                                                className="flex items-start gap-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/8 hover:border-yellow-500/25 transition-all group"
                                            >
                                                <div className="w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 text-[9px] font-mono font-black shrink-0 mt-0.5">
                                                    {i + 1}
                                                </div>
                                                <p className="text-xs text-gray-300 leading-relaxed flex-1">{area}</p>
                                                <TrendingUp className="w-3.5 h-3.5 text-gray-600 group-hover:text-yellow-400 transition-colors shrink-0 mt-0.5" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─ Keywords Tab ─ */}
                        {activeTab === 'keywords' && (
                            <motion.div
                                key="keywords"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="glass-card border border-white/10 p-6 space-y-5"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white text-sm">ATS Keyword Coverage</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">In-demand keywords scanned from your resume</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-cyan-400">
                                            {analysis.keywords.filter(k => k.found).length}
                                            <span className="text-gray-600 font-normal text-sm"> / {analysis.keywords.length}</span>
                                        </p>
                                        <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">matched</p>
                                    </div>
                                </div>

                                {/* Coverage bar */}
                                <div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(analysis.keywords.filter(k => k.found).length / analysis.keywords.length) * 100}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>

                                {/* Chip grid */}
                                <div className="flex flex-wrap gap-2">
                                    {analysis.keywords.map((kw, i) => (
                                        <KeywordChip key={kw.word} word={kw.word} found={kw.found} i={i} />
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-2 border-t border-white/5 text-[10px] font-mono text-gray-500">
                                    <span className="flex items-center gap-1.5 text-cyan-400">
                                        <CheckCircle2 className="w-3 h-3" /> Found in resume
                                    </span>
                                    <span className="flex items-center gap-1.5 text-red-400/60">
                                        <XCircle className="w-3 h-3" /> Missing — consider adding
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* ─ Roles Tab ─ */}
                        {activeTab === 'roles' && (
                            <motion.div
                                key="roles"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="glass-card border border-white/10 p-6 space-y-5"
                            >
                                <div>
                                    <p className="font-bold text-white text-sm">Role Compatibility Matrix</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">How well your resume profile maps to common tech roles</p>
                                </div>

                                <div className="space-y-4">
                                    {analysis.matchRates.map((role, i) => (
                                        <motion.div
                                            key={role.role}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="group"
                                        >
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/8 hover:border-purple-500/30 transition-all cursor-default">
                                                <div className="text-2xl">{role.icon}</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span className="text-white font-semibold group-hover:text-purple-400 transition-colors">{role.role}</span>
                                                        <span className="font-black text-purple-400">{role.rate}%</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${role.rate}%` }}
                                                            transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }}
                                                        />
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-gray-400 leading-relaxed flex gap-3">
                                    <Eye className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                    Scores are derived from keyword frequency, section structure, and technical skill overlap against real job description patterns.
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reset button */}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onReset}
                        className="w-full py-3.5 bg-white/3 border border-white/8 text-gray-500 hover:text-white hover:bg-white/8 hover:border-white/15 font-bold tracking-widest uppercase transition-all rounded-xl text-[10px] font-mono flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset & Upload New Profile
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────── */
/*  Main Resume page                                        */
/* ─────────────────────────────────────────────────────── */
export default function Resume() {
    const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
    const [resumeText, setResumeText] = useState('');
    const [fileName, setFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [charCount, setCharCount] = useState(0);

    const handleFile = useCallback(async (file: File) => {
        setFileName(file.name);
        try {
            const text = await extractResumeText(file);
            if (text.trim()) {
                setResumeText(text);
                setCharCount(text.length);
            } else {
                throw new Error('empty');
            }
        } catch {
            try {
                const fb = await (file as any).text();
                if (fb?.trim()) {
                    setResumeText(fb);
                    setCharCount(fb.length);
                }
            } catch {
                alert('Could not extract text. Please paste your resume manually.');
            }
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        if (!resumeText.trim()) return;
        setIsProcessing(true);
        setAnalysis(null);

        // Artificial delay so the processing animation feels real
        await new Promise(r => setTimeout(r, 2800));

        const result = analyzeResume(resumeText);
        setAnalysis(result);
        setIsProcessing(false);
    }, [resumeText]);

    const handleReset = useCallback(() => {
        setAnalysis(null);
        setResumeText('');
        setFileName('');
        setCharCount(0);
        setIsProcessing(false);
    }, []);

    const canAnalyze = resumeText.trim().length > 0 && !isProcessing;

    return (
        <div className="min-h-screen bg-[#0A0F1E] bg-grid text-white">
            <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">

                {/* ── Page Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">AI-Powered</p>
                        </div>
                        <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                            <FileText className="w-10 h-10 text-cyan-400" />
                            Resume Intelligence
                        </h1>
                        <p className="text-gray-400 text-sm mt-1.5 max-w-md">
                            Deep structural & keyword audit of your CV — powered by real heuristic ATS scoring.
                        </p>
                    </div>

                    {/* Credit badge */}
                    <div className="glass-card border border-white/8 px-5 py-3 flex items-center gap-4 shrink-0">
                        <div className="text-right">
                            <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">Weekly Credits</p>
                            <p className="text-xl font-black text-cyan-400">8 <span className="text-gray-600 font-normal text-sm">/ 10</span></p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-cyan-400 fill-current" />
                        </div>
                    </div>
                </motion.div>

                {/* ── Feature pills ── */}
                {!analysis && !isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-wrap gap-2"
                    >
                        {[
                            { icon: Target, label: 'ATS Scoring' },
                            { icon: Award, label: 'Section Detection' },
                            { icon: BarChart3, label: 'Keyword Density' },
                            { icon: Briefcase, label: 'Role Match Matrix' },
                            { icon: TrendingUp, label: 'Actionable Fixes' },
                        ].map(({ icon: Icon, label }) => (
                            <span key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/4 border border-white/8 text-[10px] font-mono text-gray-400">
                                <Icon className="w-3 h-3 text-cyan-400" />
                                {label}
                            </span>
                        ))}
                    </motion.div>
                )}

                {/* ── Input Section ── */}
                <AnimatePresence mode="wait">
                    {!analysis && !isProcessing && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            {/* Drop zone */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Upload File</label>
                                <DropZone fileName={fileName} onFile={handleFile} />
                            </div>

                            {/* Paste area */}
                            <div className="space-y-2 flex flex-col">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Paste Resume Text</label>
                                    {charCount > 0 && (
                                        <span className="text-[9px] font-mono text-gray-600">{charCount} chars</span>
                                    )}
                                </div>

                                <textarea
                                    rows={9}
                                    value={resumeText}
                                    onChange={e => {
                                        setResumeText(e.target.value);
                                        setCharCount(e.target.value.length);
                                    }}
                                    placeholder="Paste your resume, CV, or raw skills list here to begin the audit…"
                                    className="flex-1 w-full bg-black/40 border border-white/8 rounded-xl p-4 text-sm text-gray-200 font-mono focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none min-h-[190px] placeholder:text-gray-700"
                                />

                                {/* Analyze button */}
                                <motion.button
                                    whileHover={canAnalyze ? { scale: 1.01 } : {}}
                                    whileTap={canAnalyze ? { scale: 0.98 } : {}}
                                    onClick={handleAnalyze}
                                    disabled={!canAnalyze}
                                    className={cn(
                                        'w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer',
                                        canAnalyze
                                            ? 'bg-cyan-400 text-[#0A0F1E] shadow-[0_0_30px_rgba(34,211,238,0.25)] hover:shadow-[0_0_50px_rgba(34,211,238,0.4)]'
                                            : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/8'
                                    )}
                                >
                                    <Zap className={cn('w-4 h-4', canAnalyze && 'fill-current')} />
                                    Run AI Resume Audit
                                </motion.button>

                                {!resumeText.trim() && (
                                    <p className="text-[9px] text-gray-700 font-mono text-center uppercase tracking-widest">
                                        Upload a file or paste text to enable analysis
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── Processing ── */}
                    {isProcessing && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <ProcessingScreen />
                        </motion.div>
                    )}

                    {/* ── Results ── */}
                    {analysis && !isProcessing && (
                        <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <ResultsPanel analysis={analysis} onReset={handleReset} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Footer note ── */}
                {!analysis && !isProcessing && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-[10px] text-gray-700 font-mono text-center"
                    >
                        Analysis runs locally in your browser. Your resume text is never sent to a third-party server.
                    </motion.p>
                )}
            </div>
        </div>
    );
}
