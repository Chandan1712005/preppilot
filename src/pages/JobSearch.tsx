import React, { useState } from 'react';
import { Upload, Briefcase, MapPin, Download, ExternalLink } from 'lucide-react';
import { extractResumeText } from '../lib/utils';
import { matchJobs, type JobResult } from '../lib/mockJobs';

export default function JobSearch() {
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [matchedJobs, setMatchedJobs] = useState<JobResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const allLocations = [
    'Bengaluru, Karnataka',
    'Hyderabad, Telangana',
    'Mumbai, Maharashtra',
    'Pune, Maharashtra',
    'Noida, Uttar Pradesh',
    'Gurgaon, Haryana',
    'Kolkata, West Bengal',
    'Chennai, Tamil Nadu',
    'Remote',
  ];

  const toggleLocation = (location: string) => {
    setSelectedLocations(current =>
      current.includes(location)
        ? current.filter(item => item !== location)
        : [...current, location]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const text = await extractResumeText(file);
      if (text.trim()) {
        setResumeText(text);
        return;
      }
    } catch {
    }

    try {
      const fallbackText = await file.text();
      if (fallbackText.trim()) {
        setResumeText(fallbackText);
      }
    } catch {
    }
  };

  const handleSearch = async () => {
    if (!resumeText.trim()) {
      alert('Please upload or paste your resume text first.');
      return;
    }

    setIsProcessing(true);
    const results = matchJobs(resumeText, selectedLocations, 20);
    setMatchedJobs(results);
    setIsProcessing(false);
  };

  const downloadCSV = () => {
    if (!matchedJobs.length) return;
    const headers = ['Company', 'Position', 'Location', 'Salary', 'Rating', 'Score', 'LinkedIn Company URL'];
    const rows = matchedJobs.map(job => [
      `"${job.company}"`,
      `"${job.positionName}"`,
      `"${job.location}"`,
      `"${job.salary}"`,
      job.rating,
      `${job.score ?? 0}%`,
      `"${job.linkedinCompanyUrl || job.externalApplyLink || job.url || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `job_recommendations_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#040714] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Job Lens</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Job Lens: Resume to company fit with LinkedIn links</h1>
            <p className="mt-3 max-w-2xl text-gray-400">Upload your resume or paste your text, choose target locations, and get matched jobs with LinkedIn company links.</p>
          </div>
          <button
            type="button"
            onClick={downloadCSV}
            disabled={!matchedJobs.length}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-black transition disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Upload resume</p>
                <p className="text-sm text-gray-400">PDF or plain text input will be parsed for matching.</p>
              </div>
            </div>
            <label className="block rounded-3xl border border-dashed border-white/15 bg-black/40 p-6 text-center cursor-pointer transition hover:border-cyan-400/30">
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} />
              <p className="text-sm text-gray-300">Click to upload or drag a file here</p>
              <p className="mt-2 text-xs text-gray-500">{fileName || 'No file selected'}</p>
            </label>
            <textarea
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              rows={7}
              placeholder="Paste your resume content here"
              className="w-full rounded-3xl border border-white/10 bg-black/60 p-4 text-sm text-gray-100 outline-none transition focus:border-cyan-400"
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-cyan-300" />
                <div>
                  <p className="font-semibold">Target locations</p>
                  <p className="text-sm text-gray-400">Select one or more preferred hubs.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {allLocations.map(location => (
                  <button
                    type="button"
                    key={location}
                    onClick={() => toggleLocation(location)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${selectedLocations.includes(location)
                      ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-gray-200 hover:border-cyan-400/30 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{location}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isProcessing || !resumeText.trim()}
              className="w-full rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-40"
            >
              {isProcessing ? 'Finding matches...' : 'Find LinkedIn-friendly jobs'}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Recommendation feed</p>
              <h2 className="text-2xl font-semibold">Matched companies</h2>
            </div>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">{matchedJobs.length} matches</span>
          </div>

          {matchedJobs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-black/40 p-8 text-center text-gray-400">
              Upload your resume and run the match to see company recommendations with LinkedIn links.
            </div>
          ) : (
            <div className="grid gap-4">
              {matchedJobs.map(job => (
                <article key={job.JobID} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-gray-400">{job.domain}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{job.positionName}</h3>
                      <p className="mt-1 text-sm text-gray-300">{job.company} · {job.location}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-white/5 px-3 py-2 text-sm text-gray-200">{job.salary}</span>
                      <span className="rounded-full bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">{job.score ?? 0}% match</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>{job.description}</p>
                      <p className="text-xs text-gray-500">Experience: {job.experience} · Type: {job.type} · Rating: {job.rating} ⭐</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={job.linkedinCompanyUrl || job.externalApplyLink || job.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400"
                      >
                        <ExternalLink className="h-4 w-4" /> Open LinkedIn
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
