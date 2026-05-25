import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Send,
  X,
  Settings,
  Brain,
  Activity,
  ChevronRight,
  AlertCircle,
  Trophy,
  Star,
  CheckCircle,
  TrendingUp,
  RotateCcw,
  BarChart3,
  Sparkles,
  Zap,
  BookOpen,
  User,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as faceapi from 'face-api.js';
import { cn } from '../lib/utils';

interface MessageItem {
  id: number;
  sender: 'user' | 'bot';
  text: string;
}

interface Biometrics {
  eyeContact: number;
  vocabDiversity: number;
  confidence: number;
  stressIndex: number;
}

interface LiveFaceAnalysis {
  gender: string;
  genderConf: number;
  dominantEmotion: string;
  dominantEmotionConf: number;
  emotionBreakdown: Record<string, number>;
  symmetryIndex: number;
  squintIndex: number;
}

export default function Interview() {
  // Session Configuration State
  const [mode, setMode] = useState<'interview' | 'companion'>('interview');
  const [company, setCompany] = useState('Google');
  const [topic, setTopic] = useState('Frontend Engineering');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [resumeContext, setResumeContext] = useState('');

  // Active Session State
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewPhase, setInterviewPhase] = useState<'intro' | 'questioning' | 'completed'>('intro');
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Media Capture States
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Face-API & Speech-API Refs & State
  const transcriptRef = useRef<string[]>([]);
  const eyeContactFrames = useRef(0);
  const totalFrames = useRef(0);
  const faceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCameraActiveRef = useRef(false);
  const backgroundRecognitionRef = useRef<any>(null);
  const inputRecognitionRef = useRef<any>(null);
  const backgroundShouldRestartRef = useRef(false);
  const backgroundRestartingRef = useRef(false);
  const backgroundSessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interimUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputSilenceStartRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [speechLevel, setSpeechLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [biometrics, setBiometrics] = useState<Biometrics>({
    eyeContact: 85,
    vocabDiversity: 65,
    confidence: 88,
    stressIndex: 28
  });
  const [liveFaceAnalysis, setLiveFaceAnalysis] = useState<LiveFaceAnalysis | null>(null);
  const transcriptSegmentsRef = useRef<Array<{ text: string; confidence: number; timestamp: number }>>([]);

  // Timer & Start Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_QUESTIONS = 5;

  // Load face-api models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log("FaceAPI models loaded successfully!");
      } catch (error) {
        console.error("Failed to load FaceAPI models:", error);
      }
    };
    loadModels();
  }, []);

  // Cleanup timers & streams on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      if (backgroundSessionTimerRef.current) clearTimeout(backgroundSessionTimerRef.current);
      if (interimUpdateTimerRef.current) clearTimeout(interimUpdateTimerRef.current);
      stopBackgroundRecognition();
      stopVoiceRecognition();
      stopMicLevelMonitoring();
      window.speechSynthesis.cancel();
    };
  }, []);

  // Smooth scroll to latest chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Helper for Euclidean distance between landmark points
  const getDistance = (p1: faceapi.Point, p2: faceapi.Point) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  // Real-time Facial Scan loop (High-Precision Camera Analysis)
  const startFaceAnalysis = () => {
    if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);

    faceIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !isCameraActiveRef.current) return;

      try {
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceExpressions();

        if (!detection) return;

        totalFrames.current++;
        const expressions = detection.expressions;
        const landmarks = detection.landmarks;

        // 1. ---------------- HEAD SYMMETRY / ALIGNMENT (Yaw/Roll proxy) ----------------
        // Nose tip is landmark point 30, left eye inner corner is 39, right eye inner corner is 42
        const noseTip = landmarks.positions[30];
        const leftEyeInner = landmarks.positions[39];
        const rightEyeInner = landmarks.positions[42];

        const distNoseToLeft = getDistance(noseTip, leftEyeInner);
        const distNoseToRight = getDistance(noseTip, rightEyeInner);

        // Symmetry ratio (closer to 1.0 means head is facing directly straight at the camera)
        const symmetryRatio = Math.min(distNoseToLeft, distNoseToRight) / Math.max(distNoseToLeft, distNoseToRight);

        // 2. ---------------- EYE ASPECT RATIO (EAR) ----------------
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        // EAR = (dist(p1, p5) + dist(p2, p4)) / (2 * dist(p0, p3))
        const leftEAR = (getDistance(leftEye[1], leftEye[5]) + getDistance(leftEye[2], leftEye[4])) / (2.0 * getDistance(leftEye[0], leftEye[3]));
        const rightEAR = (getDistance(rightEye[1], rightEye[5]) + getDistance(rightEye[2], rightEye[4])) / (2.0 * getDistance(rightEye[0], rightEye[3]));
        const averageEAR = (leftEAR + rightEAR) / 2.0;

        // 3. ---------------- HIGH-PRECISION GAZE FOCUS RATE ----------------
        // Gaze is focused if head symmetry is stable (> 0.82) and eyes are open naturally (EAR > 0.20)
        const eyeFocused = symmetryRatio > 0.82 && averageEAR > 0.20 && averageEAR < 0.38;

        if (eyeFocused) {
          eyeContactFrames.current++;
        }

        const gazeFocusRate = (eyeContactFrames.current / totalFrames.current) * 100;

        // 4. ---------------- VALENCE-AROUSAL STRESS LEVEL ----------------
        // Stress represents physical negative agitation (fearful, angry, disgusted) penalized by eyelid squinting
        const rawAgitation = (expressions.fearful || 0) * 1.0 +
          (expressions.angry || 0) * 0.8 +
          (expressions.disgusted || 0) * 0.6 +
          (expressions.sad || 0) * 0.4;

        // Eyelid stress penalty (squinting below 0.21 adds up to 25% to the stress factor)
        const squintPenalty = averageEAR < 0.21 ? (0.21 - averageEAR) * 2.5 : 0;
        const stressIndex = Math.min(100, Math.max(0, (rawAgitation + squintPenalty) * 100));

        // 5. ---------------- STABLE CONFIDENCE COEFFICIENT ----------------
        // Balanced blend of neutral control presence and pleasant valence, penalized by agitation spikes
        const rawConfidence = (expressions.neutral || 0) * 0.5 +
          (expressions.happy || 0) * 0.8 -
          (expressions.fearful || 0) * 0.5 -
          (expressions.angry || 0) * 0.3;

        // Convert to percentage bounds [0 - 100]
        const confidenceScore = Math.min(100, Math.max(0, (rawConfidence + 0.4) * 100));

        setBiometrics((prev) => ({
          ...prev,
          eyeContact: Number(gazeFocusRate.toFixed(1)),
          confidence: Number(confidenceScore.toFixed(1)),
          stressIndex: Number(stressIndex.toFixed(1)),
        }));

        // 6. ---------------- REAL-TIME FACE CLASSIFICATION & PROFILE ----------------
        // Jaw width (points 3 to 13)
        const jawWidth = getDistance(landmarks.positions[3], landmarks.positions[13]);
        // Forehead-to-chin height (point 27 to 8)
        const faceHeight = getDistance(landmarks.positions[27], landmarks.positions[8]);
        const facialRatio = jawWidth / faceHeight; // wider jaw -> higher ratio (masculine trait)

        // Eyebrow height relative to eyes (average distance from eyebrows [points 19, 24] to pupil centroids)
        const leftBrowDist = getDistance(landmarks.positions[19], landmarks.positions[37]);
        const rightBrowDist = getDistance(landmarks.positions[24], landmarks.positions[44]);
        const avgBrowDist = (leftBrowDist + rightBrowDist) / 2;
        const browRatio = avgBrowDist / faceHeight; // higher brow -> higher ratio (feminine trait)

        // Anthropometric gender classification probability (sigmoid model)
        const rawScore = (facialRatio * 4.0) - (browRatio * 15.0);
        const genderSigmoid = 1 / (1 + Math.exp(-(rawScore - 1.22)));
        const estimatedGender = genderSigmoid > 0.53 ? "Male" : "Female";
        const genderConfidence = genderSigmoid > 0.53 ? genderSigmoid * 100 : (1 - genderSigmoid) * 100;

        // Extract dominant emotion from face-api predictions and normalize to Keras labels
        let dominantEmotion = "neutral";
        let maxEmotionVal = 0;
        const emotionBreakdown: Record<string, number> = {};

        Object.entries(expressions).forEach(([emotion, val]) => {
          let kerasLabel = emotion;
          if (emotion === "fearful") kerasLabel = "fear";
          if (emotion === "disgusted") kerasLabel = "disgust";
          if (emotion === "surprised") kerasLabel = "surprise";

          const percentage = Number((val * 100).toFixed(1));
          emotionBreakdown[kerasLabel] = percentage;
          if (val > maxEmotionVal) {
            maxEmotionVal = val;
            dominantEmotion = kerasLabel;
          }
        });

        const emotionEmojis: Record<string, string> = {
          neutral: "😐 Neutral",
          happy: "😊 Happy",
          sad: "😢 Sad",
          angry: "😠 Angry",
          fear: "😰 Fear",
          disgust: "🤢 Disgust",
          surprise: "😲 Surprise"
        };
        const prettyEmotion = emotionEmojis[dominantEmotion] || dominantEmotion;

        setLiveFaceAnalysis({
          gender: estimatedGender,
          genderConf: Number(genderConfidence.toFixed(1)),
          dominantEmotion: prettyEmotion,
          dominantEmotionConf: Number((maxEmotionVal * 100).toFixed(1)),
          emotionBreakdown,
          symmetryIndex: Number((symmetryRatio * 100).toFixed(1)),
          squintIndex: Number(((0.3 - averageEAR) * 333).toFixed(1))
        });
      } catch (err) {
        console.error("Error during high-precision face analysis:", err);
      }
    }, 1200);
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
        isCameraActiveRef.current = true;
        // Start face analysis immediately
        setTimeout(() => startFaceAnalysis(), 1000);
      } catch (err) {
        console.error("Camera access failed:", err);
      }
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
      isCameraActiveRef.current = false;
      if (faceIntervalRef.current) {
        clearInterval(faceIntervalRef.current);
        faceIntervalRef.current = null;
      }
    }
  };

  const acquireAudioStream = async () => {
    if (audioStreamRef.current) {
      return audioStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      audioStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Shared microphone access failed:', err);
      throw err;
    }
  };

  const stopBackgroundRecognition = () => {
    backgroundShouldRestartRef.current = false;
    if (backgroundSessionTimerRef.current) {
      clearTimeout(backgroundSessionTimerRef.current);
      backgroundSessionTimerRef.current = null;
    }
    if (backgroundRecognitionRef.current) {
      try {
        backgroundRecognitionRef.current.onend = null;
        backgroundRecognitionRef.current.onerror = null;
        backgroundRecognitionRef.current.stop();
      } catch { }
      backgroundRecognitionRef.current = null;
    }
    backgroundRestartingRef.current = false;
  };

  const stopVoiceRecognition = () => {
    if (inputRecognitionRef.current) {
      try {
        inputRecognitionRef.current.onend = null;
        inputRecognitionRef.current.onerror = null;
        inputRecognitionRef.current.abort();
      } catch { }
      inputRecognitionRef.current = null;
    }
    inputSilenceStartRef.current = null;
  };

  // Toggle Mic Check
  const toggleMic = async () => {
    if (!isMicOn) {
      try {
        await acquireAudioStream();
        setIsMicOn(true);
      } catch (err) {
        console.error("Microphone access failed:", err);
      }
    } else {
      setIsMicOn(false);
      if (!inputRecognitionRef.current) {
        stopMicLevelMonitoring();
      }
    }
  };

  // Web Speech API Background Recognition for Vocab Diversity
  const startSpeechRecognition = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    try {
      await acquireAudioStream();
    } catch {
      return;
    }

    stopBackgroundRecognition();
    backgroundShouldRestartRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.language = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    backgroundRecognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("Background speech recognition started");
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        const confidence = result[0]?.confidence ?? 0;

        if (result.isFinal && confidence > 0.72) {
          const cleaned = transcript
            .replace(/\bi\b/g, 'I')
            .replace(/\s+/g, ' ')
            .trim();

          transcriptSegmentsRef.current.push({
            text: cleaned,
            confidence,
            timestamp: Date.now(),
          });
        }
      }

      if (transcriptSegmentsRef.current.length > 0) {
        transcriptRef.current = transcriptSegmentsRef.current
          .flatMap((segment) => segment.text.toLowerCase().split(/\s+/))
          .filter(Boolean);
        calculateVocabulary();
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Background speech recognition error:", event.error);
      if (event.error !== 'no-speech' && event.error !== 'audio-capture') {
        if (!backgroundRestartingRef.current && backgroundShouldRestartRef.current) {
          backgroundRestartingRef.current = true;
          setTimeout(() => {
            try {
              recognition.start();
            } catch (err) {
              console.warn('Background restart failed:', err);
            } finally {
              backgroundRestartingRef.current = false;
            }
          }, 1200);
        }
      }
    };

    recognition.onend = () => {
      if (!backgroundShouldRestartRef.current || backgroundRecognitionRef.current !== recognition) {
        return;
      }
      console.log("Background speech recognition ended, restarting...");
      if (!backgroundRestartingRef.current) {
        backgroundRestartingRef.current = true;
        backgroundSessionTimerRef.current = setTimeout(() => {
          try {
            if (backgroundRecognitionRef.current === recognition) {
              recognition.start();
            }
          } catch (err) {
            console.warn('Background restart failed:', err);
          } finally {
            backgroundRestartingRef.current = false;
          }
        }, 1200);
      }
    };

    try {
      recognition.start();
      backgroundSessionTimerRef.current = setTimeout(() => {
        if (backgroundRecognitionRef.current === recognition) {
          recognition.stop();
        }
      }, 20000);
    } catch (err) {
      console.warn("Could not start background recognition:", err);
    }
  };

  const calculateVocabulary = () => {
    const words = transcriptRef.current;
    const uniqueWords = new Set(words);
    const diversity =
      words.length > 0
        ? (uniqueWords.size / words.length) * 100
        : 0;

    setBiometrics((prev) => ({
      ...prev,
      vocabDiversity: Number(diversity.toFixed(2)),
    }));
  };

  // Deploy AI Interactive Agent
  const startInterview = async () => {
    setInterviewPhase('questioning');

    let welcomeText = "";
    if (mode === 'companion') {
      setQuestionCount(0);
      welcomeText = "Hi there! I'm your Casual Companion. I'm here to chat about anything on your mind, help you relax, or just keep you company. How are you doing today?";
    } else {
      setQuestionCount(1);
      welcomeText = `Welcome to your mock interview for ${company || 'a tech company'} on the topic of ${topic || 'general technical topics'} at the ${experienceLevel || 'Senior'} level. I will ask you ${MAX_QUESTIONS} core technical questions. Let's begin!`;
    }

    setMessages([{ id: Date.now(), sender: 'bot', text: welcomeText }]);
    speak(welcomeText);

    // Start background Speech Recognition to monitor vocabulary
    startSpeechRecognition();

    if (mode === 'interview') {
      setIsTyping(true);
      timerRef.current = setTimeout(() => {
        askNextQuestion(1);
      }, 3000);
    }
  };

  // Fetch sequential question from AI model
  const askNextQuestion = async (qNum: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTyping(true);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          experienceLevel,
          company,
          topic,
          resumeContext,
          messages: messages.filter(m => m.sender === 'user' || m.sender === 'bot'),
          userText: `QUESTION_REQUEST: Ask exactly ONE interview question (#${qNum} of ${MAX_QUESTIONS}). Do not ask multiple questions or include answers. Start directly with the question.`,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch question");

      const questionText = data.response || "Could you describe your experience with scalable application design?";
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: questionText }]);
      speak(questionText);
    } catch (error: any) {
      console.error("Fetch question error:", error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `⚠️ API Connection issue: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Submit User Answer & Schedule Next Event
  const handleSend = async () => {
    if (!inputVal.trim() || interviewPhase === 'completed') return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const userText = inputVal.trim();
    setInputVal('');

    // Append user bubble
    const userMsg: MessageItem = { id: Date.now(), sender: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const currentQ = questionCount;
    const messageHistory = [...messages.filter(m => m.sender === 'user' || m.sender === 'bot'), userMsg];

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          experienceLevel,
          company,
          topic,
          resumeContext,
          messages: messageHistory,
          userText: `USER_ANSWER: ${userText}`,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to process reply");

      const botText = data.response || "Understood. Moving forward to our next section.";
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: botText }]);
      speak(botText);

      if (mode === 'interview') {
        if (currentQ >= MAX_QUESTIONS) {
          timerRef.current = setTimeout(() => {
            endInterview();
          }, 4000);
        } else {
          setQuestionCount(currentQ + 1);
          timerRef.current = setTimeout(() => {
            askNextQuestion(currentQ + 1);
          }, 3000);
        }
      }
    } catch (error: any) {
      console.error("Send message error:", error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `⚠️ Network error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Trigger End of Session & Analyze Performance
  const endInterview = async () => {
    setInterviewPhase('completed');
    setIsAnalyzing(true);

    stopBackgroundRecognition();
    stopVoiceRecognition();

    const closingText = "Excellent. You've answered all simulation questions. I will now perform a full analytical feedback computation of your responses...";
    setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: closingText }]);
    speak(closingText);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          experienceLevel,
          company,
          topic,
          resumeContext,
          messages: messages.filter(m => m.sender === 'user' || m.sender === 'bot'),
          userText: 'INTERVIEW_COMPLETE: Please provide a comprehensive analysis of my interview performance. Include: Overall Score (0-100), Strengths, Areas for Improvement, Communication Skills rating, Technical Accuracy rating, Confidence rating, and specific recommendations for growth.',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to generate report");

      const analysisResult = parseAnalysis(data.response);
      setAnalysis(analysisResult);

      // Save to localStorage for analytical timeline dashboard
      const interviewRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        company,
        topic,
        experienceLevel,
        score: analysisResult.overallScore,
        analysis: analysisResult,
        messages: messages,
      };

      const existing = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
      localStorage.setItem('interviewHistory', JSON.stringify([interviewRecord, ...existing]));
    } catch (error) {
      console.error('Analysis computation failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Structured analysis output regex parser
  const parseAnalysis = (text: string) => {
    const scoreMatch = text.match(/(?:Overall Score|Score):?\s*(\d+)/i);
    const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : 78;

    return {
      overallScore,
      fullText: text,
      strengths: extractSection(text, 'Strengths'),
      improvements: extractSection(text, 'Areas for Improvement'),
      communication: extractRating(text, 'Communication'),
      technical: extractRating(text, 'Technical'),
      confidence: extractRating(text, 'Confidence'),
    };
  };

  const extractSection = (text: string, sectionName: string) => {
    const regex = new RegExp(`(?:${sectionName})[:\\s]*([^]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    return match[1]
      .trim()
      .split('\n')
      .map(s => s.replace(/^[-*✓•\d\.\s]+/, '').trim())
      .filter(Boolean);
  };

  const extractRating = (text: string, category: string) => {
    const regex = new RegExp(`(?:${category})[:\\s]*(\\d+)/?10?`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : 8;
  };

  const releaseAudioStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  };

  const stopMicLevelMonitoring = () => {
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch { }
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch { }
      audioContextRef.current = null;
    }

    setSpeechLevel(0);
    setIsListening(false);
  };

  const startMicLevelMonitoring = async () => {
    if (isListening) return;

    try {
      await acquireAudioStream();
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        console.warn('AudioContext not supported in this browser');
        return;
      }

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(audioStreamRef.current as MediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      setIsListening(true);

      const updateLevel = () => {
        if (!analyserRef.current || !audioStreamRef.current) {
          setSpeechLevel(0);
          return;
        }

        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const value = dataArray[i] / 128 - 1;
          sum += value * value;
        }

        const rms = Math.sqrt(sum / dataArray.length);
        const rawLevel = Math.max(0, rms - 0.02);
        const level = Math.min(100, rawLevel * 250);
        setSpeechLevel(level);

        if (inputRecognitionRef.current) {
          const silenceThreshold = 4;
          if (level < silenceThreshold) {
            if (inputSilenceStartRef.current === null) {
              inputSilenceStartRef.current = performance.now();
            } else if (performance.now() - inputSilenceStartRef.current > 1800) {
              stopVoiceRecognition();
            }
          } else {
            inputSilenceStartRef.current = null;
          }
        }

        if (audioStreamRef.current && analyserRef.current) {
          requestAnimationFrame(updateLevel);
        }
      };

      updateLevel();
    } catch (err) {
      console.error('Microphone access for level monitoring failed:', err);
    }
  };

  // Capture Voice Speech Input (STT) with improved recognition
  const handleVoiceInput = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input capture is not supported by your current browser platform. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      await acquireAudioStream();
    } catch {
      return;
    }

    startMicLevelMonitoring();

    const recognition = new SpeechRecognition();
    recognition.language = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    inputRecognitionRef.current = recognition;

    let interimTranscript = '';
    let finalTranscript = '';
    let recognitionTimeout: NodeJS.Timeout | null = null;

    const clearRecognitionTimeout = () => {
      if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        recognitionTimeout = null;
      }
    };

    recognitionTimeout = setTimeout(() => {
      recognition.abort();
      if (finalTranscript) {
        setInputVal(finalTranscript.trim());
      }
      stopVoiceRecognition();
      stopMicLevelMonitoring();
    }, 20000);

    recognition.onstart = () => {
      console.log("Voice input recognition started - speak now");
      interimTranscript = '';
      finalTranscript = '';
      inputSilenceStartRef.current = null;
    };

    recognition.onresult = (event: any) => {
      interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        const confidence = result[0]?.confidence ?? 0;

        if (result.isFinal && confidence > 0.72) {
          const cleaned = transcript
            .replace(/\bi\b/g, 'I')
            .replace(/\s+/g, ' ')
            .trim();
          finalTranscript += cleaned + ' ';
        } else if (!result.isFinal) {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInputVal(finalTranscript.trim());
      } else if (interimTranscript) {
        if (interimUpdateTimerRef.current) {
          clearTimeout(interimUpdateTimerRef.current);
        }
        interimUpdateTimerRef.current = setTimeout(() => {
          setInputVal(interimTranscript);
          interimUpdateTimerRef.current = null;
        }, 100);
      }
    };

    recognition.onerror = (err: any) => {
      clearRecognitionTimeout();
      console.error("Speech Recognition error:", err.error);
      stopVoiceRecognition();
      stopMicLevelMonitoring();
    };

    recognition.onend = () => {
      clearRecognitionTimeout();
      console.log("Voice input recognition ended");
      stopVoiceRecognition();
      stopMicLevelMonitoring();
    };

    recognition.onabort = () => {
      clearRecognitionTimeout();
      console.log("Voice input recognition aborted");
      stopVoiceRecognition();
      stopMicLevelMonitoring();
    };

    try {
      recognition.start();
    } catch (err) {
      clearRecognitionTimeout();
      console.error("Could not start voice recognition:", err);
      stopVoiceRecognition();
      stopMicLevelMonitoring();
    }
  };

  // Synthesize TTS Speech Audio Out
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1.0;
    utterance.rate = 1.05; // Slightly swifter for fluid pacing
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
  };

  // Re-deploy a new simulation
  const resetInterview = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (faceIntervalRef.current) {
      clearInterval(faceIntervalRef.current);
      faceIntervalRef.current = null;
    }
    if (backgroundSessionTimerRef.current) {
      clearTimeout(backgroundSessionTimerRef.current);
      backgroundSessionTimerRef.current = null;
    }
    stopBackgroundRecognition();
    stopVoiceRecognition();
    stopMicLevelMonitoring();
    releaseAudioStream();
    window.speechSynthesis.cancel();
    setMessages([]);
    setInputVal('');
    setQuestionCount(0);
    setInterviewPhase('intro');
    setAnalysis(null);
    setIsAnalyzing(false);
    setIsMicOn(false);

    // Reset analytical tracking stats
    eyeContactFrames.current = 0;
    totalFrames.current = 0;
    transcriptRef.current = [];
    transcriptSegmentsRef.current = [];
    setBiometrics({
      eyeContact: 85,
      vocabDiversity: 65,
      confidence: 88,
      stressIndex: 28
    });
  };

  // PAGE VIEW 1: Interview Complete - Performance Assessment Dashboard
  if (interviewPhase === 'completed' && (analysis || isAnalyzing)) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 py-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center text-cyber-blue shadow-[0_0_20px_rgba(34,211,238,0.15)]">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">Simulation Analytical Feedback</h1>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Target Focus: {topic} ({experienceLevel} Level)</p>
            </div>
          </div>
          <button
            onClick={resetInterview}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-cyber-blue rounded-xl font-bold tracking-widest uppercase text-xs transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Reset Simulation
          </button>
        </div>

        {isAnalyzing ? (
          <div className="glass-card p-24 flex flex-col items-center justify-center space-y-8 border border-white/10">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-cyber-blue/10 border-t-cyber-blue rounded-full animate-spin"></div>
              <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-cyber-blue animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-bold text-white animate-pulse">Running Neural Analytics...</p>
              <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Computing Communication, Technical, and Confidence Indices</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Overall Score */}
              <div className="glass-card p-6 border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-blue/5 rounded-full blur-2xl"></div>
                <Trophy className="w-8 h-8 text-cyber-blue mb-3 drop-shadow-[0_0_10px_#22d3ee]" />
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Overall Score</p>
                <p className="text-4xl font-extrabold text-white mt-1">{analysis.overallScore}%</p>
              </div>

              {/* Technical Core */}
              <div className="glass-card p-6 border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-purple/5 rounded-full blur-2xl"></div>
                <Brain className="w-8 h-8 text-cyber-purple mb-3 drop-shadow-[0_0_10px_#c084fc]" />
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Technical Skill</p>
                <p className="text-4xl font-extrabold text-white mt-1">{analysis.technical}/10</p>
              </div>

              {/* Communication index */}
              <div className="glass-card p-6 border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-accent/5 rounded-full blur-2xl"></div>
                <Star className="w-8 h-8 text-cyber-accent mb-3 drop-shadow-[0_0_10px_#31a6ff]" />
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Communication</p>
                <p className="text-4xl font-extrabold text-white mt-1">{analysis.communication}/10</p>
              </div>

              {/* Confidence factor */}
              <div className="glass-card p-6 border border-white/10 relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent flex flex-col items-center text-center">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                <TrendingUp className="w-8 h-8 text-green-400 mb-3 drop-shadow-[0_0_10px_#4ade80]" />
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Confidence Rating</p>
                <p className="text-4xl font-extrabold text-white mt-1">{analysis.confidence}/10</p>
              </div>
            </div>

            {/* Strengths and Weaknesses Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Strengths Card */}
              <div className="glass-card p-8 border border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Syntactic & Technical Strengths</h3>
                </div>
                <div className="space-y-4">
                  {analysis.strengths && analysis.strengths.length > 0 ? (
                    analysis.strengths.map((str: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">Excellent response structures and comprehensive conceptual coverage demonstrated.</p>
                  )}
                </div>
              </div>

              {/* Improvements Card */}
              <div className="glass-card p-8 border border-white/10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center text-cyber-purple">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Recommended Architectural Refinements</h3>
                </div>
                <div className="space-y-4">
                  {analysis.improvements && analysis.improvements.length > 0 ? (
                    analysis.improvements.map((imp: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyber-purple/30 transition-all text-sm text-gray-300">
                        <ChevronRight className="w-4 h-4 text-cyber-purple shrink-0 mt-0.5 animate-pulse" />
                        <span>{imp}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No critical errors discovered. Keep pursuing this precise analytical style!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Written Feedback Section */}
            <div className="glass-card p-8 border border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyber-blue" />
                Comprehensive Session Analysis Report
              </h3>
              <div className="text-sm text-gray-300 leading-relaxed font-mono whitespace-pre-wrap p-5 rounded-xl bg-black/40 border border-white/5">
                {analysis.fullText}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // PAGE VIEW 2: Pre-Session System Diagnostics & Session Setup Screen
  if (interviewPhase === 'intro') {
    return (
      <div className="h-full flex flex-col lg:flex-row gap-8">

        {/* Left column: webcam check & hardware indicators */}
        <div className="w-full lg:w-5/12 flex flex-col gap-6">
          <div className="glass-card aspect-video relative bg-black/40 overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-cyber-blue/5">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover scale-x-[-1]",
                !isCameraOn && "hidden"
              )}
            />

            {!isCameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-black/60">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-500 border border-white/10">
                  <VideoOff className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Visual Probe Standby</p>
                  <p className="text-xs text-gray-500 max-w-xs mt-1">Activating camera triggers face-tracking scanning reticles during simulation</p>
                </div>
              </div>
            )}

            {isCameraOn && (
              <>
                {/* Neon scan laser overlay */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-blue to-transparent animate-scan-laser shadow-[0_0_10px_#00f0ff] z-10"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border border-cyber-blue/30 rounded-xl relative animate-pulse-slow">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyber-blue"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyber-blue"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyber-blue"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyber-blue"></div>
                    <div className="absolute -top-6 left-0 bg-cyber-blue/20 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-mono text-cyber-blue uppercase tracking-widest border border-cyber-blue/30">
                      Camera Check Feed
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 text-[9px] font-mono text-cyber-blue uppercase tracking-widest flex items-center gap-1.5 z-10">
                  <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-ping"></span>
                  Diagnostics Feed Ready
                </div>

                {/* Live Facial Demographics & Emotion Classifier HUD */}
                {liveFaceAnalysis && (
                  <div className="absolute inset-y-0 right-0 w-44 bg-black/75 backdrop-blur-md border-l border-white/10 p-3 flex flex-col justify-between text-left font-mono z-10 text-[8px] text-gray-400 space-y-3">
                    <div className="space-y-3">
                      <div>
                        <div className="text-[9px] text-cyber-blue font-bold tracking-widest uppercase border-b border-white/10 pb-1 flex items-center justify-between">
                          <span>FACE STATS</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyber-blue animate-pulse"></span>
                        </div>
                      </div>

                      {/* Estimated Demographics */}
                      <div className="space-y-1 bg-white/5 p-1.5 rounded border border-white/5">
                        <div className="text-white font-bold uppercase tracking-wider text-[7px] text-cyber-purple">Demographics</div>
                        <div className="flex justify-between">
                          <span>Gender:</span>
                          <span className="text-white font-bold">{liveFaceAnalysis.gender}</span>
                        </div>
                        <div className="flex justify-between text-[7px]">
                          <span>Confidence:</span>
                          <span className="text-white">{liveFaceAnalysis.genderConf}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Symmetry:</span>
                          <span className="text-white">{liveFaceAnalysis.symmetryIndex}%</span>
                        </div>
                      </div>

                      {/* Dominant Emotion */}
                      <div className="space-y-1 bg-white/5 p-1.5 rounded border border-white/5">
                        <div className="text-white font-bold uppercase tracking-wider text-[7px] text-green-400">Dominant Emotion</div>
                        <div className="text-white font-bold text-[10px] truncate">{liveFaceAnalysis.dominantEmotion}</div>
                        <div className="text-gray-500 text-[7px]">Confidence: {liveFaceAnalysis.dominantEmotionConf}%</div>
                      </div>

                      {/* Emotion Breakdown Micro-Meters */}
                      <div className="space-y-1.5">
                        <div className="text-[7px] font-bold tracking-wider text-gray-500 uppercase">Emotion Profile</div>
                        {Object.entries(liveFaceAnalysis.emotionBreakdown)
                          .filter(([_, val]) => val > 2)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([emotion, val]) => (
                            <div key={emotion} className="space-y-0.5">
                              <div className="flex justify-between text-[7px] uppercase">
                                <span className="truncate">{emotion}</span>
                                <span className="text-white">{val}%</span>
                              </div>
                              <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-cyber-blue" style={{ width: `${val}%` }} />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="text-[7px] text-gray-600 border-t border-white/5 pt-1 text-center uppercase tracking-widest">
                      SYSTEM ANALYSIS ACTIVE
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                {!modelsLoaded ? "Loading AI Models..." : "Hardware Test Ready"}
              </span>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={toggleCamera}
                className={cn(
                  "p-3 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer",
                  isCameraOn ? "bg-white/15 text-white border border-white/20" : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}
                title="Camera Toggle"
              >
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleMic}
                className={cn(
                  "p-3 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer",
                  isMicOn ? "bg-white/15 text-white border border-white/20" : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}
                title="Microphone Toggle"
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Resting Biometrics Hardware Display */}
          <div className="glass-card flex-1 p-6 space-y-6">
            <h3 className="text-sm font-bold tracking-widest uppercase text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyber-blue animate-pulse" />
              RESTING BIOMETRIC PARAMETERS
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Gaze Focus Rate', value: biometrics.eyeContact, colorClass: 'bg-cyber-blue', requiresCamera: true },
                { label: 'Vocab Diversity Quotient', value: biometrics.vocabDiversity, colorClass: 'bg-cyber-purple', requiresCamera: false },
                { label: 'Confidence Score Index', value: biometrics.confidence, colorClass: 'bg-green-400', requiresCamera: true },
                { label: 'Resting Stress Level', value: biometrics.stressIndex, colorClass: 'bg-yellow-400', requiresCamera: true }
              ].map((stat, i) => {
                const isOffline = stat.requiresCamera && !isCameraOn;
                const displayVal = isOffline ? 0 : stat.value;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">{stat.label}</span>
                      <span className={cn("text-white font-bold", isOffline && "text-gray-500 font-normal")}>
                        {isOffline ? "N/A (Offline)" : `${displayVal}%`}
                      </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", stat.colorClass)}
                        style={{ width: `${displayVal}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-cyber-blue/5 border border-cyber-blue/10">
                <Brain className="w-5 h-5 text-cyber-blue mt-0.5 shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  <span className="text-cyber-blue font-bold">Calibration Active:</span> Live facial reticle scans analyze candidate posture and visual focus vectors during active simulator questioning.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: session options config settings */}
        <div className="flex-1 flex flex-col glass-card border border-white/10 p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyber-blue animate-pulse" />
              AGENT SETUP PROTOCOL
            </h2>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">Configure the neural directives below to deploy the intelligence agent.</p>
          </div>

          <div className="space-y-3">
            {/* Mode Select */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">CONVERSATIONAL MODE</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'interview' | 'companion')}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/60 transition-all font-mono"
              >
                <option value="interview">AI Technical Interview Coach</option>
                <option value="companion">Casual Conversation Companion</option>
              </select>
            </div>

            {mode === 'interview' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 overflow-hidden"
              >
                {/* Target Company */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">TARGET CORPORATE METRIC (COMPANY)</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google, Meta, Stripe..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/60 transition-all font-mono"
                  />
                </div>

                {/* Technical Topic */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">CORE SIMULATION TOPIC</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. React Frontend, Distributed Systems..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/60 transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Experience Level */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">EXPERIENCE TARGET LEVEL</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/60 transition-all font-mono"
                    >
                      <option value="Beginner">Entry Level (Junior)</option>
                      <option value="Intermediate">Mid-Weight Engineer</option>
                      <option value="Senior">Senior Technical Architect</option>
                      <option value="Staff">Principal / Staff Consultant</option>
                    </select>
                  </div>
                </div>

                {/* Resume Context */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">PERSONALIZED RESUME CONTEXT (OPTIONAL)</label>
                  <textarea
                    value={resumeContext}
                    onChange={(e) => setResumeContext(e.target.value)}
                    placeholder="Paste details of your resume or background text here to customize the interview questions..."
                    rows={2}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-blue/60 transition-all font-mono resize-none"
                  />
                </div>
              </motion.div>
            )}
          </div>

          <button
            onClick={startInterview}
            className="w-full py-3 bg-gradient-to-r from-cyber-blue to-cyber-purple text-black font-extrabold tracking-widest uppercase text-xs rounded-xl shadow-lg hover:shadow-cyber-blue/20 hover:scale-[1.01] transition-all duration-300 mt-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            Start Prep <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // PAGE VIEW 3: Active Conversational Simulator Screen
  return (
    <div className="h-full flex flex-col lg:flex-row gap-8">
      {/* Left: Video feed + Biometric telemetry bars */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="glass-card aspect-video relative bg-black/40 overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-cyber-blue/5">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "w-full h-full object-cover scale-x-[-1]",
              !isCameraOn && "hidden"
            )}
          />
          {isCameraOn ? (
            <>
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-blue to-transparent animate-scan-laser shadow-[0_0_10px_#00f0ff] z-10"></div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-36 h-36 border border-cyber-blue/30 rounded-xl relative animate-pulse-slow">
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyber-blue"></div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyber-blue"></div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyber-blue"></div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyber-blue"></div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[8px] font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5 z-10">
                <span className="w-1 h-1 bg-cyber-blue rounded-full animate-ping"></span>
                SCAN PROTOCOL ACTIVE
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
              <VideoOff className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Video Probe Standby</p>
            </div>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 z-15">
            <button
              onClick={toggleCamera}
              className={cn(
                "p-2.5 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer",
                isCameraOn ? "bg-white/10 text-white" : "bg-red-500/20 text-red-400 border border-red-500/30"
              )}
            >
              {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMic}
              className={cn(
                "p-2.5 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer",
                isMicOn ? "bg-white/10 text-white" : "bg-red-500/20 text-red-400 border border-red-500/30"
              )}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="absolute top-4 left-4 inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            <span className="text-[9px] font-bold tracking-widest uppercase text-white">Live Link</span>
          </div>
        </div>

        {/* Biometrics panel */}
        <div className="glass-card flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyber-blue animate-pulse" />
              LIVE TELEMETRY
            </h3>
            <Settings className="w-4 h-4 text-gray-600 cursor-pointer hover:text-white transition-colors" />
          </div>

          <div className="space-y-4">
            {[
              { label: 'Gaze Focus Rate', value: biometrics.eyeContact, colorClass: 'bg-cyber-blue', textClass: 'text-cyber-blue' },
              { label: 'Vocabulary Diversity', value: biometrics.vocabDiversity, colorClass: 'bg-cyber-purple', textClass: 'text-cyber-purple' },
              { label: 'Confidence Score', value: biometrics.confidence, colorClass: 'bg-green-400', textClass: 'text-green-400' },
              { label: 'Stress Index', value: biometrics.stressIndex, colorClass: 'bg-yellow-400', textClass: 'text-yellow-400' }
            ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-gray-400">{stat.label}</span>
                  <span className={stat.textClass}>{stat.value}%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full", stat.colorClass)}
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.value}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-cyber-blue/5 border border-cyber-blue/10">
              <Brain className="w-5 h-5 text-cyber-blue mt-0.5 shrink-0 animate-pulse" />
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {mode === 'companion' ? (
                  <>
                    <span className="text-cyber-blue font-bold">Companion Note:</span> Enjoy this casual sandbox conversational environment. Express yourself freely without rigid metrics!
                  </>
                ) : (
                  <>
                    <span className="text-cyber-blue font-bold">Tactile Coach:</span>
                    {biometrics.stressIndex > 30
                      ? " Your vocal telemetry indicates slight elevation in structural pacing. Pause and speak slowly."
                      : " Perfect structural pacing. Keep maintaining direct eye calibration."}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: simulation messaging terminal */}
      <div className="flex-1 flex flex-col glass-card border border-white/10 min-h-[500px]">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            {/* Robo speaking avatar indicator */}
            <div className="relative w-10 h-10 rounded-lg bg-cyber-purple/20 border border-cyber-purple/30 flex items-center justify-center overflow-hidden">
              <span className="text-lg">🤖</span>
              {isSpeaking && (
                <div className="absolute inset-0 bg-cyber-purple/20 flex items-center justify-center gap-0.5">
                  <span className="w-1 bg-cyber-purple rounded-full animate-bounce h-4"></span>
                  <span className="w-1 bg-cyber-purple rounded-full animate-bounce h-6 [animation-delay:0.1s]"></span>
                  <span className="w-1 bg-cyber-purple rounded-full animate-bounce h-3 [animation-delay:0.2s]"></span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {mode === 'companion' ? 'Casual Chat Companion' : `Simulation Agent: ${company}`}
              </h2>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                {mode === 'companion' ? 'Free Form Session' : `Active Question ${questionCount} of ${MAX_QUESTIONS}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetInterview}
              className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold px-3 py-2 rounded-lg transition-all border border-white/10 uppercase tracking-widest cursor-pointer"
            >
              Reset Session
            </button>
            {mode === 'interview' && (
              <button
                onClick={endInterview}
                className="bg-cyber-blue/15 hover:bg-cyber-blue/20 text-cyber-blue text-[10px] font-bold px-3.5 py-2 rounded-lg transition-all border border-cyber-blue/30 uppercase tracking-widest shadow-lg shadow-cyber-blue/5 cursor-pointer"
              >
                Skip to Report
              </button>
            )}
          </div>
        </div>

        {/* Messages terminal list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <span className="text-4xl animate-bounce">🤖</span>
              <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Initializing neural link pipeline...</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn(
              "flex flex-col max-w-[80%]",
              m.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                m.sender === 'user'
                  ? "bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/20 rounded-tr-none"
                  : "bg-white/5 text-gray-200 border border-white/10 rounded-tl-none backdrop-blur-sm"
              )}>
                {m.text}
              </div>
              <span className="text-[9px] text-gray-600 font-mono mt-1.5 uppercase">
                {m.sender === 'user' ? 'Candidate response' : 'System Agent response'}
              </span>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-1 items-center p-4 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none w-16">
              <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input panel area */}
        <div className="p-6 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <button
              onClick={handleVoiceInput}
              className="p-4 bg-white/5 border border-white/10 hover:border-cyber-blue/30 text-gray-400 hover:text-cyber-blue rounded-xl transition-all cursor-pointer"
              title="Capture Voice Input"
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                mode === 'companion'
                  ? "Type your companion message..."
                  : `Type your answers for target Company: ${company}...`
              }
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm text-gray-200 focus:outline-none focus:border-cyber-blue/40 focus:ring-1 focus:ring-cyber-blue/15 transition-all font-mono"
            />

            <button
              onClick={handleSend}
              disabled={!inputVal.trim() || isTyping}
              className="p-4 bg-cyber-blue text-black rounded-xl shadow-lg shadow-cyber-blue/10 hover:shadow-cyber-blue/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shrink-0 cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 mb-2">
              {isListening ? 'Listening...' : 'Mic level'}
            </div>
            <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150 ${speechLevel > 60 ? 'bg-emerald-400' : speechLevel > 25 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                style={{ width: `${speechLevel}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-gray-400">
              {speechLevel > 0 ? `${Math.round(speechLevel)}% active` : 'Speak into the mic to activate the bar'}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[9px] font-mono tracking-widest text-gray-500 uppercase">
            <span>Press Enter to Submit</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span>Voice Transcribe Probe Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
