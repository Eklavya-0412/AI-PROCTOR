import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';

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
  
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('# Implement your algorithm here\n');
  const [warnings, setWarnings] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const recognizerRef = useRef<speechCommands.SpeechCommandRecognizer | null>(null);
  const proctorLoopRef = useRef<number | null>(null);

  // UI Lockdowns

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

  // INITIALIZE CAMERA & TFJS MODELS

  useEffect(() => {
    const startProctoring = async () => {
      try {
        // WebGL 
        await tf.setBackend('webgl');
        await tf.ready();

        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Face Landmarks
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detectorConfig = {
          runtime: 'tfjs' as const,
        };
        detectorRef.current = await faceLandmarksDetection.createDetector(model, detectorConfig);

        //Speech Commands Model
        recognizerRef.current = speechCommands.create(
          'BROWSER_FFT', 
          AUDIO_DETECTION_CONFIG.vocabulary
        );
        await recognizerRef.current.ensureModelLoaded();

        setIsModelLoading(false);

        // Audio Listening Loop
        recognizerRef.current.listen(result => {

          const isSpeaking = result.scores.some(score => score > AUDIO_DETECTION_CONFIG.probabilityThreshold);
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

        //Video Processing Loop

        const detectFace = async () => {
          if (videoRef.current && videoRef.current.readyState === 4 && detectorRef.current) {
            const faces = await detectorRef.current.estimateFaces(videoRef.current);
            
            if (faces.length === 0) {
              console.warn('Infraction Logged: No face detected in frame.');
              setWarnings(w => w + 1);
            } else if (faces.length > FACE_DETECTION_CONFIG.allowedFaces) {
              console.warn(`Infraction Logged: Multiple faces (${faces.length}) detected.`);
              setWarnings(w => w + 1);
            }
            // Additional logic for gaze tracking (calculating iris position relative to eye corners) can be extracted from `faces[0].keypoints` here.
          }
        };

        // Run face detection on the interval defined in your config
        proctorLoopRef.current = window.setInterval(detectFace, FACE_DETECTION_CONFIG.checkIntervalMs);

      } catch (err) {
        console.error('Proctoring Engine Initialization Failed:', err);
      }
    };

    startProctoring();

    // Cleanup: Stop ML loops and Camera on unmount
    return () => {
      if (proctorLoopRef.current) clearInterval(proctorLoopRef.current);
      if (recognizerRef.current?.isListening()) recognizerRef.current.stopListening();
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = () => {
    alert('Code submitted! Warnings logged: ' + warnings);

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
            className="text-sm font-medium bg-primary text-zinc-950 px-4 py-2 rounded-md hover:bg-primaryHover transition-colors"
          >
            Submit Code
          </button>
        </div>
      </header>

      {/* Main Arena Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Pane: Problem Description & Webcam */}
        <div className="w-[35%] border-r border-zinc-800 p-6 overflow-y-auto bg-zinc-950 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">Merge k Sorted Lists</h2>
            <div className="prose prose-invert prose-zinc text-sm text-zinc-400">
              <p>You are given an array of <code>k</code> linked-lists <code>lists</code>, each linked-list is sorted in ascending order.</p>
              <p>Merge all the linked-lists into one sorted linked-list and return it.</p>
              
              <h3 className="text-zinc-200 mt-4 font-semibold">Example 1:</h3>
              <pre className="bg-zinc-900 p-3 rounded border border-zinc-800 mt-2 text-xs font-mono">
Input: lists = [[1,4,5],[1,3,4],[2,6]]<br/>
Output: [1,1,2,3,4,4,5,6]<br/>
Explanation: The linked-lists are:<br/>
[<br/>
  1-&gt;4-&gt;5,<br/>
  1-&gt;3-&gt;4,<br/>
  2-&gt;6<br/>
]<br/>
merging them into one sorted list:<br/>
1-&gt;1-&gt;2-&gt;3-&gt;4-&gt;4-&gt;5-&gt;6
              </pre>
              
              <p className="mt-4"><strong>Constraints:</strong></p>
              <ul className="list-disc pl-5">
                <li><code>k == lists.length</code></li>
                <li><code>0 &lt;= k &lt;= 10^4</code></li>
                <li><code>0 &lt;= lists[i].length &lt;= 500</code></li>
              </ul>
            </div>
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

        {/* Right Pane: Code Editor */}
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
        </div>
      </div>
    </div>
  );
}