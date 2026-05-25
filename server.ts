import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// English Stopwords List for job matching NLP engine
const STOPWORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", "you'd",
  'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers',
  'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
  'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
  'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
  'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should',
  "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't",
  'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't",
  'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't",
  'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't", '●', '–', '’'
]);

// Basic NLP preprocessing: tokenization, stopwords filter, and simple stemming
function preprocessText(text: string): string[] {
  if (!text) return [];
  const tokens = text.toLowerCase()
    .replace(/[^\w\s+#_-]/g, ' ')
    .split(/\s+/);

  const processed: string[] = [];
  for (const token of tokens) {
    if (token.length <= 1 || STOPWORDS.has(token)) continue;
    // Suffix stemmer
    let stem = token;
    if (stem.endsWith('ing')) stem = stem.slice(0, -3);
    else if (stem.endsWith('ed')) stem = stem.slice(0, -2);
    else if (stem.endsWith('es')) stem = stem.slice(0, -2);
    else if (stem.endsWith('s') && !stem.endsWith('ss')) stem = stem.slice(0, -1);

    if (stem.length > 1) {
      processed.push(stem);
    }
  }
  return processed;
}

// State-machine CSV Parser to handle double quotes, commas, and embedded newlines
function parseCSV(content: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  const len = content.length;

  for (let i = 0; i < len; i++) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++; // skip \n
      }
      row.push(current);
      result.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  if (row.length > 0 || current !== '') {
    row.push(current);
    result.push(row);
  }
  return result;
}

interface JobDatasetItem {
  JobID: string;
  company: string;
  positionName: string;
  description: string;
  salary: string;
  location: string;
  rating: number;
  reviewsCount: number;
  postedAt: string;
  externalApplyLink: string;
  url: string;
  All: string;
  tokens: string[];
  tfidfVec: Map<string, number>;
  tfidfNorm: number;
  tfVec: Map<string, number>;
  tfNorm: number;
}

let indexedJobs: JobDatasetItem[] = [];
const idfMap = new Map<string, number>();

// Unified AI Content Generation Helper supporting both native Gemini and OpenRouter proxies
async function generateAIContent(
  model: string,
  systemInstruction: string,
  messages: any[],
  responseMimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || "";

  if (apiKey.startsWith("sk-or-v1-")) {
    const openRouterModel = model.includes("pro") ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash";
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });

    const formattedMessages = [
      ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
      ...messages.map((m: any) => {
        let textVal = "";
        if (Array.isArray(m.parts)) {
          textVal = m.parts[0]?.text || "";
        } else if (typeof m.content === "string") {
          textVal = m.content;
        } else if (typeof m.text === "string") {
          textVal = m.text;
        }
        return {
          role: m.role === "model" || m.sender === "bot" ? "assistant" : "user",
          content: textVal
        };
      })
    ];

    const response = await openai.chat.completions.create({
      model: openRouterModel,
      messages: formattedMessages as any,
      max_tokens: 2000,
      response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined
    });

    return response.choices?.[0]?.message?.content || "";
  } else {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model,
      contents: messages,
      config: {
        systemInstruction,
        responseMimeType,
      }
    });
    return response.text || "";
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load and Index CSV Jobs on Startup
  try {
    const csvPath = path.join(process.cwd(), 'data', 'preprocessed_jobs.csv');
    console.log(`[Job Search] Loading dataset from ${csvPath}...`);
    if (fs.existsSync(csvPath)) {
      const startTime = Date.now();
      const content = fs.readFileSync(csvPath, 'utf8');
      const rows = parseCSV(content);
      const headers = rows[0];

      const jobs: JobDatasetItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (r.length < headers.length) continue;

        const job: any = {};
        headers.forEach((h, idx) => {
          const key = h === '' ? 'index' : h;
          job[key] = r[idx];
        });

        const item: JobDatasetItem = {
          JobID: job.JobID || String(i),
          company: job.company || "Not Provided",
          positionName: job.positionName || "Not Provided",
          description: job.description || "",
          salary: job.salary || "Not Provided",
          location: job.location || "Not Provided",
          rating: parseFloat(job.rating) || 0.0,
          reviewsCount: parseInt(job.reviewsCount) || 0,
          postedAt: job.postedAt || "Recent",
          externalApplyLink: job.externalApplyLink || "https://in.indeed.com",
          url: job.url || "https://in.indeed.com",
          All: job.All || "",
          tokens: [],
          tfidfVec: new Map(),
          tfidfNorm: 0,
          tfVec: new Map(),
          tfNorm: 0
        };

        item.tokens = preprocessText(item.All || `${item.company} ${item.positionName} ${item.description}`);
        jobs.push(item);
      }

      console.log(`[Job Search] Loaded ${jobs.length} jobs. Building TF-IDF indices...`);

      // Calculate Document Frequencies (DF)
      const dfMap = new Map<string, number>();
      jobs.forEach(job => {
        const uniqueTokens = new Set(job.tokens);
        uniqueTokens.forEach(t => {
          dfMap.set(t, (dfMap.get(t) || 0) + 1);
        });
      });

      // Calculate IDF Map
      const N = jobs.length;
      dfMap.forEach((dfVal, t) => {
        const idf = Math.log((1 + N) / (1 + dfVal)) + 1;
        idfMap.set(t, idf);
      });

      // Precompute vectors
      jobs.forEach(job => {
        const tf = new Map<string, number>();
        job.tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));

        const tfidfVec = new Map<string, number>();
        let tfidfNormSq = 0;
        tf.forEach((count, t) => {
          const idf = idfMap.get(t) || 0;
          const tfidfVal = count * idf;
          tfidfVec.set(t, tfidfVal);
          tfidfNormSq += tfidfVal * tfidfVal;
        });
        job.tfidfVec = tfidfVec;
        job.tfidfNorm = Math.sqrt(tfidfNormSq);

        let countNormSq = 0;
        tf.forEach((count) => {
          countNormSq += count * count;
        });
        job.tfVec = tf;
        job.tfNorm = Math.sqrt(countNormSq);
      });

      indexedJobs = jobs;
      console.log(`[Job Search] Index building finished in ${Date.now() - startTime}ms.`);
    } else {
      console.warn(`[Job Search] Dataset CSV file not found at ${csvPath}. Fallback matching will be used.`);
    }
  } catch (err) {
    console.error(`[Job Search] Failed to load dataset:`, err);
  }

  // NLP matching algorithm: KNN, TF-IDF, and Count Vectorizer weighted cosine similarity
  function recommendJobs(resumeText: string, targetLocations: string[] = [], limit: number = 10) {
    if (indexedJobs.length === 0) {
      // Fallback to simple matching if dataset failed to load
      console.warn("[Job Search] Indexed jobs empty. Using fallback seedJobs matcher.");
      const cleanText = resumeText.toLowerCase();
      const matched = seedJobs.map((job) => {
        let matchCount = 0;
        job.keywords.forEach((keyword) => {
          if (cleanText.includes(keyword.toLowerCase())) {
            matchCount++;
          }
        });
        const baseScore = job.keywords.length > 0 ? Math.round((matchCount / job.keywords.length) * 100) : 0;
        const finalScore = Math.min(98, Math.max(12, baseScore));
        return { ...job, score: finalScore };
      });

      let filtered = matched;
      if (targetLocations.length > 0) {
        filtered = matched.filter((job) => {
          return targetLocations.some((loc) => {
            const l = loc.toLowerCase().split(',')[0].trim();
            return job.location.toLowerCase().includes(l) || l.includes(job.location.toLowerCase());
          });
        });
      }
      filtered.sort((a, b) => b.score - a.score || b.rating - a.rating);
      return filtered.slice(0, limit);
    }

    const resumeTokens = preprocessText(resumeText);
    if (resumeTokens.length === 0) return [];

    const resumeTf = new Map<string, number>();
    resumeTokens.forEach(t => resumeTf.set(t, (resumeTf.get(t) || 0) + 1));

    const resumeTfidfVec = new Map<string, number>();
    let resumeTfidfNormSq = 0;
    resumeTf.forEach((count, t) => {
      const idf = idfMap.get(t) || 0;
      const tfidfVal = count * idf;
      resumeTfidfVec.set(t, tfidfVal);
      resumeTfidfNormSq += tfidfVal * tfidfVal;
    });
    const resumeTfidfNorm = Math.sqrt(resumeTfidfNormSq);

    let resumeCountNormSq = 0;
    resumeTf.forEach((count) => {
      resumeCountNormSq += count * count;
    });
    const resumeCountNorm = Math.sqrt(resumeCountNormSq);

    interface MatchScoreItem {
      job: JobDatasetItem;
      tfidfSim: number;
      cvSim: number;
      knnDistance: number;
    }

    const scores: MatchScoreItem[] = [];

    for (const job of indexedJobs) {
      if (targetLocations.length > 0) {
        const jobLoc = (job.location || "").toLowerCase();
        const matchLoc = targetLocations.some(loc => {
          const l = loc.toLowerCase().split(',')[0].trim();
          return jobLoc.includes(l) || l.includes(jobLoc);
        });
        if (!matchLoc) continue;
      }

      let tfidfDot = 0;
      resumeTfidfVec.forEach((val, t) => {
        if (job.tfidfVec.has(t)) {
          tfidfDot += val * job.tfidfVec.get(t)!;
        }
      });
      const tfidfSim = resumeTfidfNorm > 0 && job.tfidfNorm > 0
        ? tfidfDot / (resumeTfidfNorm * job.tfidfNorm)
        : 0;

      let cvDot = 0;
      resumeTf.forEach((val, t) => {
        if (job.tfVec.has(t)) {
          cvDot += val * job.tfVec.get(t)!;
        }
      });
      const cvSim = resumeCountNorm > 0 && job.tfNorm > 0
        ? cvDot / (resumeCountNorm * job.tfNorm)
        : 0;

      const knnDistance = 1 - tfidfSim;

      scores.push({
        job,
        tfidfSim,
        cvSim,
        knnDistance
      });
    }

    if (scores.length === 0) return [];

    let minTfidf = Infinity, maxTfidf = -Infinity;
    let minCv = Infinity, maxCv = -Infinity;
    let minKnn = Infinity, maxKnn = -Infinity;

    scores.forEach(s => {
      if (s.tfidfSim < minTfidf) minTfidf = s.tfidfSim;
      if (s.tfidfSim > maxTfidf) maxTfidf = s.tfidfSim;

      if (s.cvSim < minCv) minCv = s.cvSim;
      if (s.cvSim > maxCv) maxCv = s.cvSim;

      if (s.knnDistance < minKnn) minKnn = s.knnDistance;
      if (s.knnDistance > maxKnn) maxKnn = s.knnDistance;
    });

    const rangeTfidf = maxTfidf - minTfidf || 1;
    const rangeCv = maxCv - minCv || 1;
    const rangeKnn = maxKnn - minKnn || 1;

    const results = scores.map(s => {
      const scaledTfidf = (s.tfidfSim - minTfidf) / rangeTfidf;
      const scaledCv = (s.cvSim - minCv) / rangeCv;
      const scaledKnn = (s.knnDistance - minKnn) / rangeKnn;

      const wKnn = (1 - scaledKnn) / 3;
      const wTfidf = scaledTfidf / 3;
      const wCv = scaledCv / 3;
      const finalScore = wKnn + wTfidf + wCv;

      let jobKeywords = Array.from(new Set(s.job.tokens)).slice(0, 10);
      if (jobKeywords.length === 0) {
        jobKeywords = ["development", "engineering", "technical", "coding", "software"];
      }

      return {
        JobID: s.job.JobID,
        company: s.job.company,
        positionName: s.job.positionName,
        description: s.job.description,
        salary: s.job.salary || "Not Provided",
        location: s.job.location,
        rating: s.job.rating,
        reviewsCount: s.job.reviewsCount,
        externalApplyLink: s.job.externalApplyLink,
        url: s.job.url,
        score: Math.min(99, Math.max(12, Math.round(finalScore * 100))),
        keywords: jobKeywords
      };
    });

    results.sort((a, b) => b.score - a.score || b.rating - a.rating);
    return results.slice(0, limit);
  }

  // API Routes
  app.post("/api/interview/chat", async (req, res) => {
    try {
      const { mode, experienceLevel, company, topic, resumeContext, messages, userText } = req.body;

      if (mode) {
        let dynamicSystemInstruction = "";
        if (mode === "companion") {
          dynamicSystemInstruction =
            "You are a warm, casual, and highly empathetic companion chatbot. Your goal is to talk with the user about anything on their mind, help them relax, have casual conversations, share jokes, or provide a safe space to vent. Keep your tone lighthearted, friendly, caring, and conversational. Do not behave like an interviewer; be a supportive friend. Keep your responses relatively short, conversational, and friendly.";
        } else {
          dynamicSystemInstruction =
            `You are a world-class AI Interviewer and Technical Coach. You are conducting a mock technical interview for a ${experienceLevel || 'Beginner'} level role at ${company || 'a tech company'} on the topic of ${topic || 'general technical topics'}. ` +
            `${resumeContext ? `Here is the candidate's resume/background for context: ${resumeContext}\n\n` : ''}` +
            `Your job is to conduct an interactive mock interview. When asking questions, ask exactly one question at a time. ` +
            `If the user asks for a question (e.g., starting with QUESTION_REQUEST), respond directly by asking a single high-quality question suited for their target experience level and topic. Do not provide answers, solutions, or lists of multiple questions. ` +
            `When the user provides an answer (starting with USER_ANSWER), acknowledge their input with brief constructive feedback or follow-up question, but DO NOT list the answer. ` +
            `If the interview is complete (starting with INTERVIEW_COMPLETE), provide a comprehensive, deep analysis of their interview performance. Include: Overall Score (0-100), Strengths (as a clear bulleted list), Areas for Improvement (as a clear bulleted list), and separate rating numbers (from 1 to 10) for Communication, Technical, and Confidence. ` +
            `Format the final analysis clearly with standard labels (e.g., 'Overall Score: XX', 'Strengths:', 'Areas for Improvement:', 'Communication: X/10', 'Technical: X/10', 'Confidence: X/10', followed by a 'Detailed Feedback' section) so that a regex script can easily parse the scores and bullet points.`;
        }

        const geminiHistory = (messages || [])
          .filter((m: any) => m.sender === 'user' || m.sender === 'bot')
          .map((m: any) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }));

        const responseText = await generateAIContent(
          "gemini-2.5-flash",
          dynamicSystemInstruction,
          [...geminiHistory, { role: 'user', parts: [{ text: userText }] }]
        );

        return res.json({
          success: true,
          response: responseText,
          text: responseText
        });
      } else {
        const { message, history, systemInstruction } = req.body;

        const responseText = await generateAIContent(
          "gemini-2.5-flash",
          systemInstruction || "You are a professional technical interviewer.",
          [...history, { role: 'user', parts: [{ text: message }] }]
        );

        return res.json({
          success: true,
          response: responseText,
          text: responseText
        });
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to generate AI response" });
    }
  });

  app.post("/api/analyze/resume", async (req, res) => {
    try {
      const { resumeText } = req.body;
      if (!resumeText || resumeText.trim().length === 0) {
        return res.status(400).json({ error: "resumeText is required for analysis" });
      }

      const systemPrompt = `You are a world-class ATS Resume Auditor and Technical Career Coach.
Analyze the candidate's resume text and return a strictly structured JSON response containing:
1. overallScore: number (0 to 100 representing resume strength based on formatting, depth, and matching quality)
2. keyStrengths: string[] (at least 3 key positive aspects of the resume structure or content)
3. improvementAreas: string[] (at least 3 key actionable feedback points for improvement)
4. matchRates: Array of objects with "role" (string) and "rate" (number from 0 to 100), containing 3 suggested high-paying tech roles tailored to this candidate's background (e.g. if the resume is about Data Analytics/Data Science, suggest roles like Data Analyst, Data Scientist, Business Intelligence Analyst; do NOT suggest unrelated roles).

You must output a valid JSON object matching the following structure exactly:
{
  "overallScore": 85,
  "keyStrengths": ["...", "...", "..."],
  "improvementAreas": ["...", "...", "..."],
  "matchRates": [
    { "role": "Data Analyst", "rate": 95 },
    { "role": "Business Intelligence Engineer", "rate": 82 },
    { "role": "Data Scientist", "rate": 70 }
  ]
}
Do not write any markdown code block, enclosing tags, or extra notes. Return ONLY the raw JSON string.`;

      const responseText = await generateAIContent(
        "gemini-2.5-pro",
        systemPrompt,
        [{ role: 'user', parts: [{ text: `Here is the candidate's resume text to audit:\n\n${resumeText}` }] }],
        "application/json"
      );

      // Clean up markdown block wrapping if present
      let cleanResponse = (responseText || "").trim();
      if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.replace(/^```(?:json)?\n?/, "");
        cleanResponse = cleanResponse.replace(/\n?```$/, "");
      }
      cleanResponse = cleanResponse.trim();

      const parsedJSON = JSON.parse(cleanResponse || "{}");
      res.json(parsedJSON);
    } catch (error) {
      console.error("Resume Analysis Error:", error);

      // Heuristic fallback to prevent crashes
      const lower = (req.body.resumeText || "").toLowerCase();
      let defaultRoles = [
        { role: 'Senior Frontend Engineer', rate: 94 },
        { role: 'Full Stack Developer', rate: 76 },
        { role: 'Engineering Manager', rate: 45 }
      ];

      if (lower.includes("data") || lower.includes("analyst") || lower.includes("sql") || lower.includes("python")) {
        defaultRoles = [
          { role: 'Data Analyst', rate: 92 },
          { role: 'Data Scientist', rate: 78 },
          { role: 'Data Engineer', rate: 65 }
        ];
      }

      res.json({
        overallScore: 78,
        keyStrengths: [
          'Strong core competencies aligned with selected track',
          'Good structural flow and clean presentation',
          'Clear technical skills segment'
        ],
        improvementAreas: [
          'Add quantifiable outcomes to your project descriptions',
          'Consider listing additional target credentials/certifications',
          'Expand on specific tool suites used in daily workflows'
        ],
        matchRates: defaultRoles
      });
    }
  });

  app.post("/api/research/query", async (req, res) => {
    try {
      const { topic } = req.body;
      const apiKey = process.env.NEWS_API_KEY || "";

      if (apiKey) {
        try {
          const searchUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=relevance&pageSize=6&apiKey=${apiKey}`;
          const response = await fetch(searchUrl);

          if (response.ok) {
            const data: any = await response.json();
            if (data.status === "ok" && Array.isArray(data.articles) && data.articles.length > 0) {
              const formattedArticles = data.articles.map((item: any, index: number) => {
                const relevanceScore = Math.max(75, 99 - index * 3);
                const sourceName = item.source?.name || "News Network";
                const publishedDateStr = item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : "Recent";
                return {
                  title: item.title || "Industry News Update",
                  source: `${sourceName} • ${publishedDateStr}`,
                  summary: item.description || item.content || "No summary provided.",
                  url: item.url || "https://techcrunch.com",
                  relevanceScore,
                  category: "News"
                };
              });
              return res.json(formattedArticles);
            }
          }
        } catch (apiError) {
          console.warn("NewsAPI fetch failed, resorting to AI generation fallback:", apiError);
        }
      }

      // Generative AI Fallback
      const responseText = await generateAIContent(
        "gemini-2.5-flash",
        "",
        [{ role: 'user', parts: [{ text: `Provide 5 recent industry news articles or resources about ${topic} for career research. Format as JSON array with title, source, summary, url, relevanceScore (1-100).` }] }],
        "application/json"
      );
      res.json(JSON.parse(responseText || "[]"));
    } catch (error) {
      console.error("Research Hub Error:", error);
      res.status(500).json({ error: "Failed to fetch research" });
    }
  });

  app.post("/api/research/youtube", async (req, res) => {
    try {
      const { topic } = req.body;
      const apiKey = process.env.YOUTUBE_API_KEY || "";

      const searchQuery = (topic || '').trim();
      if (!searchQuery) {
        return res.status(400).json({ error: 'Missing search topic' });
      }

      if (!apiKey) {
        console.warn('YOUTUBE_API_KEY is not defined in the environment. Returning empty result.');
        return res.status(500).json({ error: 'YOUTUBE_API_KEY is not defined' });
      }

      try {
        // Use the exact topic provided by the client and request more results.
        // Increase maxResults to 25 (YouTube API allows up to 50) and order by relevance.
        const maxResults = 25;
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&maxResults=${maxResults}&type=video&order=relevance&key=${apiKey}`;
        const response = await fetch(searchUrl);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`YouTube API error: ${response.status} - ${errText}`);
        }

        const data: any = await response.json();
        const videos = (data.items || [])
          .filter((item: any) => item.id?.videoId)
          .map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet?.title || 'YouTube Video',
            description: item.snippet?.description || 'Relevant video content for your search.',
            thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop',
            channel: item.snippet?.channelTitle || 'YouTube',
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`
          }));

        return res.json(videos);
      } catch (fetchError) {
        console.warn('YouTube search API failed:', fetchError);
        return res.status(500).json({ error: 'Unable to perform YouTube search' });
      }
    } catch (error) {
      console.error("YouTube Search General Error:", error);
      res.status(500).json({ error: "Failed to search YouTube videos" });
    }
  });

  // Seed Jobs Database for Job Recommendations
  const seedJobs = [
    {
      JobID: "job_1",
      company: "Google",
      positionName: "Machine Learning Engineer",
      description: "Design and implement scalable machine learning models and deep learning networks for search ranking, recommendation engines, and advanced computer vision tasks. Optimize distributed training pipelines and NLP models.",
      location: "Bengaluru, Karnataka",
      salary: "₹18,00,000 - ₹32,00,000",
      rating: 4.8,
      reviewsCount: 1420,
      externalApplyLink: "https://careers.google.com",
      url: "https://www.indeed.com/jobs?q=google+ml",
      keywords: ["tensorflow", "keras", "pytorch", "machine learning", "deep learning", "python", "scikit-learn", "data visualization", "predictive analysis", "ml algorithms"]
    },
    {
      JobID: "job_2",
      company: "Vercel",
      positionName: "Full Stack React Developer",
      description: "Build next-generation developer platforms and high-performance serverless React applications. Work closely with Next.js, Node.js, Express, TypeScript, and edge computing platforms to deliver pixel-perfect glassmorphic user experiences.",
      location: "Remote",
      salary: "₹12,00,000 - ₹24,00,000",
      rating: 4.7,
      reviewsCount: 382,
      externalApplyLink: "https://vercel.com/careers",
      url: "https://www.indeed.com/jobs?q=vercel+react",
      keywords: ["react", "django", "node js", "react js", "php", "laravel", "magento", "wordpress", "javascript", "angular js", "c#", "flask", "sdk", "typescript", "express"]
    },
    {
      JobID: "job_3",
      company: "Zomato",
      positionName: "Android Kotlin Developer",
      description: "Optimize and maintain our high-volume consumer application. Implement highly interactive features using modern Android architecture components, Kotlin Coroutines, Jetpack Compose, XML, and custom RESTful SDKs.",
      location: "Gurgaon, Haryana",
      salary: "₹10,00,000 - ₹18,00,000",
      rating: 4.2,
      reviewsCount: 940,
      externalApplyLink: "https://www.zomato.com/careers",
      url: "https://www.indeed.com/jobs?q=zomato+android",
      keywords: ["android", "android development", "flutter", "kotlin", "xml", "kivy", "java", "sdk", "git", "sqlite"]
    },
    {
      JobID: "job_4",
      company: "CRED",
      positionName: "iOS App Developer",
      description: "Craft premium, ultra-smooth consumer interfaces for iOS using Swift, UIKit, SwiftUI, and custom shaders. Integrate Apple StoreKit, Cocoa Touch libraries, Core Animation, and local SQLite caching strategies.",
      location: "Pune, Maharashtra",
      salary: "₹15,00,000 - ₹26,00,000",
      rating: 4.4,
      reviewsCount: 220,
      externalApplyLink: "https://careers.cred.club",
      url: "https://www.indeed.com/jobs?q=cred+ios",
      keywords: ["ios", "ios development", "swift", "cocoa", "cocoa touch", "xcode", "objective-c", "sqlite", "plist", "storekit", "ui-kit", "auto-layout"]
    },
    {
      JobID: "job_5",
      company: "Adobe",
      positionName: "UI/UX Designer & Prototyper",
      description: "Design intuitive interfaces, beautiful user experiences, wireframes, and vector layouts. Conduct rigorous user research, define flow charts, construct high-fidelity mockups, and collaborate closely with front-end engineering teams.",
      location: "Noida, Uttar Pradesh",
      salary: "₹8,00,000 - ₹15,00,000",
      rating: 4.6,
      reviewsCount: 810,
      externalApplyLink: "https://www.adobe.com/careers",
      url: "https://www.indeed.com/jobs?q=adobe+uiux",
      keywords: ["ux", "adobe xd", "figma", "zeplin", "balsamiq", "ui", "prototyping", "wireframes", "storyframes", "adobe photoshop", "photoshop", "editing", "adobe illustrator", "illustrator", "wireframe", "user experience", "user research"]
    },
    {
      JobID: "job_6",
      company: "Amazon Web Services",
      positionName: "Cloud Machine Learning Specialist",
      description: "Build robust distributed pipelines on AWS SageMaker. Develop forecasting tools, statistical modeling systems, and custom ML engines using Python, TensorFlow, and advanced probability architectures.",
      location: "Hyderabad, Telangana",
      salary: "₹22,00,000 - ₹38,00,000",
      rating: 4.5,
      reviewsCount: 2890,
      externalApplyLink: "https://aws.amazon.com/careers",
      url: "https://www.indeed.com/jobs?q=aws+ml",
      keywords: ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "python", "statistical modeling", "data mining", "clustering", "ml algorithms"]
    },
    {
      JobID: "job_7",
      company: "Razorpay",
      positionName: "Senior Full Stack Dev (Node/React)",
      description: "Own the core merchant payment flows. Implement secure backend APIs in Node JS and Express, and render fast React dashboards utilizing WebSockets and advanced charting panels.",
      location: "Bengaluru, Karnataka",
      salary: "₹14,00,000 - ₹25,00,000",
      rating: 4.6,
      reviewsCount: 570,
      externalApplyLink: "https://razorpay.com/jobs",
      url: "https://www.indeed.com/jobs?q=razorpay+fullstack",
      keywords: ["react", "node js", "react js", "javascript", "express", "typescript", "angular js", "css", "mongodb"]
    },
    {
      JobID: "job_8",
      company: "PhonePe",
      positionName: "Mobile Developer (Flutter / Kotlin)",
      description: "Pioneer new digital payment channels. Program responsive cross-platform Flutter/Dart products and native Android views. Ensure local SQLite robustness and swift API syncing.",
      location: "Mumbai, Maharashtra",
      salary: "₹11,00,000 - ₹20,00,000",
      rating: 4.3,
      reviewsCount: 710,
      externalApplyLink: "https://www.phonepe.com/careers",
      url: "https://www.indeed.com/jobs?q=phonepe+flutter",
      keywords: ["android", "android development", "flutter", "kotlin", "xml", "sdk", "git", "sqlite", "java"]
    },
    {
      JobID: "job_9",
      company: "Swiggy",
      positionName: "Senior iOS Engineer",
      description: "Scale India's finest local delivery application. Re-architect the core delivery map tracking system using Swift, Combine, custom MapKit modules, and Swift Package Manager frameworks.",
      location: "Bengaluru, Karnataka",
      salary: "₹16,00,000 - ₹28,00,000",
      rating: 4.1,
      reviewsCount: 1100,
      externalApplyLink: "https://careers.swiggy.com",
      url: "https://www.indeed.com/jobs?q=swiggy+ios",
      keywords: ["ios", "ios development", "swift", "xcode", "cocoa touch", "storekit", "auto-layout"]
    },
    {
      JobID: "job_10",
      company: "Figma",
      positionName: "Product Interface Designer",
      description: "Iterate on state-of-the-art canvas editors. Conduct active user experience research, design vector assets, define precise wireframes, and outline complex user journeys.",
      location: "Remote",
      salary: "₹14,00,000 - ₹25,00,000",
      rating: 4.9,
      reviewsCount: 195,
      externalApplyLink: "https://figma.com/careers",
      url: "https://www.indeed.com/jobs?q=figma+designer",
      keywords: ["ux", "figma", "ui", "prototyping", "wireframes", "storyframes", "user experience", "user research", "illustrator"]
    },
    {
      JobID: "job_11",
      company: "TCS Research",
      positionName: "NLP & Data Analytics Expert",
      description: "Engage in advanced computational linguistics and statistical learning research. Build custom predictive models, text mining tools, and data visualization analytics pipelines.",
      location: "Kolkata, West Bengal",
      salary: "₹6,00,000 - ₹11,00,000",
      rating: 3.9,
      reviewsCount: 4200,
      externalApplyLink: "https://tcs.com/careers",
      url: "https://www.indeed.com/jobs?q=tcs+nlp",
      keywords: ["machine learning", "deep learning", "scikit-learn", "python", "data analytics", "data visualization", "quantitative analysis", "predictive analysis"]
    },
    {
      JobID: "job_12",
      company: "Flipkart",
      positionName: "Web UI Developer (React/JS)",
      description: "Build premium responsive retail products. Leverage React JS, TypeScript, Redux, and modern CSS layout engines to deliver fluid candidate-facing e-commerce panels.",
      location: "Chennai, Tamil Nadu",
      salary: "₹9,00,000 - ₹16,00,000",
      rating: 4.2,
      reviewsCount: 1880,
      externalApplyLink: "https://flipkart.careers",
      url: "https://www.indeed.com/jobs?q=flipkart+react",
      keywords: ["react", "react js", "javascript", "typescript", "angular js", "css", "node js"]
    },
    {
      JobID: "job_13",
      company: "Paytm",
      positionName: "Android Software Architect",
      description: "Guide mobile payment engineering cycles. Refactor structural fragments, implement secure local databases using SQLite, and coordinate Git release branches across multiple teams.",
      location: "Noida, Uttar Pradesh",
      salary: "₹13,00,000 - ₹22,00,000",
      rating: 4.0,
      reviewsCount: 1540,
      externalApplyLink: "https://paytm.com/careers",
      url: "https://www.indeed.com/jobs?q=paytm+android",
      keywords: ["android", "android development", "kotlin", "java", "sdk", "git", "sqlite", "xml"]
    },
    {
      JobID: "job_14",
      company: "Infosys Edge",
      positionName: "iOS Application Developer",
      description: "Develop secure banking app interfaces for enterprise iOS deployment. Optimize auto-layout constraints, handle Apple Plist security policies, and manage Apple Developer portal assets.",
      location: "Pune, Maharashtra",
      salary: "₹5,00,000 - ₹9,00,000",
      rating: 3.8,
      reviewsCount: 3100,
      externalApplyLink: "https://infosys.com/careers",
      url: "https://www.indeed.com/jobs?q=infosys+ios",
      keywords: ["ios", "ios development", "swift", "xcode", "cocoa touch", "auto-layout", "plist"]
    },
    {
      JobID: "job_15",
      company: "Microsoft Studio",
      positionName: "Lead Visual & UX Designer",
      description: "Orchestrate interface style guides for Windows and cloud portals. Leverage advanced Figma libraries, balsamiq, and wireframes to finalize highly engaging tactile interfaces.",
      location: "Hyderabad, Telangana",
      salary: "₹20,00,000 - ₹35,00,000",
      rating: 4.7,
      reviewsCount: 2200,
      externalApplyLink: "https://careers.microsoft.com",
      url: "https://www.indeed.com/jobs?q=microsoft+ux",
      keywords: ["ux", "figma", "ui", "prototyping", "wireframes", "user experience", "user research", "adobe photoshop", "illustrator"]
    }
  ];

  // Course Recommendations Map
  const courseRecommendations = {
    "Data Science": [
      { name: "Machine Learning Crash Course by Google [Free]", url: "https://developers.google.com/machine-learning/crash-course" },
      { name: "Machine Learning A-Z by Udemy", url: "https://www.udemy.com/course/machinelearning/" },
      { name: "Machine Learning by Andrew NG", url: "https://www.coursera.org/learn/machine-learning" },
      { name: "Data Scientist Master Program of Simplilearn (IBM)", url: "https://www.simplilearn.com/big-data-and-analytics/senior-data-scientist-masters-program-training" },
      { name: "Data Science Foundations: Fundamentals by LinkedIn", url: "https://www.linkedin.com/learning/data-science-foundations-fundamentals-5" }
    ],
    "Web Development": [
      { name: "Django Crash course [Free]", url: "https://youtu.be/e1IyzVyrLSU" },
      { name: "Python and Django Full Stack Web Developer Bootcamp", url: "https://www.udemy.com/course/python-and-django-full-stack-web-developer-bootcamp" },
      { name: "React Crash Course [Free]", url: "https://youtu.be/Dorf8i6lCuk" },
      { name: "ReactJS Project Development Training", url: "https://www.dotnettricks.com/training/masters-program/reactjs-certification-training" },
      { name: "Node.js and Express.js [Free]", url: "https://youtu.be/Oe421EPjeBE" }
    ],
    "Android Development": [
      { name: "Android Development for Beginners [Free]", url: "https://youtu.be/fis26HvvDII" },
      { name: "Android App Development Specialization", url: "https://www.coursera.org/specializations/android-app-development" },
      { name: "Associate Android Developer Certification", url: "https://grow.google/androiddev/#?modal_active=none" },
      { name: "Become an Android Kotlin Developer by Udacity", url: "https://www.udacity.com/course/android-kotlin-developer-nanodegree--nd940" },
      { name: "Flutter App Development Course [Free]", url: "https://youtu.be/rZLR5olMR64" }
    ],
    "iOS Development": [
      { name: "iOS App Development by LinkedIn", url: "https://www.linkedin.com/learning/subscription/topics/ios" },
      { name: "iOS & Swift - The Complete iOS App Development Bootcamp", url: "https://www.udemy.com/course/ios-13-app-development-bootcamp/" },
      { name: "Become an iOS Developer", url: "https://www.udacity.com/course/ios-developer-nanodegree--nd003" },
      { name: "iOS App Development with Swift Specialization", url: "https://www.coursera.org/specializations/app-development" },
      { name: "Swift Tutorial - Full Course for Beginners [Free]", url: "https://youtu.be/comQ1-x2a1Q" }
    ],
    "UI-UX Development": [
      { name: "Google UX Design Professional Certificate", url: "https://www.coursera.org/professional-certificates/google-ux-design" },
      { name: "UI / UX Design Specialization", url: "https://www.coursera.org/specializations/ui-ux-design" },
      { name: "The Complete App Design Course - UX, UI and Design Thinking", url: "https://www.udemy.com/course/the-complete-app-design-course-ux-and-ui-design/" },
      { name: "Adobe XD Tutorial: User Experience Design Course [Free]", url: "https://youtu.be/68w2VwalD5w" },
      { name: "Adobe XD in Simple Way", url: "https://learnux.io/course/adobe-xd" }
    ]
  };

  const domainKeywords = {
    "Data Science": ['tensorflow', 'keras', 'pytorch', 'machine learning', 'deep learning', 'flask', 'streamlit', 'python', 'scikit-learn', 'data analytics', 'predictive analysis', 'statistical modeling', 'data analyst', 'sql', 'tableau', 'power bi', 'excel', 'pandas', 'numpy', 'statistics', 'visualization', 'data science', 'r programming', 'dashboard', 'powerbi'],
    "Web Development": ['react', 'django', 'node js', 'react js', 'php', 'laravel', 'magento', 'wordpress', 'javascript', 'angular js', 'c#', 'flask', 'typescript', 'express', 'css'],
    "Android Development": ['android', 'android development', 'flutter', 'kotlin', 'xml', 'kivy', 'java', 'sdk', 'sqlite'],
    "iOS Development": ['ios', 'ios development', 'swift', 'cocoa', 'cocoa touch', 'xcode', 'objective-c', 'storekit', 'auto-layout'],
    "UI-UX Development": ['ux', 'adobe xd', 'figma', 'zeplin', 'balsamiq', 'ui', 'prototyping', 'wireframes', 'storyframes', 'adobe photoshop', 'photoshop', 'editing', 'adobe illustrator', 'illustrator', 'wireframe', 'user experience', 'user research']
  };

  // Job Recommendation Endpoint
  app.post("/api/jobs/recommend", async (req, res) => {
    try {
      const { resumeText, locations, limit } = req.body;
      const targetLimit = parseInt(limit) || 10;

      if (!resumeText) {
        return res.status(400).json({ error: "resumeText is required for matching" });
      }

      // Call the TF-IDF, Bag-of-Words and KNN-distance combined recommendation algorithm
      const resultJobs = recommendJobs(resumeText, Array.isArray(locations) ? locations : [], targetLimit);

      return res.json({
        success: true,
        jobs: resultJobs
      });
    } catch (error: any) {
      console.error("Job Recommendation Error:", error);
      res.status(500).json({ error: error.message || "Failed to recommend jobs" });
    }
  });

  // Resume Auditing and NLP Analyzer Endpoint using Gemini AI
  app.post("/api/jobs/analyze", async (req, res) => {
    try {
      const { resumeText } = req.body;
      if (!resumeText || resumeText.trim().length === 0) {
        return res.status(400).json({ error: "resumeText is required for analysis" });
      }

      let parsedData: any = null;

      try {
        const systemPrompt = `You are a world-class ATS Resume Auditor and NLP Profile Extractor. Your task is to analyze the user's resume text and return a strictly structured JSON response containing parsed personal details, determined career level, primary career domain, existing skills, missing skills, recommended certification courses, and missing resume section details.
You must output a valid JSON object matching the following TypeScript interface structure exactly:
{
  "name": string (extracted candidate name, default to "Alex Carter" if not clear),
  "email": string (extracted email, default to "alex.carter@gmail.com" if not clear),
  "contact": string (extracted phone number, default to "+91 98765 43210" if not clear),
  "cand_level": "Fresher" | "Intermediate" | "Experienced" (Fresher if 0-1 yrs exp/1 page, Intermediate if 2-4 yrs/2 pages, Experienced if 5+ yrs/3+ pages),
  "reco_field": "Web Development" | "Data Science" | "Android Development" | "iOS Development" | "UI-UX Development" (Choose the closest matching track),
  "skills": string[] (detected technical and soft skills),
  "missing_sections": string[] (Choose from: "Objective", "Declaration", "Hobbies", "Achievements", "Projects" if they are missing or poorly documented),
  "resume_score": number (0 to 100 representing resume strength based on sections and formatting)
}
Do not write any markdown code block, enclosing tags, or extra notes. Return ONLY the raw JSON string.`;

        const responseText = await generateAIContent(
          "gemini-2.5-flash",
          systemPrompt,
          [{ role: 'user', parts: [{ text: `Here is the resume text to analyze:\n\n${resumeText}` }] }],
          "application/json"
        );

        // Clean up markdown block wrapping if present
        let cleanResponse = (responseText || "").trim();
        if (cleanResponse.startsWith("```")) {
          cleanResponse = cleanResponse.replace(/^```(?:json)?\n?/, "");
          cleanResponse = cleanResponse.replace(/\n?```$/, "");
        }
        cleanResponse = cleanResponse.trim();

        parsedData = JSON.parse(cleanResponse || "{}");
      } catch (geminiErr) {
        console.warn("Gemini resume parser failed or key is missing. Using heuristic NLP fallback:", geminiErr);
      }

      // Fallback heuristics if Gemini fails or is slow
      if (!parsedData) {
        const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = resumeText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        const nameMatch = resumeText.trim().split("\n")[0] || "Alex Carter";

        // Heuristic Domain Detection
        let detectedField: keyof typeof domainKeywords = "Web Development";
        let maxOverlap = 0;
        const lowerResume = resumeText.toLowerCase();

        (Object.keys(domainKeywords) as Array<keyof typeof domainKeywords>).forEach((field) => {
          let overlap = 0;
          domainKeywords[field].forEach((kw) => {
            if (lowerResume.includes(kw)) overlap++;
          });
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            detectedField = field;
          }
        });

        // Determine missing sections
        const missing: string[] = [];
        if (!/objective/i.test(resumeText)) missing.push("Objective");
        if (!/declaration/i.test(resumeText)) missing.push("Declaration");
        if (!/hobb/i.test(resumeText)) missing.push("Hobbies");
        if (!/achieve/i.test(resumeText)) missing.push("Achievements");
        if (!/project/i.test(resumeText)) missing.push("Projects");

        // Simple Score
        const score = 100 - (missing.length * 15) - Math.floor(Math.random() * 10);

        // Find existing skills
        const skills: string[] = [];
        domainKeywords[detectedField].forEach((kw) => {
          if (lowerResume.includes(kw)) {
            skills.push(kw.charAt(0).toUpperCase() + kw.slice(1));
          }
        });

        if (skills.length === 0) {
          skills.push("JavaScript", "React", "Node.js", "Git");
        }

        parsedData = {
          name: nameMatch.substring(0, 35),
          email: emailMatch ? emailMatch[0] : "alex.carter@gmail.com",
          contact: phoneMatch ? phoneMatch[0] : "+91 98765 43210",
          cand_level: resumeText.length < 2000 ? "Fresher" : resumeText.length < 5000 ? "Intermediate" : "Experienced",
          reco_field: detectedField,
          skills: skills,
          missing_sections: missing,
          resume_score: Math.max(35, score)
        };
      }

      // Post-process domain recommendations & tips
      const track: keyof typeof domainKeywords = parsedData.reco_field || "Web Development";
      const fullKeywords = domainKeywords[track] || domainKeywords["Web Development"];

      // Recommended skills are keywords not in existing skills
      const existingLower = parsedData.skills.map((s: string) => s.toLowerCase());
      const recSkills = fullKeywords
        .filter(k => !existingLower.includes(k.toLowerCase()))
        .slice(0, 8)
        .map(k => k.charAt(0).toUpperCase() + k.slice(1));

      const recCourses = courseRecommendations[track] || courseRecommendations["Web Development"];

      // Generate visual tips
      const allSections = ["Objective", "Declaration", "Hobbies", "Achievements", "Projects"];
      const tips = allSections.map((sect) => {
        const isMissing = parsedData.missing_sections.includes(sect);
        if (!isMissing) {
          let symbol = "+";
          let message = "";
          if (sect === "Objective") message = "Awesome! You have added Objective to clearly state your career goals.";
          if (sect === "Declaration") message = "Great! You have added a signed Declaration for verification reliability.";
          if (sect === "Hobbies") message = "Fantastic! Hobbies are listed, showing structural and personality fit.";
          if (sect === "Achievements") message = "Superb! Achievements section validates your practical capability.";
          if (sect === "Projects") message = "Excellent! Custom Projects demonstrate hands-on domain competency.";
          return { type: symbol, text: message };
        } else {
          let symbol = "-";
          let message = "";
          if (sect === "Objective") message = "According to our recommendation please add a Career Objective, it outlines clear focus.";
          if (sect === "Declaration") message = "According to our recommendation please add a Declaration ensuring honesty.";
          if (sect === "Hobbies") message = "Consider listing brief Hobbies⚽. It shows personality depth to the recruiter.";
          if (sect === "Achievements") message = "Boost your chance by adding key Achievements🏅 validating your background.";
          if (sect === "Projects") message = "Critical: Add technical Projects👨‍💻. It proves real hands-on implementation capabilities.";
          return { type: symbol, text: message };
        }
      });

      return res.json({
        success: true,
        analysis: {
          name: parsedData.name,
          email: parsedData.email,
          contact: parsedData.contact,
          cand_level: parsedData.cand_level,
          reco_field: parsedData.reco_field,
          skills: parsedData.skills,
          recommended_skills: recSkills,
          recommended_courses: recCourses,
          resume_score: parsedData.resume_score,
          tips: tips
        }
      });
    } catch (error: any) {
      console.error("Resume Auditing Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to audit resume" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
