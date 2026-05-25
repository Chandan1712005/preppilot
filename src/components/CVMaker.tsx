import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Plus,
  Trash2,
  Eye,
  Code,
  User,
  Briefcase,
  GraduationCap,
  Github,
  BookOpen,
  Heart,
  Copy,
  Check,
  Sparkles,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { marked } from 'marked';
import { cn } from '../lib/utils';

interface Experience {
  title: string;
  since: string;
  till: string;
  tech: string;
  about: string;
}

interface Education {
  title: string;
  since: string;
  till: string;
  tech: string;
  about: string;
}

interface Project {
  title: string;
  url: string;
  desc: string;
}

interface Writing {
  title: string;
  url: string;
}

interface CVProfile {
  fullName: string;
  email: string;
  avatar: string;
  title: string;
  location: string;
  homepage: string;
  twitter: string;
  tech: string;
  about: string;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  writingHabits: string;
  writing: Writing[];
  editor: string;
  os: string;
  terminal: string;
}

const DEFAULT_PROFILE: CVProfile = {
  fullName: "Chandan N",
  email: "chandan.n@google.com",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
  title: "Principal Frontend Architect",
  location: "Bengaluru, India",
  homepage: "https://chandann.dev",
  twitter: "chandann_dev",
  tech: "React, TypeScript, Next.js, Node.js, TailwindCSS, Vite",
  about: "Passionate Frontend Architect with a focus on high-fidelity user experiences, micro-frontends, and reactive web applications. Constantly designing cyber-tactile interfaces that bridge engineering and aesthetics.",
  experience: [
    {
      title: "Senior Lead Engineer at Google AI Studio",
      since: "2023",
      till: "Present",
      tech: "React, Vite, TailwindCSS, LLMs",
      about: "Architected advanced pair-programming agentic UI dashboards, handling real-time WebRTC media streams, live facial analytics telemetry, and responsive split-screen previewers."
    },
    {
      title: "Full Stack Developer at TechSolutions",
      since: "2020",
      till: "2023",
      tech: "Next.js, GraphQL, PostgreSQL, Docker",
      about: "Led the migration of legacy visual portals to micro-frontend architectures, reducing interactive latencies by over 45%."
    }
  ],
  education: [
    {
      title: "M.S. in Software Engineering - IIIT Bangalore",
      since: "2018",
      till: "2020",
      tech: "Java, Python, Distributed Systems",
      about: "Researched high-availability reactive web architectures and completed a thesis on streaming analytics visualization dashboards."
    }
  ],
  projects: [
    {
      title: "PrepPilot Dashboard Portal",
      url: "https://github.com/chandann/prep-pilot",
      desc: "Developed a stunning glassmorphic mock interview simulator featuring live face-tracking reticles, real-time biometrics stress level feedback, and vocal vocabulary richness telemetry."
    }
  ],
  writingHabits: "I love blogging about modern React architectures, compiler optimizations in Vite, and advanced agentic system design paradigms.",
  writing: [
    {
      title: "Mastering React 19 Compiler Directives",
      url: "https://dev.to/chandann/react-19-compiler"
    }
  ],
  editor: "VS Code with Vim Keybindings",
  os: "Windows 11 with WSL2 (Ubuntu)",
  terminal: "Windows Terminal with Oh My Posh"
};

