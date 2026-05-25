export type ResumeAnalysis = {
    overallScore: number;
    sectionBreakdown: { label: string; score: number; color: string }[];
    atsScore: number;
    readabilityScore: number;
    keywordScore: number;
    topSkills: string[];
    keyStrengths: string[];
    improvementAreas: string[];
    keywords: { word: string; found: boolean }[];
    matchRates: { role: string; rate: number; icon?: any }[];
    estimatedReadTime: string;
    wordCount: number;
};

const COMMON_KEYWORDS = [
    'react', 'node', 'typescript', 'javascript', 'python', 'sql', 'aws', 'docker', 'kubernetes', 'java', 'c++', 'git', 'html', 'css'
];

export function analyzeResume(text: string): ResumeAnalysis {
    const lower = text.toLowerCase();
    const words = (text.match(/\w+/g) || []).length;
    const readMins = Math.max(1, Math.round(words / 200));

    // Simple section checks
    const sections = ['objective', 'projects', 'achievements', 'education', 'experience', 'skills'];
    const sectionBreakdown = sections.map((s) => ({
        label: s.charAt(0).toUpperCase() + s.slice(1),
        score: lower.includes(s) ? 90 : 30,
        color: lower.includes(s) ? '#10B981' : '#F59E0B'
    }));

    // Keyword detection
    const keywords = COMMON_KEYWORDS.map(k => ({ word: k, found: lower.includes(k) }));
    const foundCount = keywords.filter(k => k.found).length;

    const atsScore = Math.min(100, 40 + foundCount * 8 + (words > 800 ? 10 : 0));
    const readabilityScore = Math.min(100, 50 + Math.max(0, 200 - Math.abs(words - 700)) / 7);
    const keywordScore = Math.min(100, Math.round((foundCount / COMMON_KEYWORDS.length) * 100));

    const overallScore = Math.round((atsScore * 0.5) + (readabilityScore * 0.25) + (keywordScore * 0.25));

    const topSkills = keywords.filter(k => k.found).slice(0, 8).map(k => k.word.charAt(0).toUpperCase() + k.word.slice(1));

    const keyStrengths = [
        'Clear section headings (if present)',
        'Relevant technical keywords detected',
        'Concise bullet-style experience entries'
    ];

    const improvementAreas = [
        'Add quantifiable results for projects and roles',
        'Include a short objective/summary at top',
        'List relevant certifications and tools explicitly'
    ];

    const matchRates = [
        { role: 'Frontend Engineer', rate: Math.min(95, 40 + keywordScore + (lower.includes('react') ? 20 : 0)) },
        { role: 'Full Stack Developer', rate: Math.min(92, 35 + keywordScore + (lower.includes('node') ? 20 : 0)) },
        { role: 'Data Analyst', rate: Math.min(88, 25 + (lower.includes('sql') ? 30 : 0) + Math.round(keywordScore / 2)) }
    ];

    return {
        overallScore,
        sectionBreakdown,
        atsScore,
        readabilityScore: Math.round(readabilityScore),
        keywordScore,
        topSkills,
        keyStrengths,
        improvementAreas,
        keywords,
        matchRates,
        estimatedReadTime: `${readMins} min read`,
        wordCount: words
    };
}

export default analyzeResume;
