"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageSide from "../components/pexels/ImageSide";
import PasswordInput from "../components/auth/PasswordInput";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mail, Shield, ArrowRight, Camera, Loader2, LogIn, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function LoginPage() {
  const router = useRouter();

  // Wizard Steps: 'login' | 'verify' | 'onboarding' | 'success'
  const [step, setStep] = useState<"login" | "verify" | "onboarding" | "success">("login");
  


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
    login: "", // email or username
    password: "",
  });

  // User details for verification/onboarding redirects
  const [userEmail, setUserEmail] = useState("");
  const [onboardUser, setOnboardUser] = useState<{ firstName: string; lastName: string } | null>(null);

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

  // Initialize UI-Avatars URL when name changes during login redirects
  useEffect(() => {
    if (onboardUser) {
      const nameParam = encodeURIComponent(`${onboardUser.firstName} ${onboardUser.lastName}`.trim() || "User");
      const url = `https://ui-avatars.com/api/?name=${nameParam}&background=36316A&color=fff&size=200&bold=true`;
      if (!hasUploadedCustomImage) {
        setSelectedAvatar(url);
      }
    }
  }, [onboardUser, hasUploadedCustomImage]);

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

  // Step 1: Submit Login Form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Client-side verification
    const newErrors: Record<string, boolean> = {};
    if (!formData.login) newErrors.login = true;
    if (!formData.password) newErrors.password = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Proszę wpisać login oraz hasło.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ login: true, password: true });
        throw new Error(data.message || "Błąd logowania.");
      }

      setTempToken(data.token);
      
      if (data.status === "needs_verification") {
        setUserEmail(data.user.email);
        setTimeLeft(900); // Reset timer
        setResendCooldown(30); // Reset cooldown
        setStep("verify");
        showToast("Konto nie jest zweryfikowane. Wysłano kod na Twój e-mail.", "error");
      } else if (data.status === "needs_onboarding") {
        setUserEmail(data.user.email);
        setOnboardUser(data.user);
        setStep("onboarding");
        showToast("Wymagane jest dokończenie konfiguracji profilu.", "success");
      } else {
        // Successful login
        localStorage.setItem("novidia_token", data.token);
        localStorage.setItem("novidia_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("novidia_auth_change"));
        router.push("/");
      }
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
        body: JSON.stringify({ email: userEmail, code }),
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
        router.push("/");
      } else {
        setOnboardUser(data.user);
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
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Błąd wysyłania kodu.");
      }
      setTimeLeft(900); // Reset timer
      setResendCooldown(30); // Reset cooldown
      setVerificationCode("");
      showToast("Wysłano nowy kod weryfikacyjny!", "success");
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

  // Process Crop
  const handleCropApply = () => {
    if (!cropImage || !cropImgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = cropImgRef.current;
    const fitW = imageSize.width;
    const fitH = imageSize.height;

    ctx.clearRect(0, 0, 200, 200);

    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, Math.PI * 2);
    ctx.clip();

    const scaleFactor = 200 / 192;
    ctx.scale(scaleFactor, scaleFactor);
    
    ctx.translate(96 + cropOffset.x, 96 + cropOffset.y);
    ctx.scale(cropZoom, cropZoom);
    ctx.drawImage(img, -fitW / 2, -fitH / 2, fitW, fitH);

    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedAvatar(croppedBase64);
    setHasUploadedCustomImage(true);
    setCropImage(null);
    showToast("Awatar zaktualizowany pomyślnie.", "success");
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
      router.push("/");
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
                  <div className="w-[5px] h-[12px] rounded-full bg-main shrink-0" />
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
        <div className="w-full h-full rounded-2xl bg-zinc-50 flex pointer-events-auto justify-center overflow-y-auto">
          <div className="w-full max-w-lg flex flex-col self-center p-8 md:p-12 relative">

            <AnimatePresence mode="wait">
              {/* STEP 1: LOGIN FORM */}
              {step === "login" && (
                <motion.div
                  key="login"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-main font-fraunces mb-2">
                      Zaloguj się
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm">
                      Zaloguj się na swoje konto, aby zarządzać szkolnymi artykułami.
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex flex-col gap-4 py-2">
                      <div className="w-full h-14 bg-zinc-200 rounded-xl animate-pulse" />
                      <div className="w-full h-16 bg-zinc-200 rounded-xl animate-pulse" />
                      <div className="w-full h-14 bg-zinc-300 rounded-xl animate-pulse mt-4" />
                    </div>
                  ) : (
                    <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                      <input
                        type="text"
                        placeholder="Nazwa użytkownika lub E-Mail"
                        value={formData.login}
                        onChange={(e) => {
                          setFormData({ ...formData, login: e.target.value });
                          setErrors({ ...errors, login: false });
                        }}
                        className={`w-full h-14 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-400 text-zinc-800 text-center text-sm ${
                          errors.login ? "border-2 border-red-500 ring-2 ring-red-500/20" : "border border-zinc-200"
                        }`}
                      />

                      <PasswordInput
                        value={formData.password}
                        onChange={(val) => {
                          setFormData({ ...formData, password: val });
                          setErrors({ ...errors, password: false });
                        }}
                        placeholder="Hasło"
                        showStrengthMeter={false}
                        className={errors.password ? "border-2 border-red-500 ring-2 ring-red-500/20" : ""}
                      />

                      <button
                        type="submit"
                        className="w-full h-14 mt-2 rounded-xl bg-main hover:brightness-110 text-white font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                      >
                        <span>Zaloguj się</span>
                        <LogIn size={16} />
                      </button>
                    </form>
                  )}

                  <p className="text-center text-zinc-400 text-xs mt-2">
                    Nie masz jeszcze konta?{" "}
                    <Link href="/register" className="text-main font-semibold hover:underline">
                      Zarejestruj się
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* STEP 2: VERIFY CODE */}
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
                      Twoje konto nie zostało jeszcze zweryfikowane. Wpisz 6-cyfrowy kod wysłany na adres <span className="font-semibold text-zinc-700">{userEmail}</span>.
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

                      <div className="flex flex-col items-center gap-1 min-h-[24px]">
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

                      <button
                        type="submit"
                        disabled={timeLeft <= 0}
                        className="w-full h-14 rounded-xl bg-main hover:brightness-110 text-white font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                      >
                        <span>Zweryfikuj e-mail</span>
                        <Check size={16} />
                      </button>
                    </form>
                  )}

                  <div className="flex justify-center items-center text-xs mt-2 border-t border-zinc-200 pt-4">
                    <button
                      onClick={() => setStep("login")}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
                    >
                      Powrót do logowania
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

              {/* STEP 4: SUCCESS */}
              {step === "success" && (
                <motion.div
                  key="success"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center justify-center text-center gap-6 py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-green-100 border border-green-200 text-green-600 flex items-center justify-center mb-2 shadow-sm">
                    <Check size={40} className="stroke-[3px]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-main font-fraunces mb-2">
                      Zalogowano pomyślnie!
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm max-w-xs mx-auto">
                      Witaj ponownie! Zostałeś pomyślnie zalogowany do platformy Novidia.
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