export default function CVMaker() {
  const [profile, setProfile] = useState<CVProfile>(DEFAULT_PROFILE);
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview');
  const [copied, setCopied] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string>('personal');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('minimalist');
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const pageRef = React.useRef<HTMLDivElement>(null);

  // Convert CV profile into beautiful Markdown
  const markdown = generateMarkdown(profile);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    const parseMd = async () => {
      try {
        const parsed = await marked.parse(markdown);
        setPreviewHtml(parsed);
      } catch (err) {
        console.error(err);
      }
    };
    parseMd();
  }, [markdown]);

  useEffect(() => {
    const checkHeight = () => {
      if (pageRef.current) {
        const inner = pageRef.current.querySelector('.resume-content-wrapper');
        if (inner) {
          const height = inner.scrollHeight;
          // 1020px corresponds to roughly 270mm of inside page content
          setIsOverflowing(height > 1020);
        }
      }
    };
    const timer = setTimeout(checkHeight, 150);
    return () => clearTimeout(timer);
  }, [profile, selectedTemplate, compactMode, activeTab]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    downloadFromData(markdown, 'text/plain', `${profile.fullName.toLowerCase().replace(/\s+/g, '_')}_cv.md`);
  };

  const handleExportJSON = () => {
    downloadFromData(JSON.stringify(profile, null, 2), 'application/json', `${profile.fullName.toLowerCase().replace(/\s+/g, '_')}_cv.json`);
  };

  const handlePrintPDF = () => {
    if (!pageRef.current) return;

    const clone = pageRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.width = '210mm';
    clone.style.height = '297mm';
    clone.style.margin = '0 auto';
    clone.style.overflow = 'visible';

    const printContainer = document.createElement('div');
    printContainer.id = 'cv-print-container';
    printContainer.style.position = 'fixed';
    printContainer.style.top = '0';
    printContainer.style.left = '0';
    printContainer.style.width = '100%';
    printContainer.style.minHeight = '100vh';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.zIndex = '999999';
    printContainer.style.padding = '0';
    printContainer.style.margin = '0';
    printContainer.appendChild(clone);

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      if (printContainer.parentNode) {
        document.body.removeChild(printContainer);
      }
    };

    window.addEventListener('afterprint', cleanup);
    document.body.appendChild(printContainer);
    window.print();
    setTimeout(cleanup, 1000);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setProfile(parsed);
      } catch (err) {
        alert("Failed to parse JSON file. Please ensure it follows the correct schema.");
      }
    };
    reader.readAsText(file);
  };

  // State mutator helpers
  const updateField = (field: keyof CVProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', since: '', till: '', tech: '', about: '' }]
    }));
  };

  const removeExperience = (index: number) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index: number, field: keyof Experience, val: string) => {
    setProfile(prev => {
      const list = [...prev.experience];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, experience: list };
    });
  };

  const addEducation = () => {
    setProfile(prev => ({
      ...prev,
      education: [...prev.education, { title: '', since: '', till: '', tech: '', about: '' }]
    }));
  };

  const removeEducation = (index: number) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const updateEducation = (index: number, field: keyof Education, val: string) => {
    setProfile(prev => {
      const list = [...prev.education];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, education: list };
    });
  };

  const addProject = () => {
    setProfile(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', url: '', desc: '' }]
    }));
  };

  const removeProject = (index: number) => {
    setProfile(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const updateProject = (index: number, field: keyof Project, val: string) => {
    setProfile(prev => {
      const list = [...prev.projects];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, projects: list };
    });
  };

  const addWriting = () => {
    setProfile(prev => ({
      ...prev,
      writing: [...prev.writing, { title: '', url: '' }]
    }));
  };

  const removeWriting = (index: number) => {
    setProfile(prev => ({
      ...prev,
      writing: prev.writing.filter((_, i) => i !== index)
    }));
  };

  const updateWriting = (index: number, field: keyof Writing, val: string) => {
    setProfile(prev => {
      const list = [...prev.writing];
      list[index] = { ...list[index], [field]: val };
      return { ...prev, writing: list };
    });
  };

  const renderMinimalist = () => {
    const spacingClass = compactMode ? "space-y-1.5 text-[10px]" : "space-y-3.5 text-xs";
    const sectionSpacing = compactMode ? "space-y-0.5" : "space-y-2";
    const itemSpacing = compactMode ? "py-0.5" : "py-1.5";

    return (
      <div className={cn("resume-content-wrapper flex flex-col justify-between h-full w-full text-left", spacingClass)}>
        <div className="space-y-3 flex-1">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-zinc-200 pb-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900">{profile.fullName}</h1>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{profile.title}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600 mt-2 font-mono">
                {profile.email && <span>{profile.email}</span>}
                {profile.location && <span>• {profile.location}</span>}
                {profile.homepage && (
                  <span>
                    • <a href={profile.homepage} target="_blank" rel="noopener noreferrer" className="hover:underline">{profile.homepage.replace(/^https?:\/\//, '')}</a>
                  </span>
                )}
                {profile.twitter && <span>• @{profile.twitter}</span>}
              </div>
            </div>
            {profile.avatar && (
              <img
                src={profile.avatar}
                alt={profile.fullName}
                className="w-14 h-14 rounded-full border border-zinc-200 object-cover shadow-sm"
              />
            )}
          </div>

          {/* About */}
          {profile.about && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 font-mono border-b border-zinc-150 pb-0.5">// Professional Directives</h2>
              <p className="text-[11px] text-zinc-600 leading-relaxed italic">"{profile.about}"</p>
            </div>
          )}

          {/* Tech Stack */}
          {profile.tech && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 font-mono border-b border-zinc-150 pb-0.5">// Technology Architecture</h2>
              <div className="flex flex-wrap gap-1 pt-1">
                {profile.tech.split(/,\s+/).map((t, idx) => (
                  <span key={idx} className="bg-zinc-100 border border-zinc-200 text-zinc-800 text-[9px] font-mono px-1.5 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {profile.experience && profile.experience.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 font-mono border-b border-zinc-150 pb-0.5">// Work Cycle</h2>
              <div className={compactMode ? "space-y-1.5" : "space-y-3"}>
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className={cn("border-l border-zinc-200 pl-3 ml-0.5", itemSpacing)}>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-bold text-zinc-950">{exp.title}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">{timeframeStr(exp.since, exp.till)}</span>
                    </div>
                    {exp.tech && (
                      <p className="text-[9px] text-zinc-400 font-mono mt-0.5">Stack: {exp.tech}</p>
                    )}
                    {exp.about && (
                      <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">{exp.about}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 font-mono border-b border-zinc-150 pb-0.5">// Open Source / Projects</h2>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {profile.projects.map((proj, idx) => (
                  <div key={idx} className="text-xs p-2 bg-zinc-50/50 border border-zinc-150 rounded">
                    <div className="font-bold text-zinc-950 flex justify-between items-center">
                      <span>{proj.title}</span>
                      {proj.url && (
                        <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-zinc-500 hover:underline font-mono">
                          link
                        </a>
                      )}
                    </div>
                    {proj.desc && (
                      <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{proj.desc}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-black uppercase tracking-wider text-zinc-950 font-mono border-b border-zinc-150 pb-0.5">// Academic Coordinates</h2>
              <div className="space-y-1.5">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-zinc-950">{edu.title}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">{timeframeStr(edu.since, edu.till)}</span>
                    </div>
                    {edu.about && <p className="text-[10px] text-zinc-600 mt-0.5">{edu.about}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workstation Favorites */}
        {(profile.editor || profile.os || profile.terminal) && (
          <div className="border-t border-zinc-150 pt-2 flex justify-between items-center text-[9px] text-zinc-400 font-mono mt-auto shrink-0">
            <span>System Config:</span>
            <div className="flex gap-4">
              {profile.editor && <span>[Editor: {profile.editor}]</span>}
              {profile.os && <span>[OS: {profile.os}]</span>}
              {profile.terminal && <span>[Terminal: {profile.terminal}]</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExecutive = () => {
    const spacingClass = compactMode ? "space-y-1.5 text-[10px]" : "space-y-3.5 text-xs";
    const sectionSpacing = compactMode ? "space-y-0.5" : "space-y-2";
    const itemSpacing = compactMode ? "py-0.5" : "py-1.5";

    return (
      <div className={cn("resume-content-wrapper flex flex-col justify-between h-full w-full text-left font-serif", spacingClass)}>
        <div className="space-y-3 flex-1 text-center">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">{profile.fullName}</h1>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-sans font-medium mt-1">{profile.title}</p>
            <div className="flex justify-center flex-wrap gap-x-3 text-[9px] text-slate-600 mt-1 font-sans">
              {profile.email && <span>{profile.email}</span>}
              {profile.location && <span>• {profile.location}</span>}
              {profile.homepage && <span>• {profile.homepage.replace(/^https?:\/\//, '')}</span>}
              {profile.twitter && <span>• @{profile.twitter}</span>}
            </div>
          </div>

          {/* About */}
          {profile.about && (
            <div className="px-6 py-0.5">
              <p className="text-[11px] text-slate-700 leading-relaxed italic font-serif">"{profile.about}"</p>
            </div>
          )}

          {/* Experience */}
          {profile.experience && profile.experience.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-350 pb-0.5 text-left font-sans">Professional Experience</h2>
              <div className="space-y-2 text-left">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className={itemSpacing}>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-bold text-slate-900">{exp.title}</span>
                      <span className="text-[9px] text-slate-500 italic font-mono">{timeframeStr(exp.since, exp.till)}</span>
                    </div>
                    {exp.tech && (
                      <p className="text-[9px] text-slate-500 italic mt-0.5 font-sans">Specialized tech: {exp.tech}</p>
                    )}
                    {exp.about && (
                      <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">{exp.about}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-350 pb-0.5 text-left font-sans">Significant Technical Projects</h2>
              <div className="space-y-2 text-left">
                {profile.projects.map((proj, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{proj.title}</span>
                      {proj.url && <span className="text-[9px] text-slate-400 font-mono">{proj.url.replace(/^https?:\/\//, '')}</span>}
                    </div>
                    {proj.desc && <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">{proj.desc}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {profile.tech && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-350 pb-0.5 text-left font-sans">Technical Competencies</h2>
              <p className="text-xs text-slate-700 text-left leading-relaxed mt-1 font-serif">
                {profile.tech.split(/,\s+/).join(' • ')}
              </p>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-350 pb-0.5 text-left font-sans">Education & Credentials</h2>
              <div className="space-y-1.5 text-left">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{edu.title}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{timeframeStr(edu.since, edu.till)}</span>
                    </div>
                    {edu.about && <p className="text-[10px] text-slate-600 mt-0.5">{edu.about}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(profile.editor || profile.os || profile.terminal) && (
          <div className="border-t border-slate-300 pt-2 text-[9px] text-slate-400 font-sans mt-auto text-center shrink-0">
            <span>Workstation profile: {profile.editor} | {profile.os} | {profile.terminal}</span>
          </div>
        )}
      </div>
    );
  };

  const renderTwoColumn = () => {
    const spacingClass = compactMode ? "text-[10px]" : "text-xs";
    const itemSpacing = compactMode ? "space-y-1" : "space-y-2.5";

    return (
      <div className={cn("resume-content-wrapper flex flex-col justify-between h-full w-full", spacingClass)} style={{ margin: '-32px', height: 'calc(100% + 64px)', width: 'calc(100% + 64px)' }}>
        <div className="flex flex-1 h-full">
          {/* Left Sidebar */}
          <div className="w-[190px] bg-slate-50 border-r border-slate-200 p-5 flex flex-col justify-between space-y-5 text-left shrink-0">
            <div className="space-y-4">
              {profile.avatar && (
                <div className="flex justify-center">
                  <img
                    src={profile.avatar}
                    alt={profile.fullName}
                    className="w-20 h-20 rounded-xl border border-slate-200 object-cover shadow-sm"
                  />
                </div>
              )}

              {/* Contacts */}
              <div className="space-y-1.5">
                <h3 className="text-[9px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-0.5">Contacts</h3>
                <div className="space-y-1 text-[9px] text-slate-600 font-mono break-all leading-snug">
                  {profile.email && <div>{profile.email}</div>}
                  {profile.location && <div>{profile.location}</div>}
                  {profile.homepage && (
                    <div>
                      <a href={profile.homepage} target="_blank" rel="noopener noreferrer" className="underline">{profile.homepage.replace(/^https?:\/\//, '')}</a>
                    </div>
                  )}
                  {profile.twitter && <div>@{profile.twitter}</div>}
                </div>
              </div>

              {/* Skills */}
              {profile.tech && (
                <div className="space-y-1.5">
                  <h3 className="text-[9px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-0.5">Core Tech</h3>
                  <div className="flex flex-wrap gap-1">
                    {profile.tech.split(/,\s+/).map((t, idx) => (
                      <span key={idx} className="bg-slate-200 text-slate-800 text-[8px] px-1.5 py-0.5 rounded font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Favorites */}
            {(profile.editor || profile.os || profile.terminal) && (
              <div className="space-y-1.5 pt-3 border-t border-slate-200">
                <h3 className="text-[8px] font-bold text-slate-800 uppercase tracking-wider">Dev Profile</h3>
                <div className="space-y-0.5 text-[8px] text-slate-500 font-mono">
                  {profile.editor && <div>IDE: {profile.editor}</div>}
                  {profile.os && <div>OS: {profile.os}</div>}
                  {profile.terminal && <div>Term: {profile.terminal}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Right Main Body */}
          <div className="flex-1 p-5 space-y-3.5 text-left overflow-hidden">
            {/* Header */}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{profile.fullName}</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{profile.title}</p>
            </div>

            {/* About */}
            {profile.about && (
              <div className="space-y-1">
                <p className="text-[11px] text-slate-600 leading-relaxed italic">"{profile.about}"</p>
              </div>
            )}

            {/* Experience */}
            {profile.experience && profile.experience.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">Professional Experience</h2>
                <div className={itemSpacing}>
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900 text-xs">{exp.title}</span>
                        <span className="text-[8px] text-slate-400 font-mono">{timeframeStr(exp.since, exp.till)}</span>
                      </div>
                      {exp.about && (
                        <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">{exp.about}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {profile.projects && profile.projects.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">Engineering Projects</h2>
                <div className={itemSpacing}>
                  {profile.projects.map((proj, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900 text-xs">{proj.title}</span>
                        {proj.url && <span className="text-[8px] text-blue-500 font-mono hover:underline">{proj.url.replace(/^https?:\/\//, '')}</span>}
                      </div>
                      {proj.desc && (
                        <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">{proj.desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div className="space-y-1.5">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5">Education</h2>
                <div className="space-y-1.5">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900 text-xs">{edu.title}</span>
                        <span className="text-[8px] text-slate-400 font-mono">{timeframeStr(edu.since, edu.till)}</span>
                      </div>
                      {edu.about && <p className="text-[10px] text-slate-600 leading-tight">{edu.about}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCyber = () => {
    const spacingClass = compactMode ? "space-y-1 text-[10px]" : "space-y-2.5 text-xs";
    const sectionSpacing = compactMode ? "space-y-0.5" : "space-y-1.5";

    return (
      <div className={cn("resume-content-wrapper flex flex-col justify-between h-full w-full text-left font-mono", spacingClass)} style={{ backgroundColor: '#fafafa', color: '#090d16', border: '2px solid #cbd5e1', padding: '20px' }}>
        <div className="space-y-2.5 flex-1">
          {/* Header */}
          <div className="border-b border-slate-300 pb-1.5 relative">
            <div className="text-[8px] text-cyan-600 font-bold uppercase tracking-widest mb-0.5">// SYSTEM ARCHITECT IDENTITY</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              {profile.fullName.toUpperCase()}
            </h1>
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest mt-0.5">{`[ ROLE: ${profile.title} ]`}</p>
            <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500 mt-2 border-t border-slate-100 pt-1.5 font-mono">
              {profile.email && <span>EMAIL: {profile.email}</span>}
              {profile.location && <span>LOC: {profile.location}</span>}
              {profile.homepage && <span>HTTP: {profile.homepage.replace(/^https?:\/\//, '')}</span>}
              {profile.twitter && <span>TWIT: @{profile.twitter}</span>}
            </div>
          </div>

          {/* About */}
          {profile.about && (
            <div className={sectionSpacing}>
              <div className="text-[8px] text-cyan-600 font-bold tracking-wider">// [ DIRECTIVES SUMMARY ]</div>
              <p className="text-[10px] text-slate-700 bg-slate-50 p-2 border border-slate-200 rounded leading-relaxed">
                {profile.about}
              </p>
            </div>
          )}

          {/* Tech Stack */}
          {profile.tech && (
            <div className={sectionSpacing}>
              <div className="text-[8px] text-cyan-600 font-bold tracking-wider">// [ RUNTIME_TECH_MODULES ]</div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {profile.tech.split(/,\s+/).map((t, idx) => (
                  <span key={idx} className="bg-slate-100 border border-slate-300 text-slate-800 text-[8px] px-1.5 py-0.5 rounded font-mono">
                    {`[${t}]`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {profile.experience && profile.experience.length > 0 && (
            <div className={sectionSpacing}>
              <div className="text-[8px] text-cyan-600 font-bold tracking-wider">// [ EXPERIENCE_TIMELINE ]</div>
              <div className="space-y-1.5">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-cyan-500 pl-2 py-0.5 bg-slate-50/50 border border-slate-100 rounded">
                    <div className="flex justify-between items-baseline text-[11px]">
                      <span className="font-bold text-slate-900">{`* ${exp.title}`}</span>
                      <span className="text-[8px] text-slate-500 font-mono">{timeframeStr(exp.since, exp.till)}</span>
                    </div>
                    {exp.about && (
                      <p className="text-[9px] text-slate-600 mt-0.5 leading-relaxed">{exp.about}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {profile.projects && profile.projects.length > 0 && (
            <div className={sectionSpacing}>
              <div className="text-[8px] text-cyan-600 font-bold tracking-wider">// [ DEPLOYED_PROJECTS ]</div>
              <div className="grid grid-cols-1 gap-1.5">
                {profile.projects.map((proj, idx) => (
                  <div key={idx} className="text-[10px] p-1.5 border border-slate-200 rounded bg-white">
                    <div className="font-bold text-slate-900 flex justify-between items-center">
                      <span>{`> ${proj.title.toUpperCase()}`}</span>
                      {proj.url && <span className="text-[8px] text-slate-400 font-mono">{proj.url.replace(/^https?:\/\//, '')}</span>}
                    </div>
                    {proj.desc && <p className="text-[9px] text-slate-600 mt-0.5 leading-snug">{proj.desc}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Settings Footer */}
        {(profile.editor || profile.os || profile.terminal) && (
          <div className="border-t border-slate-200 pt-1.5 text-[8px] text-slate-400 font-mono mt-auto flex justify-between shrink-0">
            <span>SHELL_OS: {profile.os}</span>
            <span>EDITOR: {profile.editor}</span>
            <span>TERM: {profile.terminal}</span>
          </div>
        )}
      </div>
    );
  };

  const renderCreative = () => {
    const spacingClass = compactMode ? "space-y-1.5 text-[10px]" : "space-y-3.5 text-xs";
    const sectionSpacing = compactMode ? "space-y-0.5" : "space-y-2";

    return (
      <div className={cn("resume-content-wrapper flex flex-col justify-between h-full w-full text-left font-sans", spacingClass)} style={{ borderTop: '6px solid #8b5cf6' }}>
        <div className="space-y-3.5 flex-1 pt-1.5">
          {/* Header */}
          <div className="flex justify-between items-start pb-2.5 border-b border-purple-100">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                {profile.fullName}
              </h1>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5 font-mono">{profile.title}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-500 mt-1.5 font-mono">
                {profile.email && <span>{profile.email}</span>}
                {profile.location && <span>• {profile.location}</span>}
                {profile.homepage && (
                  <span>
                    • <a href={profile.homepage} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{profile.homepage.replace(/^https?:\/\//, '')}</a>
                  </span>
                )}
                {profile.twitter && <span>• @{profile.twitter}</span>}
              </div>
            </div>
            {profile.avatar && (
              <img
                src={profile.avatar}
                alt={profile.fullName}
                className="w-14 h-14 rounded-xl border border-purple-200 object-cover shadow-sm rotate-1 hover:rotate-0 transition-transform"
              />
            )}
          </div>

          {/* About */}
          {profile.about && (
            <div className={sectionSpacing}>
              <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 font-mono">Directives Focus</h2>
              <p className="text-[10px] text-slate-600 leading-relaxed bg-indigo-50/30 p-2 rounded-xl border border-indigo-50/50 italic">
                "{profile.about}"
              </p>
            </div>
          )}

          {/* Experience Timeline */}
          {profile.experience && profile.experience.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 font-mono">Work Timeline</h2>
              <div className="space-y-2.5 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-50">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className="pl-5 relative group">
                    <span className="absolute left-1 top-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-white ring-2 ring-indigo-50"></span>
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-bold text-slate-900">{exp.title}</span>
                      <span className="text-[8px] text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded font-mono">{timeframeStr(exp.since, exp.till)}</span>
                    </div>
                    {exp.tech && (
                      <p className="text-[8px] text-slate-400 mt-0.5 font-mono">Stack: {exp.tech}</p>
                    )}
                    {exp.about && (
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{exp.about}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tech Badges */}
          {profile.tech && (
            <div className={sectionSpacing}>
              <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 font-mono">Expertise Modules</h2>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {profile.tech.split(/,\s+/).map((t, idx) => (
                  <span key={idx} className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 text-purple-700 text-[8px] font-bold px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile.education && profile.education.length > 0 && (
            <div className={sectionSpacing}>
              <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-700 font-mono">Education</h2>
              <div className="space-y-1.5">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="text-xs bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-800">{edu.title}</span>
                      <span className="text-[8px] text-slate-500 font-mono">{timeframeStr(edu.since, edu.till)}</span>
                    </div>
                    {edu.about && <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{edu.about}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(profile.editor || profile.os || profile.terminal) && (
          <div className="border-t border-purple-100 pt-2 text-[9px] text-slate-400 font-mono mt-auto flex justify-between shrink-0">
            <span>SYSTEM: {profile.os}</span>
            <span>TOOLKIT: {profile.editor} | {profile.terminal}</span>
          </div>
        )}
      </div>
    );
  };

  const renderResumeContent = () => {
    switch (selectedTemplate) {
      case 'minimalist':
        return renderMinimalist();
      case 'executive':
        return renderExecutive();
      case 'twocolumn':
        return renderTwoColumn();
      case 'cyber':
        return renderCyber();
      case 'creative':
        return renderCreative();
      default:
        return renderMinimalist();
    }
  };

  const getTemplateFont = (t: string) => {
    switch (t) {
      case 'executive': return 'Georgia, serif';
      case 'cyber': return 'monospace';
      default: return 'sans-serif';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4 h-full flex flex-col">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center text-cyber-blue shadow-[0_0_20px_rgba(34,211,238,0.15)]">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Markdown CV Architect</h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
              Design & compile premium high-fidelity developer resumes
            </p>
          </div>
        </div>

        {/* Global Action items */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 rounded-xl cursor-pointer transition-all uppercase tracking-widest">
            <Upload className="w-4 h-4 text-cyber-purple" /> Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyber-purple/10 hover:bg-cyber-purple/20 border border-cyber-purple/30 text-cyber-purple text-xs font-bold rounded-xl transition-all uppercase tracking-widest cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Export Config
          </button>
          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 rounded-xl transition-all uppercase tracking-widest cursor-pointer"
          >
            <Download className="w-4 h-4" /> Markdown
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyber-blue text-black text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-cyber-blue/15 hover:shadow-cyber-blue/25 hover:scale-[1.02] uppercase tracking-widest cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Main Workspace: Split Screen */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden min-h-0">

        {/* Left Side: Input Form Accordions */}
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">

          {/* Section 1: Personal Coordinates */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'personal' ? '' : 'personal')}
              className="w-full px-6 py-4 flex items-center justify-between bg-black/20 text-left cursor-pointer"
            >
              <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-cyber-blue" /> 1. PERSONAL DIRECTIVES
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {activeAccordion === 'personal' ? '▼' : '►'}
              </span>
            </button>

            <AnimatePresence>
              {activeAccordion === 'personal' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-4 border-t border-white/5 bg-black/10">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Full Name</label>
                        <input
                          type="text"
                          value={profile.fullName}
                          onChange={(e) => updateField('fullName', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Email Coordinate</label>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Target Title</label>
                        <input
                          type="text"
                          value={profile.title}
                          onChange={(e) => updateField('title', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Location</label>
                        <input
                          type="text"
                          value={profile.location}
                          onChange={(e) => updateField('location', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Homepage Link</label>
                        <input
                          type="text"
                          value={profile.homepage}
                          onChange={(e) => updateField('homepage', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Twitter Handle</label>
                        <input
                          type="text"
                          value={profile.twitter}
                          onChange={(e) => updateField('twitter', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Avatar Image URL</label>
                      <input
                        type="text"
                        value={profile.avatar}
                        onChange={(e) => updateField('avatar', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Tech Stack (comma-separated)</label>
                      <input
                        type="text"
                        value={profile.tech}
                        onChange={(e) => updateField('tech', e.target.value)}
                        placeholder="React, TypeScript, CSS, Node..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Summary / About</label>
                      <textarea
                        value={profile.about}
                        onChange={(e) => updateField('about', e.target.value)}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyber-blue/50 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 2: Work Experience */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'experience' ? '' : 'experience')}
              className="w-full px-6 py-4 flex items-center justify-between bg-black/20 text-left cursor-pointer"
            >
              <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-cyber-blue" /> 2. WORK EXPERIENCE
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {activeAccordion === 'experience' ? '▼' : '►'}
              </span>
            </button>

            <AnimatePresence>
              {activeAccordion === 'experience' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-6 border-t border-white/5 bg-black/10">
                    <button
                      onClick={addExperience}
                      className="w-full py-2 bg-cyber-blue/10 hover:bg-cyber-blue/15 border border-cyber-blue/20 text-cyber-blue text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Experience Record
                    </button>

                    <div className="space-y-4">
                      {profile.experience.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative group">
                          <button
                            onClick={() => removeExperience(idx)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove Experience"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="space-y-1 pr-8">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Job Title / Company</label>
                            <input
                              type="text"
                              value={exp.title}
                              onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                              placeholder="e.g. Lead Dev at Google"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Since (Year)</label>
                              <input
                                type="text"
                                value={exp.since}
                                onChange={(e) => updateExperience(idx, 'since', e.target.value)}
                                placeholder="2021"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Till (Year / Current)</label>
                              <input
                                type="text"
                                value={exp.till}
                                onChange={(e) => updateExperience(idx, 'till', e.target.value)}
                                placeholder="Present"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Tech Stack involved</label>
                            <input
                              type="text"
                              value={exp.tech}
                              onChange={(e) => updateExperience(idx, 'tech', e.target.value)}
                              placeholder="React, GraphQL..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Details / Accomplishments</label>
                            <textarea
                              value={exp.about}
                              onChange={(e) => updateExperience(idx, 'about', e.target.value)}
                              placeholder="Describe your primary role and code structures designed..."
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 3: Education */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'education' ? '' : 'education')}
              className="w-full px-6 py-4 flex items-center justify-between bg-black/20 text-left cursor-pointer"
            >
              <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-cyber-blue" /> 3. EDUCATION
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {activeAccordion === 'education' ? '▼' : '►'}
              </span>
            </button>

            <AnimatePresence>
              {activeAccordion === 'education' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-6 border-t border-white/5 bg-black/10">
                    <button
                      onClick={addEducation}
                      className="w-full py-2 bg-cyber-blue/10 hover:bg-cyber-blue/15 border border-cyber-blue/20 text-cyber-blue text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Education Record
                    </button>

                    <div className="space-y-4">
                      {profile.education.map((edu, idx) => (
                        <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative">
                          <button
                            onClick={() => removeEducation(idx)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove Education"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="space-y-1 pr-8">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Course / Institution</label>
                            <input
                              type="text"
                              value={edu.title}
                              onChange={(e) => updateEducation(idx, 'title', e.target.value)}
                              placeholder="e.g. B.S. in Computer Science"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Since (Year)</label>
                              <input
                                type="text"
                                value={edu.since}
                                onChange={(e) => updateEducation(idx, 'since', e.target.value)}
                                placeholder="2016"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Till (Year / Current)</label>
                              <input
                                type="text"
                                value={edu.till}
                                onChange={(e) => updateEducation(idx, 'till', e.target.value)}
                                placeholder="2020"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Specializations / Tech</label>
                            <input
                              type="text"
                              value={edu.tech}
                              onChange={(e) => updateEducation(idx, 'tech', e.target.value)}
                              placeholder="Algorithms, Databases..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Details / Heroic Tales</label>
                            <textarea
                              value={edu.about}
                              onChange={(e) => updateEducation(idx, 'about', e.target.value)}
                              placeholder="Academic honors, GPA, or final engineering project details..."
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 4: Projects / Open Source */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'projects' ? '' : 'projects')}
              className="w-full px-6 py-4 flex items-center justify-between bg-black/20 text-left cursor-pointer"
            >
              <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <Github className="w-4 h-4 text-cyber-blue" /> 4. PROJECTS & OPEN SOURCE
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {activeAccordion === 'projects' ? '▼' : '►'}
              </span>
            </button>

            <AnimatePresence>
              {activeAccordion === 'projects' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-6 border-t border-white/5 bg-black/10">
                    <button
                      onClick={addProject}
                      className="w-full py-2 bg-cyber-blue/10 hover:bg-cyber-blue/15 border border-cyber-blue/20 text-cyber-blue text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Project
                    </button>

                    <div className="space-y-4">
                      {profile.projects.map((proj, idx) => (
                        <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative">
                          <button
                            onClick={() => removeProject(idx)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-2 gap-3 pr-8">
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Project Title</label>
                              <input
                                type="text"
                                value={proj.title}
                                onChange={(e) => updateProject(idx, 'title', e.target.value)}
                                placeholder="PrepPilot Portal"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Repository URL</label>
                              <input
                                type="text"
                                value={proj.url}
                                onChange={(e) => updateProject(idx, 'url', e.target.value)}
                                placeholder="github.com/name/repo"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Details / Description</label>
                            <textarea
                              value={proj.desc}
                              onChange={(e) => updateProject(idx, 'desc', e.target.value)}
                              placeholder="Boast about features, stars, or contributions here..."
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 5: Writings / Articles */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'writing' ? '' : 'writing')}
              className="w-full px-6 py-4 flex items-center justify-between bg-black/20 text-left cursor-pointer"
            >
              <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyber-blue" /> 5. ARTICLES & WRITING
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {activeAccordion === 'writing' ? '▼' : '►'}
              </span>
            </button>

            <AnimatePresence>
              {activeAccordion === 'writing' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-4 border-t border-white/5 bg-black/10">
                    <div className="space-y-1">
                      <label className="text-[8px] text-gray-400 font-mono tracking-widest uppercase">Writing Habits Summary</label>
                      <textarea
                        value={profile.writingHabits}
                        onChange={(e) => updateField('writingHabits', e.target.value)}
                        placeholder="Describe your writing passions, platforms (Dev.to, Medium) etc..."
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono resize-none"
                      />
                    </div>

                    <button
                      onClick={addWriting}
                      className="w-full py-2 bg-cyber-blue/10 hover:bg-cyber-blue/15 border border-cyber-blue/20 text-cyber-blue text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Article Link
                    </button>

                    <div className="space-y-4">
                      {profile.writing.map((art, idx) => (
                        <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative">
                          <button
                            onClick={() => removeWriting(idx)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-2 gap-3 pr-8">
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Article Title</label>
                              <input
                                type="text"
                                value={art.title}
                                onChange={(e) => updateWriting(idx, 'title', e.target.value)}
                                placeholder="Article title"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-gray-500 font-mono tracking-widest uppercase">Article Link / URL</label>
                              <input
                                type="text"
                                value={art.url}
                                onChange={(e) => updateWriting(idx, 'url', e.target.value)}
                                placeholder="dev.to/username/post"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 6: Favorite Tools */}
          <div className="glass-card border border-white/10 overflow-hidden">
            <button
              onClick={() => setActiveAccordion(activeAccordion === 'favorites' ? '' : 'favorites')}
              className="w-full px-6 py-4 flex items-center justify-between bg-black/20 text-left cursor-pointer"
            >
              <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <Heart className="w-4 h-4 text-cyber-blue" /> 6. WORKSTATION FAVORITES
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {activeAccordion === 'favorites' ? '▼' : '►'}
              </span>
            </button>

            <AnimatePresence>
              {activeAccordion === 'favorites' && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 space-y-4 border-t border-white/5 bg-black/10">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Favorite Editor</label>
                        <input
                          type="text"
                          value={profile.editor}
                          onChange={(e) => updateField('editor', e.target.value)}
                          placeholder="e.g. Vim, VS Code"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Operating System</label>
                        <input
                          type="text"
                          value={profile.os}
                          onChange={(e) => updateField('os', e.target.value)}
                          placeholder="Windows/Ubuntu"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Terminal Tool</label>
                        <input
                          type="text"
                          value={profile.terminal}
                          onChange={(e) => updateField('terminal', e.target.value)}
                          placeholder="iTerm2 / Zsh"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyber-blue/50 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Tabbed Previews (Live Render vs Raw Markdown) */}
        <div className="glass-card border border-white/10 flex flex-col min-h-0 relative">

          {/* Output Selector Tab headers */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === 'preview'
                    ? "bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === 'markdown'
                    ? "bg-cyber-blue/15 text-cyber-blue border border-cyber-blue/30 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Code className="w-3.5 h-3.5" /> Raw Markdown
              </button>
            </div>

            {/* Quick clipboard copier */}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-green-400" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy Raw MD
                </>
              )}
            </button>
          </div>

          {/* Active tab window */}
          <div className="flex-1 overflow-hidden p-6 bg-black/10 flex flex-col min-h-0">
            {activeTab === 'markdown' ? (
              <div className="flex-1 overflow-y-auto">
                <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/30 border border-white/5 p-4 rounded-xl selection:bg-cyber-blue/20">
                  {markdown}
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Dynamic Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-black/30 border border-white/5 p-3 rounded-xl shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Style Template:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 'minimalist', name: 'Minimalist' },
                        { id: 'executive', name: 'Executive' },
                        { id: 'twocolumn', name: 'Two-Column' },
                        { id: 'cyber', name: 'Cyber' },
                        { id: 'creative', name: 'Creative' },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplate(t.id)}
                          className={cn(
                            "px-2 py-1 text-[9px] font-bold rounded-lg border uppercase tracking-wider transition-all cursor-pointer",
                            selectedTemplate === t.id
                              ? "bg-cyber-blue/15 text-cyber-blue border-cyber-blue/40 shadow-[0_0_8px_rgba(34,211,238,0.1)]"
                              : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Compact Spacing toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={compactMode}
                        onChange={(e) => setCompactMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:bg-cyber-blue/40 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-cyber-blue"></div>
                      <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">Compact Mode</span>
                    </label>

                    {/* Quick PDF Print button */}
                    <button
                      onClick={handlePrintPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyber-blue hover:bg-cyber-blue/80 text-black text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    >
                      Print / Save PDF
                    </button>
                  </div>
                </div>

                {/* Overflow indicator if content exceeds single page */}
                {isOverflowing && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono px-3 py-1.5 rounded-xl flex items-center justify-between shrink-0">
                    <span>⚠️ Content overflows the A4 page limit. Reduce descriptions or enable Compact Mode.</span>
                    <button onClick={() => setCompactMode(true)} className="underline hover:text-white font-bold ml-2">Enable Compact</button>
                  </div>
                )}

                {/* A4 Document Workspace Panel */}
                <div className="flex-1 overflow-auto bg-black/40 rounded-xl border border-white/5 p-4 flex justify-center items-start min-h-0 relative custom-scrollbar">
                  {/* Simulated A4 Sheet */}
                  <div
                    ref={pageRef}
                    id="resume-print-page"
                    className={cn(
                      "w-[794px] h-[1123px] max-h-[1123px] overflow-hidden bg-white text-black p-8 shadow-2xl relative flex flex-col justify-between select-text shrink-0 transition-all duration-300",
                      `template-${selectedTemplate}`
                    )}
                    style={{
                      fontFamily: getTemplateFont(selectedTemplate),
                      boxSizing: 'border-box'
                    }}
                  >
                    {renderResumeContent()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        /* WebKit custom scrollbar for dashboard */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.3);
        }

        /* Screen CSS for A4 preview */
        #resume-print-page {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Print Media Styles */
        @media print {
          /* Hide everything except the print-page container */
          body * {
            visibility: hidden !important;
          }
          #resume-print-page, #resume-print-page * {
            visibility: visible !important;
          }
          #resume-print-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          
          /* Force page setup */
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Helper: Convert profile state to exact, clean, user-reducer structure Markdown
function generateMarkdown(u: CVProfile): string {
  const divider = '\n---';
  const parts: string[] = [];

  // 1. Header (Avatar + Full Name)
  const avatarMark = u.avatar ? ' ![avatar][]' : '';
  const nameMark = u.fullName ? ` ${u.fullName}` : '';
  if (avatarMark || nameMark) {
    parts.push(`\n#${avatarMark}${nameMark}\n${divider}`);
  }

  // 2. Intro Box (Title, short details, tech stack)
  const titleMark = u.title ? `\n> #### ${u.title}` : '';

  const prettyUrl = (url: string) => url ? url.replace(/^https?:\/\//, '') : '';

  let shortDetailsMark = '';
  const loc = u.location ? ` ${u.location}` : '';
  const hp = u.homepage ? ` &emsp; [${prettyUrl(u.homepage)}][homepage]` : '';
  const tw = u.twitter ? ` &emsp; [@${u.twitter.replace(/^@/, '')}][twitter] ![twit][]` : '';
  if (loc || hp || tw) {
    shortDetailsMark = `\n> ##### ${loc}${hp}${tw}`;
  }

  const techList = (tech: string) => {
    return tech ? tech.split(/,\s+/g).map(el => `\`${el}\``).join(', ') : '';
  };
  const techMark = u.tech ? `\n> ${techList(u.tech)}` : '';

  if (titleMark || shortDetailsMark || techMark) {
    parts.push(`\n${titleMark}${shortDetailsMark}${techMark}\n${divider}`);
  }

  // 3. About
  if (u.about) {
    const blockQuote = u.about.split('\n').map((el, i) => i === 0 ? `> **"** ${el}` : `> ${el}`).join('\n');
    parts.push(`\n${blockQuote}\n\n${divider}`);
  }

  // 4. Experience
  if (u.experience && u.experience.length > 0) {
    const expParts = u.experience.map(e => {
      if (!e) return '';
      const t = e.title ? ` ${e.title}` : '';
      const timeframe = (e.since || e.till) ? ` &emsp; <small>*${timeframeStr(e.since, e.till)}*</small>` : '';
      const heading = (t || timeframe) ? `####${t}${timeframe}` : '';
      const tech = e.tech ? `\n${techList(e.tech)}` : '';
      const about = e.about ? `\n${e.about.split('\n').map(el => `> ${el}`).join('\n')}` : '';
      return (heading || tech || about) ? `\n${heading}${tech}${about}\n${divider}` : '';
    }).join('');
    if (expParts) parts.push(`\n## Experience${expParts}`);
  }

  // 5. Education
  if (u.education && u.education.length > 0) {
    const eduParts = u.education.map(e => {
      if (!e) return '';
      const t = e.title ? ` ${e.title}` : '';
      const timeframe = (e.since || e.till) ? ` &emsp; <small>*${timeframeStr(e.since, e.till)}*</small>` : '';
      const heading = (t || timeframe) ? `####${t}${timeframe}` : '';
      const tech = e.tech ? `\n${techList(e.tech)}` : '';
      const about = e.about ? `\n${e.about.split('\n').map(el => `> ${el}`).join('\n')}` : '';
      return (heading || tech || about) ? `\n${heading}${tech}${about}\n${divider}` : '';
    }).join('');
    if (eduParts) parts.push(`\n## Education${eduParts}`);
  }

  // 6. Open Source / Projects
  if (u.projects && u.projects.length > 0) {
    const projParts = u.projects.map(p => {
      if (!p) return '';
      const url = formatUrl(p.url);
      const title = p.title ? (url ? ` [${p.title}](${url})` : ` ${p.title}`) : '';
      const heading = title ? `####${title}` : '';
      const desc = p.desc ? `\n${p.desc}\n${divider}` : '';
      return (heading || desc) ? `\n${heading}${desc}` : '';
    }).join('');
    if (projParts) parts.push(`\n## Open Source${projParts}`);
  }

  // 7. Writing
  const hasWritingHabits = !!u.writingHabits;
  const hasWritings = u.writing && u.writing.length > 0;
  if (hasWritingHabits || hasWritings) {
    let writingMark = '\n## Writing';
    if (hasWritingHabits) {
      writingMark += `\n> ${u.writingHabits}`;
    }
    if (hasWritings) {
      const writingsList = u.writing.map(w => {
        const url = formatUrl(w.url);
        const title = w.title ? (w.url ? ` [${w.title}](${url}) *<small>@${prettyUrl(url)}</small>*` : ` ${w.title}`) : '';
        return title ? `\n####${title}` : '';
      }).join('');
      writingMark += writingsList;
    }
    writingMark += `\n${divider}`;
    parts.push(writingMark);
  }

  // 8. Favorites
  const hasFavs = u.editor || u.os || u.terminal;
  if (hasFavs) {
    const favHeading = '## Favorites';
    const editor = u.editor ? `\n#### Editor\n${u.editor}` : '';
    const os = u.os ? `\n#### Operating System\n${u.os}` : '';
    const term = u.terminal ? `\n#### Terminal\n${u.terminal}` : '';
    parts.push(`\n${favHeading}${editor}${os}${term}\n${divider}`);
  }

  // 9. Links mappings at the footer
  const avatarArg = u.avatar ? `[avatar]: ${formatUrl(u.avatar)}` : '';
  const twitIco = '\n[twit]: http://cdn-careers.sstatic.net/careers/Img/icon-twitter.png?v=b1bd58ad2034';
  const homepageArg = u.homepage ? `\n[homepage]: ${formatUrl(u.homepage)}` : '';
  const twitterArg = u.twitter ? `\n[twitter]: https://twitter.com/${u.twitter.replace(/^@/, '')}${twitIco}` : '';
  parts.push(`\n${avatarArg}${homepageArg}${twitterArg}`);

  return parts.join('');
}

function timeframeStr(since: string, till: string): string {
  if (since || till) {
    if (since && !till) return `${since} - current`;
    if (!since) return 'current';
    return `${since} - ${till}`;
  }
  return '';
}

function formatUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
    return `http://${url}`;
  }
  return url;
}

function downloadFromData(data: string, type: string, filename: string) {
  var blob = new Blob([data], { type });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.classList.add('hidden');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
