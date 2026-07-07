import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  HelpCircle, 
  RefreshCw, 
  Layers, 
  Users, 
  Sparkles, 
  FileText, 
  MapPin, 
  PlusCircle, 
  TrendingUp, 
  Camera, 
  Lock, 
  Mail, 
  LogOut, 
  ChevronRight, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Tesseract from 'tesseract.js';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

import { Order, OrderStatusFilter, isSmartCodeMatch } from './types';
import OrderStats from './components/OrderStats';
import AddOrderForm from './components/AddOrderForm';
import SearchAndFilter from './components/SearchAndFilter';
import CustomerGroupCard from './components/CustomerGroupCard';
import OrderCard from './components/OrderCard';
import MonthlyReports from './components/MonthlyReports';

// ==========================================
// REAL FIREBASE CONFIGURATION
// ==========================================
// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firestore connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Helper function to prune and check session limits via Firestore
const checkSessionLimit = async (user: FirebaseUser): Promise<boolean> => {
  try {
    const docPath = `users_config/${user.uid}`;
    const docRef = doc(db, docPath);
    
    // Retrieve or generate persistent device session ID
    let sessionID = localStorage.getItem(`shein_device_session_id_${user.uid}`);
    if (!sessionID) {
      sessionID = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
      localStorage.setItem(`shein_device_session_id_${user.uid}`, sessionID);
    }

    let snapshot;
    try {
      snapshot = await getDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, docPath);
    }
    
    let maxDevices = 2; // Default limit as per prompt requirements
    let activeSessions: Record<string, number> = {};

    if (snapshot && snapshot.exists()) {
      const data = snapshot.data();
      if (data && typeof data.maxDevices === 'number') {
        maxDevices = data.maxDevices;
      }
      if (data && data.activeSessions && typeof data.activeSessions === 'object') {
        activeSessions = data.activeSessions as Record<string, number>;
      }
    }

    // Prune stale sessions older than 7 days
    const now = Date.now();
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const prunedSessions: Record<string, number> = {};
    for (const [sid, ts] of Object.entries(activeSessions)) {
      if (now - ts < ONE_WEEK_MS) {
        prunedSessions[sid] = ts;
      }
    }

    const isNewSession = !prunedSessions[sessionID];
    const activeCount = Object.keys(prunedSessions).length;

    if (isNewSession && activeCount >= maxDevices) {
      // Reject login because device sessions count exceeded maxDevices
      return false;
    }

    // Update or register session timestamp
    prunedSessions[sessionID] = now;

    // Save configuration and active sessions list to Firestore
    try {
      await setDoc(docRef, {
        maxDevices,
        activeSessions: prunedSessions,
        lastLoginEmail: user.email || '',
        lastUpdated: now
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }

    return true;
  } catch (error) {
    console.error("Error verifying active sessions:", error);
    // Fail open to avoid lockouts during network issues
    return true;
  }
};

// ==========================================
// SECURE LOGIN COMPONENT
// ==========================================
// ==========================================
// SECURE LOGIN COMPONENT WITH SIGN UP & FALLBACK
// ==========================================
function LoginScreen({ 
  onSessionBlock, 
  onDemoLogin 
}: { 
  onSessionBlock: (msg: string) => void;
  onDemoLogin: () => void;
}) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setShowFirebaseGuide(false);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const isAllowed = await checkSessionLimit(userCredential.user);
        if (!isAllowed) {
          onSessionBlock('تکایە ناتوانیت داخڵ ببی، چونکە ژمارەی مۆبایلە ڕێگەپێدراوەکان گەیشتووەتە ڕادەی کۆتایی.');
          await signOut(auth);
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const isAllowed = await checkSessionLimit(userCredential.user);
        if (!isAllowed) {
          onSessionBlock('تکایە ناتوانیت داخڵ ببی، چونکە ژمارەی مۆبایلە ڕێگەپێدراوەکان گەیشتووەتە ڕادەی کۆتایی.');
          await signOut(auth);
        }
      }
    } catch (err: any) {
      console.error('Auth operation failed:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('ڕێگای ئیمەیڵ/وشەی تێپەڕبوون کارانەکراوە لە فایەربەیسەکەتدا (auth/operation-not-allowed).');
        setShowFirebaseGuide(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('ناونیشانی ئیمەیڵ یان وشەی تێپەڕبوون هەڵەیە.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('ئەم ئیمەیڵە پێشتر تۆمارکراوە. تکایە بچۆ بەشی چوونەژوورەوە.');
      } else if (err.code === 'auth/weak-password') {
        setError('وشەی تێپەڕبوونەکە زۆر لاوازە (لانی کەم پێویستە ٦ پیت یان ژمارە بێت).');
      } else if (err.code === 'auth/invalid-email') {
        setError('شێوازی ئیمەیڵەکە دروست نییە.');
      } else {
        setError(err.message || 'شکستی هێنا لە کارەکە. تکایە هێڵەکەت پشکنین بکە و دووبارە تاقیبکەرەوە.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-y-auto" dir="rtl">
      {/* Visual background decorations */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 backdrop-blur-md my-8"
      >
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="p-4 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl text-white shadow-lg">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">سیستەمی تەڵەبەکانی شێین</h2>
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            کۆنتڕۆڵکردن و ئەرشیفکردنی کۆد، نرخ، و کشف حسابی کڕیاران
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800/80 mb-6 font-bold">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); setShowFirebaseGuide(false); }}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${!isSignUp ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
          >
            چوونەژوورەوە
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); setShowFirebaseGuide(false); }}
            className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${isSignUp ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
          >
            تۆمارکردن (Sign Up)
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-bold flex flex-col gap-2 leading-relaxed"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {/* Firebase Authentication Guide */}
        {showFirebaseGuide && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl text-xs space-y-3 leading-relaxed"
          >
            <p className="font-bold border-b border-amber-500/20 pb-1.5 text-center text-amber-400">
              ڕێبەری چالاککردنی Firebase Authentication:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-right">
              <li>سەردانی <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-400">Firebase Console</a> بکە.</li>
              <li>پڕۆژەی فایەربەیسەکەت بکەرەوە.</li>
              <li>لە تەنیشتەوە بچۆ سەر بەشی <strong>Authentication</strong>.</li>
              <li>بچۆ سەر تابی <strong>Sign-in method</strong>.</li>
              <li>بۆ بەشی <strong>Email/Password</strong> و لێبدە لە <strong>Enable</strong> پاشان <strong>Save</strong> بکە.</li>
            </ol>
            <p className="text-[10px] text-slate-400 text-center">
              * دوای کاراکردن، دەتوانیت بە سەرکەوتوویی خۆت تۆمار بکەیت یا چوونەژوورەوە بکەیت.
            </p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 mr-1">ناونیشانی ئیمەیڵ</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 mr-1">وشەی تێپەڕبوون</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'خۆتۆمارکردن و دەستپێکردن' : 'چوونەژوورەوەی پارێزراو'}</span>
                <ChevronRight className="w-4.5 h-4.5 transform rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/60 flex flex-col items-center gap-3">
          <p className="text-[11px] text-slate-500 text-center font-bold">
            دەتەوێت ڕاستەوخۆ بەرنامەکە تاقیبکەیتەوە بەبێ کاراکردنی فایەربەیس؟
          </p>
          <button
            type="button"
            onClick={onDemoLogin}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 font-bold rounded-xl text-xs border border-slate-700/60 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>بەردەوامبوون بە دۆخی تاقیکاری (مۆدی لۆکاڵ)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// CAMERA SNAPSHOT OCR COMPONENT
// ==========================================
function CameraSnapshotOCR({
  orders,
  onMatchFound,
  onClose,
}: {
  orders: Order[];
  onMatchFound: (customerName: string, matchedCode: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [noMatchFound, setNoMatchFound] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => console.error("Video playback failure:", err));
        }
      } catch (err) {
        console.error("Camera access blocked or unavailable:", err);
        setErrorMsg("نەتوانرا کامێرا بکرێتەوە. دەتوانیت لە خوارەوە ڕاستەوخۆ وێنەی کاڵاکە لۆد بکەیت بۆ OCR.");
      }
    }
    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const processOCR = async (imageSrc: string | HTMLCanvasElement) => {
    setIsProcessing(true);
    setProgress(0);
    setNoMatchFound(false);
    setExtractedText(null);

    try {
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text || '';
      const cleanText = text.trim();
      setExtractedText(cleanText);

      // SKU search and match sequence
      const words = cleanText
        .split(/[\s\n,;]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3);

      let found = false;
      for (const word of words) {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanWord.length < 3) continue;

        const matched = orders.find((o) => {
          return isSmartCodeMatch(o.code, cleanWord) || o.code.toLowerCase().includes(cleanWord.toLowerCase());
        });

        if (matched) {
          onMatchFound(matched.name, matched.code);
          found = true;
          break;
        }
      }

      if (!found) {
        setNoMatchFound(true);
      }
    } catch (err) {
      console.error("OCR recognition error:", err);
      setErrorMsg("شکست لە جێبەجێکردنی OCR.");
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw the image onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply color/brightness enhancements for sharper OCR recognition
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      data[i] = brightness;
      data[i + 1] = brightness;
      data[i + 2] = brightness;
    }
    ctx.putImageData(imgData, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataUrl);

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    processOCR(canvas);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedImage(dataUrl);
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      processOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-4 text-white animate-fadeIn" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-extrabold text-slate-100">OCR وێنەگرتنی خێرا (Snapshot OCR)</h3>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          داخستن
        </button>
      </div>

      {!capturedImage ? (
        <div className="relative aspect-video max-w-md mx-auto overflow-hidden rounded-2xl border border-slate-800 bg-black">
          {errorMsg ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <p className="text-xs text-slate-300 leading-relaxed">{errorMsg}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {!errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1/2 h-1/3 border-2 border-dashed border-blue-500/80 rounded-xl relative">
                <div className="absolute left-0 right-0 h-0.5 bg-blue-500 animate-pulse top-1/2" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-video max-w-md mx-auto overflow-hidden rounded-2xl border border-slate-800 bg-black">
          <img
            src={capturedImage}
            alt="Snapshot OCR Preview"
            className="w-full h-full object-contain"
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-white">خەریکی خوێندنەوەی کۆدەکە...</p>
              {progress !== null && (
                <p className="text-[10px] text-blue-400 font-mono">{progress}% تەواو بووە</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-md mx-auto">
        {!capturedImage ? (
          !errorMsg && (
            <button
              onClick={captureSnapshot}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-900/20 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>گرتنی وێنە و پشکنین (Capture Snapshot)</span>
            </button>
          )
        ) : (
          <button
            onClick={() => {
              setCapturedImage(null);
              setNoMatchFound(false);
              setExtractedText(null);
              setErrorMsg(null);
              setTimeout(() => {
                navigator.mediaDevices.getUserMedia({
                  video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                  audio: false,
                }).then(mediaStream => {
                  setStream(mediaStream);
                  if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play().catch(err => console.error(err));
                  }
                }).catch(() => {
                  setErrorMsg("نەتوانرا دووبارە دەست بە کامێرا بگۆڕدرێت.");
                });
              }, 100);
            }}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>دووبارە وێنەگرتنەوە</span>
          </button>
        )}

        <div className="relative w-full">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border border-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>بارکردنی وێنە لە گالەری یان مۆبایل</span>
          </button>
        </div>
      </div>

      {noMatchFound && !isProcessing && (
        <div className="max-w-md mx-auto bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center space-y-2 animate-fadeIn">
          <p className="text-xs font-bold text-red-400">هیچ داواکارییەکی هاوتا لە لیستەکەدا نەدۆزرایەوە!</p>
          {extractedText && (
            <div className="space-y-1 text-right">
              <span className="text-[10px] text-slate-500 block font-bold">دەقی خوێندراو لە وێنە:</span>
              <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-850 break-all leading-relaxed">
                {extractedText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN ROOT APP COMPONENT
// ==========================================
export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessionBlockMsg, setSessionBlockMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'add-order' | 'reports' | 'invoice'>('orders');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Monitor Authentication State change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setSessionBlockMsg(null);
      if (user) {
        const isAllowed = await checkSessionLimit(user);
        if (!isAllowed) {
          setSessionBlockMsg('تکایە ناتوانیت داخڵ ببی، چونکە ژمارەی مۆبایلە ڕێگەپێدراوەکان گەیشتووەتە ڕادەی کۆتایی.');
          await signOut(auth);
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load User Scoped Data from Firestore (or LocalStorage fallback for Demo Mode)
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    if (currentUser.uid === 'demo_user') {
      setIsLoading(true);
      const stored = localStorage.getItem('shein_orders_demo_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOrders(parsed);
        } catch (e) {
          console.error("Failed to parse demo orders:", e);
          setOrders([]);
        }
      } else {
        // Populate with some elegant initial mock orders for a lovely out-of-the-box demo experience!
        const mockInitial: Order[] = [
          {
            id: 'demo_1',
            ownerId: 'demo_user',
            name: 'احمد علی',
            phone: '07501234567',
            address: 'سلێمانی - ڕاپەڕین',
            code: 'SH20264859',
            status: 'pending',
            createdAt: new Date().toISOString(),
            price: 24.5
          },
          {
            id: 'demo_2',
            ownerId: 'demo_user',
            name: 'سارا عومەر',
            phone: '07709876543',
            address: 'هەولێر - عەنکاوە',
            code: 'SH20267391',
            status: 'arrived',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
            price: 18.0
          }
        ];
        setOrders(mockInitial);
        localStorage.setItem('shein_orders_demo_user', JSON.stringify(mockInitial));
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const pathForOnSnapshot = 'orders';
    const q = query(
      collection(db, pathForOnSnapshot),
      where('ownerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedOrders: Order[] = [];
        snapshot.forEach((doc) => {
          loadedOrders.push({
            id: doc.id,
            ...doc.data(),
          } as Order);
        });
        
        // Sort orders by createdAt descending
        loadedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setOrders(loadedOrders);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathForOnSnapshot);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleAddOrders = async (name: string, phone: string, address: string, items: { code: string; price: number }[]) => {
    if (!currentUser) return;
    
    if (currentUser.uid === 'demo_user') {
      const newOrders: Order[] = items.map(({ code, price }) => ({
        id: 'demo_' + Math.random().toString(36).substring(2, 11),
        ownerId: 'demo_user',
        name,
        phone,
        address: address || '',
        code,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        price,
      }));
      const updated = [...newOrders, ...orders];
      setOrders(updated);
      localStorage.setItem('shein_orders_demo_user', JSON.stringify(updated));
      return;
    }

    try {
      const promises = items.map(async ({ code, price }) => {
        const orderId = crypto.randomUUID ? crypto.randomUUID() : 'ord_' + Math.random().toString(36).substring(2, 11);
        const pathForWrite = `orders/${orderId}`;
        const orderData = {
          id: orderId,
          ownerId: currentUser.uid,
          name,
          phone,
          address: address || '',
          code,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          price,
        };
        
        try {
          await setDoc(doc(db, 'orders', orderId), orderData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, pathForWrite);
        }
      });
      
      await Promise.all(promises);
    } catch (err) {
      console.error('Error adding orders:', err);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!currentUser) return;
    const orderToUpdate = orders.find((o) => o.id === id);
    if (!orderToUpdate) return;
    
    const newStatus = orderToUpdate.status === 'pending' ? 'arrived' : 'pending';

    if (currentUser.uid === 'demo_user') {
      const updated = orders.map((o) => {
        if (o.id === id) {
          return {
            ...o,
            status: newStatus,
          };
        }
        return o;
      });
      setOrders(updated);
      localStorage.setItem('shein_orders_demo_user', JSON.stringify(updated));
      return;
    }

    const pathForWrite = `orders/${id}`;
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: newStatus,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathForWrite);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!currentUser) return;

    if (currentUser.uid === 'demo_user') {
      const updated = orders.filter((o) => o.id !== id);
      setOrders(updated);
      localStorage.setItem('shein_orders_demo_user', JSON.stringify(updated));
      return;
    }

    const pathForWrite = `orders/${id}`;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathForWrite);
    }
  };

  const handleEditOrder = async (id: string, code: string, price: number) => {
    if (!currentUser) return;

    if (currentUser.uid === 'demo_user') {
      const updated = orders.map((o) => {
        if (o.id === id) {
          return {
            ...o,
            code,
            price,
          };
        }
        return o;
      });
      setOrders(updated);
      localStorage.setItem('shein_orders_demo_user', JSON.stringify(updated));
      return;
    }

    const pathForWrite = `orders/${id}`;
    try {
      await updateDoc(doc(db, 'orders', id), {
        code,
        price,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathForWrite);
    }
  };

  // OCR Recognition Found Callback
  const handleOcrMatchFound = (customerName: string, matchedCode: string) => {
    setSearchQuery(customerName);
    setViewMode('flat');
    setScannedCode(matchedCode);
    setIsCameraOpen(false);

    // Auto clear scanned code highlight after 10 seconds
    setTimeout(() => {
      setScannedCode(null);
    }, 10000);
  };

  // Log Out Handlers
  const handleLogOut = async () => {
    try {
      if (currentUser) {
        if (currentUser.uid === 'demo_user') {
          setCurrentUser(null);
          return;
        }
        const docPath = `users_config/${currentUser.uid}`;
        const docRef = doc(db, docPath);
        const sessionID = localStorage.getItem(`shein_device_session_id_${currentUser.uid}`);
        if (sessionID) {
          let snapshot;
          try {
            snapshot = await getDoc(docRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, docPath);
          }
          if (snapshot && snapshot.exists()) {
            const data = snapshot.data();
            const activeSessions = { ... (data.activeSessions || {}) };
            delete activeSessions[sessionID];
            
            try {
              await setDoc(docRef, {
                ...data,
                activeSessions,
                lastUpdated: Date.now()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, docPath);
            }
          }
        }
      }
      await signOut(auth);
    } catch (err) {
      console.error("Logout process cleanup error:", err);
      await signOut(auth);
    }
  };

  // Total statistics calculations
  const ordersCount = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    arrived: orders.filter((o) => o.status === 'arrived').length,
  };

  // Primary filtering pipeline
  const filteredOrders = (() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    let baseOrders = orders;
    if (normalizedQuery) {
      if (viewMode === 'flat') {
        baseOrders = orders.filter((o) => {
          return (
            o.name.toLowerCase().includes(normalizedQuery) ||
            o.phone.includes(normalizedQuery) ||
            isSmartCodeMatch(o.code, normalizedQuery)
          );
        });
      } else {
        baseOrders = orders.filter((o) => {
          const customerMatch = o.name.toLowerCase().includes(normalizedQuery) || o.phone.includes(normalizedQuery);
          if (customerMatch) return true;
          return isSmartCodeMatch(o.code, normalizedQuery);
        });
      }
    }

    if (statusFilter !== 'all') {
      baseOrders = baseOrders.filter((o) => o.status === statusFilter);
    }

    return baseOrders;
  })();

  const getGroupedOrders = (list: Order[]) => {
    const groups: { [key: string]: { name: string; phone: string; orders: Order[] } } = {};
    list.forEach((order) => {
      const key = order.name.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = {
          name: order.name,
          phone: order.phone,
          orders: [],
        };
      }
      if (!groups[key].phone && order.phone) {
        groups[key].phone = order.phone;
      }
      groups[key].orders.push(order);
    });
    return Object.values(groups);
  };

  const groupedOrders = getGroupedOrders(filteredOrders);
  const isSearchActive = searchQuery.trim() !== '';

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4" dir="rtl">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        <span className="text-sm text-slate-400 font-bold">بەرنامەکە ئامادە دەکرێت...</span>
      </div>
    );
  }

  // Render Secure Login Screen if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center">
        {sessionBlockMsg && (
          <div className="max-w-md mx-auto px-4 w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-sm font-bold flex flex-col gap-2 shadow-lg"
              dir="rtl"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-xs font-black">ئاگاداری بەکارهێنان!</span>
              </div>
              <p className="text-xs leading-relaxed font-medium">{sessionBlockMsg}</p>
            </motion.div>
          </div>
        )}
        <LoginScreen 
          onSessionBlock={(msg) => setSessionBlockMsg(msg)} 
          onDemoLogin={() => setCurrentUser({ uid: 'demo_user', email: 'demo@domain.com' } as FirebaseUser)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12" dir="rtl">
      {/* App Main Header Bar */}
      <header className="bg-white border-b border-slate-100 py-4 px-4 mb-6 sticky top-0 z-10 shadow-3xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs">
              S
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                سیستەمی تەڵەبەکانی شێین
              </h1>
              <p className="text-[10px] text-slate-500 font-bold leading-none mt-1">
                ناوخۆی بەکارهێنەر: {currentUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogOut}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="چوونەدەرەوە لە هەژمار"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">چوونەدەرەوە</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Elements */}
      <main className="max-w-xl mx-auto px-4 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-200/50 p-1 rounded-2xl border border-slate-200/30">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-xs border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>کۆکراوەی کڕیار</span>
          </button>
          <button
            onClick={() => setActiveTab('add-order')}
            className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'add-order'
                ? 'bg-white text-slate-900 shadow-xs border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>کاڵای نوێ</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>ڕاپۆرتی مانگانە</span>
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-white text-slate-900 shadow-xs border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>کشف حسابی کڕیاران</span>
          </button>
        </div>

        {/* Dynamic Section Contents */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-bold">زانیارییەکان چاکسازی دەکرێن...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {activeTab === 'reports' ? (
              <MonthlyReports orders={orders} activeView="reports" />
            ) : activeTab === 'invoice' ? (
              <MonthlyReports orders={orders} activeView="invoice" />
            ) : activeTab === 'add-order' ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-black">زیادکردنی تەڵەب و داواکاری نوێ</h3>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                    ناوی تەواوی کڕیار، ژمارەی مۆبایل، ناونیشانی فەرمی، و کۆدی کاڵاکانی سەر پاکێتی شێین زیاد بکە.
                  </p>
                </div>
                <AddOrderForm onAddOrders={(name, phone, address, items) => {
                  handleAddOrders(name, phone, address, items);
                  setActiveTab('orders'); // Auto navigate to list
                }} />
              </div>
            ) : (
              <>
                {/* Camera OCR scanning block */}
                <AnimatePresence>
                  {isCameraOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <CameraSnapshotOCR 
                        orders={orders}
                        onMatchFound={handleOcrMatchFound}
                        onClose={() => setIsCameraOpen(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main statistics cards */}
                <OrderStats orders={orders} />

                {/* Real-time search engine trigger panel with embedded Camera OCR activation */}
                <SearchAndFilter
                  searchQuery={searchQuery}
                  onSearchChange={(q) => {
                    setSearchQuery(q);
                    setScannedCode(null);
                  }}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  ordersCount={ordersCount}
                  onCameraClick={() => setIsCameraOpen(!isCameraOpen)}
                />

                {/* Primary Data List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span>
                          {viewMode === 'grouped'
                            ? `کڕیارەکان (${groupedOrders.length})`
                            : `کاڵا تۆمارکراوەکان (${filteredOrders.length})`}
                        </span>
                      </h3>
                      {isSearchActive && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                          فلتەری گەڕان
                        </span>
                      )}
                    </div>

                    {/* View type switcher tabs */}
                    <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                          viewMode === 'grouped'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        title="لیستی ڕێکخراوی کڕیاران"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>بە کڕیار</span>
                      </button>
                      <button
                        onClick={() => setViewMode('flat')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                          viewMode === 'flat'
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        title="لیستی سەرجەم داواکارییەکان بە گشتی"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>یەک لیستی گشتی</span>
                      </button>
                    </div>
                  </div>

                  {/* Empty state visual layout */}
                  {filteredOrders.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-200 rounded-3xl py-12 px-4 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <HelpCircle className="w-6 h-6 text-slate-400" />
                      </div>
                      <h4 className="font-bold text-slate-700 text-sm mb-1">هیچ داواکارییەک نییە</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                        {searchQuery
                          ? 'هیچ داواکارییەک یان کۆدێکی گونجاو لەگەڵ بەهای گەڕانەکەتدا نەدۆزرایەوە.'
                          : 'هیچ زانیارییەک تۆمار نەکراوە بۆ ئەم مۆدە لە ئێستادا.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {viewMode === 'grouped' ? (
                          groupedOrders.map((group) => (
                            <motion.div
                              key={group.name}
                              layout
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CustomerGroupCard
                                customerName={group.name}
                                customerPhone={group.phone}
                                groupOrders={group.orders}
                                onToggleStatus={handleToggleStatus}
                                onDeleteOrder={handleDeleteOrder}
                                onEditOrder={handleEditOrder}
                                scannedCode={scannedCode}
                                searchQuery={searchQuery}
                              />
                            </motion.div>
                          ))
                        ) : (
                          filteredOrders.map((order) => (
                            <motion.div
                              key={order.id}
                              layout
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                            >
                              <OrderCard
                                order={order}
                                onToggleStatus={handleToggleStatus}
                                onDeleteOrder={handleDeleteOrder}
                                onEditOrder={handleEditOrder}
                                scannedCode={scannedCode}
                                searchQuery={searchQuery}
                              />
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
