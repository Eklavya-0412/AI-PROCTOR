import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { apiCall } from '../lib/api';

// TF
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as speechCommands from '@tensorflow-models/speech-commands';
import '@tensorflow/tfjs-backend-webgl';

// Config
import { FACE_DETECTION_CONFIG, AUDIO_DETECTION_CONFIG } from '../lib/proctorConfig';

export default function ExamArena() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('# Implement your algorithm here\n');
  const [warnings, setWarnings] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [evalStatus, setEvalStatus] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const recognizerRef = useRef<speechCommands.SpeechCommandRecognizer | null>(null);
  const proctorLoopRef = useRef<number | null>(null);
  
  const [examData, setExamData] = useState<any>(null);
  const [isLoadingExam, setIsLoadingExam] = useState(true);

  // ==========================================
  // UI Lockdowns
  // ==========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(w => w + 1);
        console.warn('Infraction Logged: User switched tabs.');
      }
    };

    const handleWindowBlur = () => {
      setWarnings(w => w + 1);
      console.warn('Infraction Logged: Window lost focus.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handlePreventCheating = (e: React.ClipboardEvent | React.MouseEvent) => {
    e.preventDefault();
  };

  // ==========================================
  // INITIALIZE CAMERA & TFJS MODELS
  // ==========================================
  useEffect(() => {
    const startProctoring = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshTfjsModelConfig = {
          runtime: 'tfjs',
          refineLandmarks: false,
        };
        detectorRef.current = await faceLandmarksDetection.createDetector(model, detectorConfig);

        recognizerRef.current = speechCommands.create(
          'BROWSER_FFT', 
          AUDIO_DETECTION_CONFIG.vocabulary
        );
        await recognizerRef.current.ensureModelLoaded();

        setIsModelLoading(false);

        recognizerRef.current.listen(async (result: any) => {
          const isSpeaking = result.scores.some((score:any) => score > AUDIO_DETECTION_CONFIG.probabilityThreshold);
          if (isSpeaking) {
            console.warn('Infraction Logged: Speech detected in background.');
            setWarnings(w => w + 1);
          }
        }, {
          includeSpectrogram: true,
          probabilityThreshold: AUDIO_DETECTION_CONFIG.probabilityThreshold,
          invokeCallbackOnNoiseAndUnknown: false,
          overlapFactor: AUDIO_DETECTION_CONFIG.overlapFactor 
        });

        const calculateHeadPose = (keypoints: any[]) => {
          const NOSE_TIP = keypoints[1];
          const LEFT_CHEEK = keypoints[234];  
          const RIGHT_CHEEK = keypoints[454]; 
          const TOP_HEAD = keypoints[10];     
          const BOTTOM_CHIN = keypoints[152]; 

          const faceWidth = RIGHT_CHEEK.x - LEFT_CHEEK.x;
          const noseToLeft = NOSE_TIP.x - LEFT_CHEEK.x;
          const yawRatio = noseToLeft / faceWidth; 
          const estimatedYawDegrees = Math.abs((yawRatio - 0.5) * 200);

          const faceHeight = BOTTOM_CHIN.y - TOP_HEAD.y;
          const noseToTop = NOSE_TIP.y - TOP_HEAD.y;
          const pitchRatio = noseToTop / faceHeight;
          const estimatedPitchDegrees = Math.abs((pitchRatio - 0.5) * 200);

          return { estimatedYawDegrees, estimatedPitchDegrees };
        };

        const detectFace = async () => {
          if (videoRef.current && videoRef.current.readyState === 4 && detectorRef.current) {
            const estimationConfig = { flipHorizontal: false, staticImageMode: false };
            const faces = await detectorRef.current.estimateFaces(videoRef.current, estimationConfig);
            
            if (faces.length === 0) {
              console.warn('Infraction Logged: No face detected in frame.');
              setWarnings(w => w + 1);
              return;
            } 
            
            if (faces.length > FACE_DETECTION_CONFIG.allowedFaces) {
              console.warn(`Infraction Logged: Multiple faces (${faces.length}) detected.`);
              setWarnings(w => w + 1);
              return;
            }

            const primaryFace = faces[0];
            
            if (primaryFace.box) {
              // @ts-ignore
              if (primaryFace.box.probability[0] < FACE_DETECTION_CONFIG.minDetectionConfidence) return; 
            }

            const { estimatedYawDegrees, estimatedPitchDegrees } = calculateHeadPose(primaryFace.keypoints);

            if (estimatedYawDegrees > FACE_DETECTION_CONFIG.maxHeadYawDegrees) {
              console.warn(`Infraction Logged: User looking away (Yaw: ${Math.round(estimatedYawDegrees)}°)`);
              setWarnings(w => w + 1);
            }

            if (estimatedPitchDegrees > FACE_DETECTION_CONFIG.maxHeadPitchDegrees) {
              console.warn(`Infraction Logged: User looking down/up (Pitch: ${Math.round(estimatedPitchDegrees)}°)`);
              setWarnings(w => w + 1);
            }
          }
        };

        proctorLoopRef.current = window.setInterval(detectFace, FACE_DETECTION_CONFIG.checkIntervalMs);

      } catch (err) {
        console.error('Proctoring Engine Initialization Failed:', err);
      }
    };

    startProctoring();

    return () => {
      if (proctorLoopRef.current) clearInterval(proctorLoopRef.current);
      if (recognizerRef.current?.isListening()) recognizerRef.current.stopListening();
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  // ==========================================
  // EXAM DATA FETCHING
  // ==========================================
  useEffect(() => {
    if (!id) return;
    apiCall(`/exams/${id}`, { method: 'GET' })
      .then((data: any) => {
        setExamData(data);
        setIsLoadingExam(false);
      })
      .catch((err) => {
        console.error("Failed to load exam data", err);
        setIsLoadingExam(false);
      });
  }, [id]);

  // ==========================================
  // HTTP POLLING ENGINE (NEW)
  // ==========================================
  useEffect(() => {
    let interval: number;

    if (submissionId && (evalStatus === 'Judging...' || evalStatus === 'Pending Execution')) {
      interval = window.setInterval(async () => {
        try {
          const data = await apiCall<any>(`/submissions/${submissionId}`, { method: 'GET' });
          
          if (data.status !== 'Pending Execution') {
            setEvalStatus(data.status);
            setExecutionTime(data.execution_time_ms);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
          clearInterval(interval);
        }
      }, 1500); 
    }

    return () => clearInterval(interval);
  }, [submissionId, evalStatus]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSubmit = async () => {
    if (!id) {
      alert("Error: Missing Exam ID in URL");
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      exam_id: id,                  
      problem_id: "prob-default-1", 
      language: language,           
      raw_code: code                
    };

    try {
      // 1. Post the code
      const response = await apiCall<{ submission_id: string }>('/submissions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // 2. Start the Polling Engine instead of navigating away
      setSubmissionId(response.submission_id);
      setEvalStatus('Judging...');

    } catch (error) {
      console.error("Submission failed:", error);
      alert('Error: Failed to submit code. Check network or console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 font-sans">

      <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-zinc-100">Daily Challenge: Hard</h1>
          <span className="text-sm px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md font-mono">01:45:22</span>
        </div>
        <div className="flex items-center gap-4">
          {isModelLoading ? (
            <span className="text-primary text-sm font-medium animate-pulse flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Initializing Proctor AI...
            </span>
          ) : (
            <span className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> AI Active
            </span>
          )}

          {warnings > 0 && (
            <span className="text-red-500 text-sm font-bold bg-red-500/10 px-3 py-1 rounded">
              Infractions: {warnings}
            </span>
          )}
          
          <button 
            onClick={() => navigate('/student')}
            className="text-sm font-medium text-zinc-400 hover:text-red-500 transition-colors"
          >
            Abandon
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || evalStatus === 'Judging...'}
            className="text-sm font-medium bg-primary text-zinc-950 px-4 py-2 rounded-md hover:bg-primaryHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Code'}
          </button>
        </div>
      </header>

      {/* Main Arena Layout */}
      <div className="flex flex-1 overflow-hidden">
         {/* Left Pane: Problem Statement */}
        <div className="w-[35%] border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-950 flex flex-col justify-between">
          <div>
            {isLoadingExam ? (
              <div className="animate-pulse text-zinc-500">Loading problem set...</div>
            ) : !examData || !examData.problem_set || examData.problem_set.length === 0 ? (
              <div className="text-red-500">Error: No problems found for this exam.</div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-zinc-100 mb-4">
                  {examData.problem_set[0].title}
                </h2>
                <div className="prose prose-invert prose-zinc text-sm text-zinc-400">
                  <p>{examData.problem_set[0].description}</p>
                </div>
              </>
            )}
          </div>
          
          {/* Locked Webcam Feed */}
          <div className="mt-6 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 relative">
            <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-[10px] uppercase font-bold text-zinc-300 tracking-wider flex items-center gap-2 border border-white/10">
              <span className={`w-1.5 h-1.5 rounded-full ${isModelLoading ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></span>
              Monitoring
            </div>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-48 object-cover filter grayscale"
            />
          </div>
        </div>

        {/* Right Pane: Code Editor & Results Console */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-zinc-800 text-sm text-zinc-200 px-3 py-1 rounded border border-zinc-700 outline-none focus:border-primary"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
            </select>
            <button className="text-xs text-zinc-400 hover:text-zinc-100">Reset to Default Template</button>
          </div>

          {/* Strict Anti-Cheat Event Bindings */}
          <div 
            className="flex-1 relative"
            onCopy={handlePreventCheating}
            onCut={handlePreventCheating}
            onPaste={handlePreventCheating}
            onContextMenu={handlePreventCheating}
          >
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                contextmenu: false, 
              }}
            />
          </div>

          {/* ========================================== */}
          {/* RESULTS CONSOLE (NEW) */}
          {/* ========================================== */}
          {evalStatus && (
            <div className="h-48 bg-zinc-950 border-t border-zinc-800 p-4 font-mono overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Execution Console</span>
                <button onClick={() => setEvalStatus(null)} className="text-zinc-500 hover:text-zinc-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {evalStatus === 'Judging...' || evalStatus === 'Pending Execution' ? (
                <div className="flex items-center gap-3 text-zinc-300 mt-4">
                  <svg className="w-5 h-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Running against hidden test cases...
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xl font-bold">
                    Status: 
                    <span className={
                      evalStatus === 'Accepted' ? 'text-green-500' : 
                      evalStatus === 'Time Limit Exceeded' ? 'text-yellow-500' : 'text-red-500'
                    }>
                      {evalStatus}
                    </span>
                  </div>
                  {evalStatus === 'Accepted' && (
                    <div className="text-zinc-400 text-sm">
                      Runtime: <span className="text-zinc-200 font-semibold">{executionTime} ms</span> 
                    </div>
                  )}
                  {evalStatus !== 'Accepted' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-sm mt-2">
                      Your solution failed to produce the expected output or crashed during execution. Please review your code constraints.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}