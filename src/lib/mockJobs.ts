export interface JobResult {
  JobID: string;
  company: string;
  positionName: string;
  location: string;
  salary: string;
  salaryMin: number;
  salaryMax: number;
  rating: number;
  reviewsCount: number;
  description: string;
  keywords: string[];
  linkedinCompanyUrl?: string;
  externalApplyLink?: string;
  url?: string;
  type: string;
  experience: string;
  domain: string;
  score?: number;
}

const JOB_DATABASE: JobResult[] = [
  {
    JobID: 'J001',
    company: 'Google',
    positionName: 'Senior Software Engineer',
    location: 'Bengaluru, Karnataka',
    salary: 'INR 40L - 80L PA',
    salaryMin: 40,
    salaryMax: 80,
    rating: 4.5,
    reviewsCount: 12420,
    description: 'Lead cloud and distributed systems engineering with a focus on reliability and scalability.',
    keywords: ['distributed', 'cloud', 'microservices', 'python', 'go'],
    linkedinCompanyUrl: 'https://www.linkedin.com/company/google',
    externalApplyLink: 'https://www.linkedin.com/jobs/search/?keywords=Software+Engineer&location=Bengaluru',
    url: 'https://careers.google.com',
    type: 'Full-time',
    experience: '5+ years',
    domain: 'Cloud Infrastructure',
  },
  {
    JobID: 'J002',
    company: 'Microsoft',
    positionName: 'Principal Software Engineer',
    location: 'Hyderabad, Telangana',
    salary: 'INR 45L - 90L PA',
    salaryMin: 45,
    salaryMax: 90,
    rating: 4.3,
    reviewsCount: 9870,
    description: 'Drive Azure platform innovation and architect end-to-end enterprise systems.',
    keywords: ['azure', 'csharp', 'cloud', 'distributed', 'architecture'],
    linkedinCompanyUrl: 'https://www.linkedin.com/company/microsoft',
    externalApplyLink: 'https://www.linkedin.com/jobs/search/?keywords=Principal+Software+Engineer&location=Hyderabad',
    url: 'https://careers.microsoft.com',
    type: 'Full-time',
    experience: '8+ years',
    domain: 'Cloud Enterprise',
  },
  {
    JobID: 'J003',
    company: 'Amazon',
    positionName: 'SDE-II Backend Engineer',
    location: 'Bengaluru, Karnataka',
    salary: 'INR 35L - 70L PA',
    salaryMin: 35,
    salaryMax: 70,
    rating: 4.1,
    reviewsCount: 18340,
    description: 'Design backend services and scale high-performance retail systems on AWS.',
    keywords: ['java', 'aws', 'backend', 'microservices', 'api'],
    linkedinCompanyUrl: 'https://www.linkedin.com/company/amazon',
    externalApplyLink: 'https://www.linkedin.com/jobs/search/?keywords=SDE+Backend&location=Bengaluru',
    url: 'https://www.amazon.jobs',
    type: 'Full-time',
    experience: '4+ years',
    domain: 'E-commerce Cloud',
  },
];

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function computeMatchScore(resumeText: string, job: JobResult) {
  const tokens = tokenize(resumeText);
  const unique = new Set(tokens);
  const keywordHits = job.keywords.filter(keyword => unique.has(keyword.toLowerCase()));
  const score = Math.min(98, Math.max(25, keywordHits.length * 20 + (job.location.toLowerCase().includes('remote') ? 10 : 0)));
  return score;
}

export function matchJobs(resumeText: string, locations: string[], limit: number) {
  const normalizedLocations = locations.map(loc => loc.toLowerCase());
  return JOB_DATABASE
    .map(job => ({ ...job, score: computeMatchScore(resumeText, job) }))
    .filter(job =>
      normalizedLocations.length === 0 ||
      normalizedLocations.some(loc => job.location.toLowerCase().includes(loc) || loc === 'remote')
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
