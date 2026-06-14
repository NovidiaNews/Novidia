"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageSide from "../components/pexels/ImageSide";
import PasswordInput from "../components/auth/PasswordInput";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mail, Shield, ArrowRight, Camera, Loader2, Upload, X } from "lucide-react";
import confetti from "canvas-confetti";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: any) {
      myConfetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * particleRatio) }));
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, { spread: 60 });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 top-0 w-full h-full pointer-events-none z-20"
    />
  );
}

export default function RegisterPage() {
  const router = useRouter();

  // Wizard Steps: 'register' | 'verify' | 'onboarding' | 'success'
  const [step, setStep] = useState<"register" | "verify" | "onboarding" | "success">("register");
  


  // Loaders & Errors
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
  });

  // TOS Consent State
  const [tosConsent, setTosConsent] = useState(false);

  // Verification State
  const [verificationCode, setVerificationCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const [resendCooldown, setResendCooldown] = useState(30);

  // Onboarding State
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [hasUploadedCustomImage, setHasUploadedCustomImage] = useState(false);
  const [bio, setBio] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temporary token stored during steps
  const [tempToken, setTempToken] = useState<string | null>(null);

  // Crop Modal State
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Initialize UI-Avatars URL when name changes
  useEffect(() => {
    if (formData.firstName || formData.lastName) {
      const nameParam = encodeURIComponent(`${formData.firstName} ${formData.lastName}`.trim() || "User");
      const url = `https://ui-avatars.com/api/?name=${nameParam}&background=random&color=fff&size=200&bold=true`;
      if (!hasUploadedCustomImage) {
        setSelectedAvatar(url);
      }
    }
  }, [formData.firstName, formData.lastName, hasUploadedCustomImage]);

  // Keep cropping offset bounded so users cannot drag/zoom outside image bounds
  useEffect(() => {
    if (!cropImage || imageSize.width === 0 || imageSize.height === 0) return;
    const W = imageSize.width * cropZoom;
    const H = imageSize.height * cropZoom;
    
    const minX = 96 - W / 2;
    const maxX = -96 + W / 2;
    const minY = 96 - H / 2;
    const maxY = -96 + H / 2;
    
    setCropOffset((prev) => ({
      x: Math.max(minX, Math.min(maxX, prev.x)),
      y: Math.max(minY, Math.min(maxY, prev.y)),
    }));
  }, [cropZoom, imageSize, cropImage]);

  // Verification timer countdown
  useEffect(() => {
    if (step !== "verify" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Resend code cooldown countdown
  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Step 1: Submit Register Form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Client-side verification
    const newErrors: Record<string, boolean> = {};
    if (!formData.firstName) newErrors.firstName = true;
    if (!formData.lastName) newErrors.lastName = true;
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = true;
    if (!formData.username) newErrors.username = true;
    if (!formData.password || formData.password.length < 8) newErrors.password = true;
    if (!tosConsent) newErrors.tosConsent = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.tosConsent) {
        showToast("Musisz zaakceptować regulamin (TOS), aby założyć konto.");
      } else {
        showToast("Proszę poprawnie uzupełnić wszystkie wyróżnione pola.");
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.message && data.message.toLowerCase().includes("e-mail") || data.message.toLowerCase().includes("istnieje")) {
          setErrors({ email: true, username: true });
        }
        throw new Error(data.message || "Błąd podczas rejestracji.");
      }

      setTempToken(data.token);
      setTimeLeft(900); // Reset timer to 15 mins
      setResendCooldown(30); // Reset cooldown
      setStep("verify");
      showToast("Konto utworzone. Wysłano kod weryfikacyjny na Twój e-mail.", "success");
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Verification Code
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const code = verificationCode;
    if (code.length < 6) {
      showToast("Wprowadź pełny 6-cyfrowy kod.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Błąd weryfikacji.");
      }

      setTempToken(data.token);
      showToast("E-mail zweryfikowany pomyślnie!", "success");

      if (data.status === "success") {
        localStorage.setItem("novidia_token", data.token);
        localStorage.setItem("novidia_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("novidia_auth_change"));
        setStep("success");
      } else {
        setStep("onboarding");
      }
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend Code
  const handleResendCode = async () => {
    try {
      const res = await fetch(`${API_URL}/users/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Błąd wysyłania kodu.");
      }
      setTimeLeft(900); // Reset timer
      setResendCooldown(30); // Reset cooldown
      setVerificationCode("");
      showToast("Nowy kod weryfikacyjny został wysłany!", "success");
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // Handle Photo Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setCropImage(reader.result);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Crop drag event handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - cropOffset.x, y: clientY - cropOffset.y });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    const rawX = clientX - dragStart.x;
    const rawY = clientY - dragStart.y;
    
    if (imageSize.width > 0 && imageSize.height > 0) {
      const W = imageSize.width * cropZoom;
      const H = imageSize.height * cropZoom;
      const minX = 96 - W / 2;
      const maxX = -96 + W / 2;
      const minY = 96 - H / 2;
      const maxY = -96 + H / 2;
      
      setCropOffset({
        x: Math.max(minX, Math.min(maxX, rawX)),
        y: Math.max(minY, Math.min(maxY, rawY)),
      });
    } else {
      setCropOffset({ x: rawX, y: rawY });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Process Crop and generate base64 output
  const handleCropApply = () => {
    if (!cropImage || !cropImgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = cropImgRef.current;
    
    // Fit dimensions calculated during load
    const fitW = imageSize.width;
    const fitH = imageSize.height;

    ctx.clearRect(0, 0, 200, 200);

    // Apply circular clipping path
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.clip();

    // Map viewport coordinates
    const scaleFactor = 200 / 192; // modal viewport size in UI is 192px
    ctx.scale(scaleFactor, scaleFactor);
    
    // Translate and draw
    ctx.translate(96 + cropOffset.x, 96 + cropOffset.y);
    ctx.scale(cropZoom, cropZoom);
    ctx.drawImage(img, -fitW / 2, -fitH / 2, fitW, fitH);

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedAvatar(croppedBase64);
    setHasUploadedCustomImage(true);
    setCropImage(null);
    showToast("Awatar został pomyślnie zaktualizowany.", "success");
  };

  // Submit Onboarding
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/users/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({
          profilePicture: selectedAvatar,
          bio,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Błąd zapisu profilu.");
      }

      localStorage.setItem("novidia_token", tempToken || "");
      localStorage.setItem("novidia_user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("novidia_auth_change"));
      setStep("success");
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { x: 100, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { x: -100, opacity: 0, transition: { duration: 0.3, ease: "easeIn" } },
  };

  return (
    <div className="w-full h-screen absolute inset-0 pointer-events-none z-1">
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-6 pointer-events-none">
        <AnimatePresence>
          {Object.entries(
            toasts.reduce<Record<string, Toast[]>>((acc, t) => {
              if (!acc[t.message]) acc[t.message] = [];
              acc[t.message].push(t);
              return acc;
            }, {})
          ).map(([message, group]) => {
            const latestToast = group[group.length - 1];
            
            return (
              <motion.div
                key={message}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="relative pointer-events-auto"
              >
                <div className="pointer-events-auto flex flex-col gap-1.5 max-w-sm min-w-[280px]">
                  {/* Above the main box: 2 bars, count badge, and close button */}
                  <div className="flex items-center justify-between gap-3 w-full px-1">
                    {/* 2 bars */}
                    <div className="flex-grow flex items-center h-[4px] gap-2">
                      {/* Left part (filled) */}
                      <motion.div 
                        key={`${latestToast.id}-left`}
                        initial={{ flexGrow: 0, flexBasis: 0 }}
                        animate={{ flexGrow: 100 }}
                        transition={{ duration: 4, ease: "linear" }}
                        className={`h-[4px] rounded-full ${latestToast.type === "error" ? "bg-red-500" : "bg-green-500"}`}
                      />
                      {/* Right part (empty) */}
                      <motion.div 
                        key={`${latestToast.id}-right`}
                        initial={{ flexGrow: 100, opacity: 1 }}
                        animate={{ flexGrow: 0, opacity: 0 }}
                        transition={{ duration: 4, ease: "linear" }}
                        className="h-[4px] rounded-full bg-zinc-300"
                        style={{ flexBasis: 0 }}
                      />
                    </div>

                    {/* iOS-like count badge */}
                    {group.length > 1 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 select-none font-bold shadow-sm border ${
                        latestToast.type === "error" 
                          ? "bg-red-100 border-red-200 text-red-800" 
                          : "bg-green-100 border-green-200 text-green-800"
                      }`}>
                        {group.length}
                      </span>
                    )}

                    {/* Close Button: floating X in a round box */}
                    <button
                      onClick={() => {
                        setToasts((prev) => prev.filter((item) => item.message !== message));
                      }}
                      className={`w-6 h-6 rounded-full border cursor-pointer transition-colors shrink-0 flex items-center justify-center shadow-sm bg-white hover:bg-zinc-100 ${
                        latestToast.type === "error" ? "border-red-200 text-red-800" : "border-green-200 text-green-800"
                      }`}
                    >
                      <X size={12} className="stroke-[2.5px]" />
                    </button>
                  </div>

                  {/* The Main Box */}
                  <div className="relative w-full">
                    {/* Background iOS Stack Cards */}
                    {group.length > 2 && (
                      <div 
                        className={`absolute inset-0 rounded-xl border shadow-sm scale-[0.92] translate-y-4 opacity-40 -z-20 transition-all duration-300 ${
                          latestToast.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                        }`}
                      />
                    )}
                    {group.length > 1 && (
                      <div 
                        className={`absolute inset-0 rounded-xl border shadow-md scale-[0.96] translate-y-2 opacity-70 -z-10 transition-all duration-300 ${
                          latestToast.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                        }`}
                      />
                    )}

                    <div
                      className={`p-4 rounded-xl shadow-md border text-sm font-semibold text-left leading-snug w-full transition-all ${
                        latestToast.type === "error"
                          ? "bg-red-50 border-red-200 text-red-800"
                          : "bg-green-50 border-green-200 text-green-800"
                      }`}
                    >
                      {latestToast.message}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* CROP MODAL OVERLAY */}
      {cropImage && (
        <div className="fixed inset-0 bg-black/70 z-110 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-800 font-montserrat">Dostosuj awatar</h3>
              <button onClick={() => setCropImage(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Draggable Viewport Container */}
            <div 
              className="w-full h-72 relative overflow-hidden bg-zinc-950 rounded-2xl flex items-center justify-center cursor-move"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              <img
                ref={(el) => {
                  cropImgRef.current = el;
                }}
                src={cropImage}
                alt="To Crop"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const cropSize = 192; // cutout circle size
                  let w = img.naturalWidth;
                  let h = img.naturalHeight;
                  if (w > h) {
                    h = cropSize;
                    w = (img.naturalWidth / img.naturalHeight) * cropSize;
                  } else {
                    w = cropSize;
                    h = (img.naturalHeight / img.naturalWidth) * cropSize;
                  }
                  setImageSize({ width: w, height: h });
                }}
                style={{
                  transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                  width: imageSize.width || "auto",
                  height: imageSize.height || "auto",
                  userSelect: "none",
                }}
                className="max-w-none transition-transform duration-75 select-none"
              />
              {/* Circular Cutout Layer */}
              <div className="absolute w-48 h-48 rounded-full border-2 border-white pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]" />
            </div>

            {/* Zoom Slider */}
            <div className="flex flex-col gap-1.5 relative select-none">
              <span className="text-xs text-zinc-500 font-semibold font-montserrat">Zoom awatara:</span>
              
              <div className="w-full h-8 relative flex items-center">
                {/* Transparent input range that handles interactions */}
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {/* Custom Track & Handle Layout */}
                <div className="w-full flex items-center h-[4px] gap-3 pointer-events-none z-0">
                  {/* Left segment (filled) */}
                  <div 
                    className="h-[4px] bg-main rounded-full transition-all duration-75"
                    style={{ flexGrow: Math.max(0.001, ((cropZoom - 1) / 2) * 100), flexBasis: 0 }}
                  />
                  {/* Handle */}
                  <div className="w-[5px] h-[20px] rounded-full bg-main shrink-0" />
                  {/* Right segment (empty) */}
                  <div 
                    className="h-[4px] bg-zinc-200 rounded-full transition-all duration-75"
                    style={{ flexGrow: Math.max(0.001, 100 - ((cropZoom - 1) / 2) * 100), flexBasis: 0 }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setCropImage(null)}
                className="w-1/2 py-3 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50 transition-colors cursor-pointer text-sm"
              >
                Anuluj
              </button>
              <button
                onClick={handleCropApply}
                className="w-1/2 py-3 rounded-xl bg-main hover:brightness-110 text-white font-semibold transition-all cursor-pointer text-sm"
              >
                Zatwierdź
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative w-full h-screen flex flex-col md:flex-row gap-6 p-4 pt-25">
        
        {/* LEFT SIDE */}
        <ImageSide />

        {/* RIGHT SIDE */}
        <div className="w-full h-full rounded-2xl bg-zinc-50 flex pointer-events-auto justify-center overflow-y-auto relative">
          {step === "success" && <Confetti />}
          <div className="w-full max-w-lg flex flex-col self-center p-8 md:p-12 relative">
            
            {/* Step Progress Line - 2 boxes (left expanding, right shrinking), 4 gap, 2 height */}
            <div className="w-full flex items-center h-1.5 gap-4 mb-8">
              <div 
                className="h-1.5 bg-main transition-all duration-500 ease-out rounded-full"
                style={{
                  flexGrow: 
                    step === "register" ? 25 :
                    step === "verify" ? 50 :
                    step === "onboarding" ? 75 : 100,
                  flexBasis: 0
                }}
              />
              {step !== "success" && (
                <div 
                  className="h-1.5 bg-zinc-200 transition-all duration-500 ease-out rounded-full"
                  style={{
                    flexGrow: 
                      step === "register" ? 75 :
                      step === "verify" ? 50 :
                      step === "onboarding" ? 25 : 0.001,
                    flexBasis: 0
                  }}
                />
              )}
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: REGISTER */}
              {step === "register" && (
                <motion.div
                  key="register"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-main font-fraunces mb-2">
                      Zarejestruj się
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm">
                      Załóż nowe konto i zacznij kształtować szkolne newsy.
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex flex-col gap-4 py-2">
                      <div className="flex gap-4">
                        <div className="w-1/2 h-14 bg-zinc-200 rounded-xl animate-pulse" />
                        <div className="w-1/2 h-14 bg-zinc-200 rounded-xl animate-pulse" />
                      </div>
                      <div className="w-full h-14 bg-zinc-200 rounded-xl animate-pulse" />
                      <div className="w-full h-14 bg-zinc-200 rounded-xl animate-pulse" />
                      <div className="w-full h-16 bg-zinc-200 rounded-xl animate-pulse" />
                      <div className="w-full h-6 bg-zinc-200/60 rounded-lg animate-pulse mt-2" />
                      <div className="w-full h-14 bg-zinc-300 rounded-xl animate-pulse mt-4" />
                    </div>
                  ) : (
                    <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          placeholder="Imię"
                          value={formData.firstName}
                          onChange={(e) => {
                            setFormData({ ...formData, firstName: e.target.value });
                            setErrors({ ...errors, firstName: false });
                          }}
                          className={`w-1/2 h-14 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-400 text-zinc-800 text-center text-sm ${
                            errors.firstName ? "border-2 border-red-500 ring-2 ring-red-500/20" : "border border-zinc-200"
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Nazwisko"
                          value={formData.lastName}
                          onChange={(e) => {
                            setFormData({ ...formData, lastName: e.target.value });
                            setErrors({ ...errors, lastName: false });
                          }}
                          className={`w-1/2 h-14 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-400 text-zinc-800 text-center text-sm ${
                            errors.lastName ? "border-2 border-red-500 ring-2 ring-red-500/20" : "border border-zinc-200"
                          }`}
                        />
                      </div>
                      
                      <input
                        type="email"
                        placeholder="Adres E-Mail"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setErrors({ ...errors, email: false });
                        }}
                        className={`w-full h-14 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-400 text-zinc-800 text-center text-sm ${
                          errors.email ? "border-2 border-red-500 ring-2 ring-red-500/20" : "border border-zinc-200"
                        }`}
                      />

                      <input
                        type="text"
                        placeholder="Nazwa użytkownika"
                        value={formData.username}
                        onChange={(e) => {
                          setFormData({ ...formData, username: e.target.value });
                          setErrors({ ...errors, username: false });
                        }}
                        className={`w-full h-14 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-400 text-zinc-800 text-center text-sm ${
                          errors.username ? "border-2 border-red-500 ring-2 ring-red-500/20" : "border border-zinc-200"
                        }`}
                      />

                      <PasswordInput
                        value={formData.password}
                        onChange={(val) => {
                          setFormData({ ...formData, password: val });
                          setErrors({ ...errors, password: false });
                        }}
                        placeholder="Utwórz silne hasło"
                        className={errors.password ? "border-2 border-red-500 ring-2 ring-red-500/20" : ""}
                      />

                      {/* Animated TOS Consent Checkbox */}
                      <div className="flex items-center gap-3 mt-2 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTosConsent(!tosConsent);
                            setErrors({ ...errors, tosConsent: false });
                          }}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 ${
                            tosConsent 
                              ? "bg-main border-main text-white shadow-md shadow-main/20" 
                              : errors.tosConsent 
                                ? "border-red-500 bg-red-50/50" 
                                : "border-zinc-200 hover:border-zinc-400 bg-white"
                          }`}
                        >
                          <AnimatePresence>
                            {tosConsent && (
                              <motion.svg
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                className="w-4 h-4 stroke-current"
                                viewBox="0 0 24 24"
                                fill="none"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <motion.polyline
                                  points="20 6 9 17 4 12"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.3 }}
                                />
                              </motion.svg>
                            )}
                          </AnimatePresence>
                        </button>
                        <span className="text-zinc-500 font-medium text-xs select-none">
                          Akceptuję{" "}
                          <a href="/tos" target="_blank" className="text-main font-semibold hover:underline">
                            Regulamin (TOS)
                          </a>{" "}
                          i{" "}
                          <a href="/privacy-policy" target="_blank" className="text-main font-semibold hover:underline">
                            Politykę prywatności
                          </a>{" "}
                          serwisu Novidia.
                        </span>
                      </div>

                      <button
                        type="submit"
                        className="w-full h-14 mt-2 rounded-xl bg-main hover:brightness-110 text-white font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                      >
                        <span>Dalej</span>
                        <ArrowRight size={16} />
                      </button>
                    </form>
                  )}

                  <p className="text-center text-zinc-400 text-xs mt-2">
                    Masz już konto?{" "}
                    <Link href="/login" className="text-main font-semibold hover:underline">
                      Zaloguj się
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* STEP 2: MAIL VERIFICATION */}
              {step === "verify" && (
                <motion.div
                  key="verify"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-50 text-main rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                      <Mail size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-main font-fraunces mb-2">
                      Potwierdź swój e-mail
                    </h1>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto font-montserrat">
                      Wysłaliśmy 6-cyfrowy kod na adres <span className="font-semibold text-zinc-700">{formData.email}</span>.
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex flex-col gap-6 py-2">
                      <div className="w-full h-14 bg-zinc-200 rounded-xl animate-pulse" />
                      <div className="w-1/2 h-4 bg-zinc-200 rounded animate-pulse mx-auto" />
                      <div className="w-full h-14 bg-zinc-300 rounded-xl animate-pulse" />
                    </div>
                  ) : (
                    <form onSubmit={handleVerifySubmit} className="flex flex-col gap-6">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="Wpisz 6-cyfrowy kod weryfikacyjny"
                        value={verificationCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "").substring(0, 6);
                          setVerificationCode(val);
                        }}
                        className="w-full h-14 rounded-xl border border-zinc-200 text-center font-semibold text-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent bg-white shadow-sm placeholder:text-zinc-400 placeholder:text-sm placeholder:font-normal"
                      />

                      <button
                        type="submit"
                        disabled={timeLeft <= 0}
                        className="w-full h-14 rounded-xl bg-main hover:brightness-110 text-white font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                      >
                        <span>Zweryfikuj e-mail</span>
                        <Check size={16} />
                      </button>

                      <div className="flex flex-col items-center gap-1 h-fit">
                        {resendCooldown <= 0 && (
                          <p className="text-zinc-500 text-xs font-montserrat flex items-center gap-1.5">
                            Didn't receive?{" "}
                            <button
                              type="button"
                              onClick={handleResendCode}
                              className="text-main font-semibold hover:underline bg-transparent border-none cursor-pointer"
                            >
                              Resend!
                            </button>
                          </p>
                        )}
                      </div>
                    </form>
                  )}

                  <div className="flex justify-center items-center text-xs mt-2 border-t border-zinc-200 pt-4">
                    <button
                      onClick={() => setStep("register")}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
                    >
                      Zmień e-mail
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: ONBOARDING */}
              {step === "onboarding" && (
                <motion.div
                  key="onboarding"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-main font-fraunces">
                      Uzupełnij profil
                    </h1>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                      <div className="w-48 h-6 bg-zinc-200 rounded animate-pulse" />
                      <div className="w-32 h-4 bg-zinc-200 rounded animate-pulse" />
                      <div className="w-36 h-36 bg-zinc-200 rounded-full animate-pulse" />
                      <div className="w-full max-w-xs h-14 bg-zinc-300 rounded-xl animate-pulse mt-4" />
                    </div>
                  ) : (
                    <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-6">
                      <div className="flex flex-col items-center gap-6 py-4">
                        <div className="text-center">
                          <h2 className="text-lg font-bold text-zinc-800 font-montserrat mb-1">
                            Wybierz zdjęcie profilowe
                          </h2>
                          <p className="text-xs text-zinc-400 font-montserrat">
                            Wgraj własne zdjęcie lub przejdź dalej z domyślnym awatarem.
                          </p>
                        </div>

                        {/* Preview Wrapper */}
                        <div className="relative w-36 h-36">
                          <div className="w-full h-full rounded-full shadow-lg overflow-hidden bg-zinc-50 flex items-center justify-center">
                            {selectedAvatar.startsWith("<svg") ? (
                              <div 
                                className="w-full h-full"
                                dangerouslySetInnerHTML={{ __html: selectedAvatar }}
                              />
                            ) : (
                              <img
                                src={selectedAvatar}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            )}
                          </div>
                          
                          {/* Camera Upload Button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-1 right-1 w-10 h-10 bg-zinc-200 hover:bg-zinc-300 text-zinc-600 rounded-full flex items-center justify-center shadow-lg border-4 border-zinc-50 cursor-pointer transition-all"
                          >
                            <Camera size={18} />
                          </button>
                          
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </div>

                        {/* Submit button */}
                        <button
                          type="submit"
                          className="w-full max-w-xs h-14 rounded-xl bg-main hover:brightness-115 text-white font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm mt-4"
                        >
                          <>
                            <span>{hasUploadedCustomImage ? "OK" : "Pomiń"}</span>
                            <ArrowRight size={16} />
                          </>
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {/* STEP 4: SUCCESS VIEW */}
              {step === "success" && (
                <motion.div
                  key="success"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center justify-center text-center gap-6 py-8 relative"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 border border-green-200 text-green-600 flex items-center justify-center mb-2 shadow-sm">
                    <Check size={40} className="stroke-[3px]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-main font-fraunces mb-2">
                      Konto jest gotowe!
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm max-w-xs mx-auto">
                      Twój profil został pomyślnie skonfigurowany. Witamy w społeczności redakcyjnej Novidii!
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/")}
                    className="w-full max-w-xs h-14 rounded-xl bg-main hover:brightness-110 text-white font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                  >
                    <span>Przejdź do strony głównej</span>
                    <ArrowRight size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </main>
    </div>
  );
}