export interface InterviewSession {
  id: string;
  role: string;
  company: string;
  difficulty: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  status: 'pending' | 'in-progress' | 'completed';
  date: string;
}

export interface FeedbackDetail {
  category: string;
  score: number;
  critique: string;
  improvement: string;
}

export interface InterviewFeedback {
  sessionId: string;
  overallScore: number;
  biometricAnalysis: {
    eyeContact: number;
    confidence: number;
    stressLevel: number;
  };
  technicalFeedback: FeedbackDetail[];
  softSkillsFeedback: FeedbackDetail[];
}

export interface ResearchArticle {
  id: string;
  title: string;
  source: string;
  summary: string;
  url: string;
  relevance: number;
}
