"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageSide from "../components/pexels/ImageSide";
import PasswordInput from "../components/auth/PasswordInput";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Check, Mail, Shield, ArrowRight, Camera, Loader2, LogIn, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;

  // Wizard Steps: 'login' | 'verify' | 'onboarding' | 'success'
  const [step, setStep] = useState<"login" | "verify" | "onboarding" | "success">("login");

  // Handle OAuth callback — token passed as ?token= from backend
  useEffect(() => {
    if (searchParams) {
      const tokenParam = searchParams.get("token");
      const errorParam = searchParams.get("error");
      if (errorParam) {
        showToast(`Logowanie OAuth nie powiodło się: ${errorParam}`);
        router.replace("/login");
      } else if (tokenParam) {
        (async () => {
          try {
            const res = await fetch(`${API_URL}/users/me`, {
              headers: { Authorization: `Bearer ${tokenParam}` },
            });
            if (!res.ok) throw new Error("Invalid token");
            const user = await res.json();
            localStorage.setItem("novidia_token", tokenParam);
            localStorage.setItem("novidia_user", JSON.stringify(user));
            window.dispatchEvent(new Event("novidia_auth_change"));
            // Check if onboarding needed
            if (!user.isOnboarded) {
              setOnboardUser(user);
              setTempToken(tokenParam);
              setStep("onboarding");
            } else {
              router.push("/");
            }
          } catch {
            showToast("Nieprawidłowy token logowania.");
          }
        })();
      }
    }
  }, []);
  


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
    if (onboardUser && !hasUploadedCustomImage) {
      const nameParam = encodeURIComponent(`${onboardUser.firstName} ${onboardUser.lastName}`.trim() || "User");
      const url = `https://ui-avatars.com/api/?name=${nameParam}&background=36316A&color=fff&size=200&bold=true`;
      setTimeout(() => setSelectedAvatar(url), 0);
    }
  }, [onboardUser, hasUploadedCustomImage]);

  // Keep cropping offset bounded so users cannot drag/zoom outside image bounds
  const updateCropOffset = (newOffset: { x: number; y: number }, zoom: number, size: { width: number; height: number }) => {
    if (!cropImage || size.width === 0 || size.height === 0) return;
    const W = size.width * zoom;
    const H = size.height * zoom;
    
    const minX = 96 - W / 2;
    const maxX = -96 + W / 2;
    const minY = 96 - H / 2;
    const maxY = -96 + H / 2;
    
    setCropOffset({
      x: Math.max(minX, Math.min(maxX, newOffset.x)),
      y: Math.max(minY, Math.min(maxY, newOffset.y)),
    });
  };


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
    
    updateCropOffset({ x: rawX, y: rawY }, cropZoom, imageSize);
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
// Framer Motion Variants
const slideVariants: Variants = {
  enter: { x: 100, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { x: -100, opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } },
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
                <div className="pointer-events-auto flex flex-col gap-1.5 max-w-sm min-w-17.5">
                  {/* Above the main box: 2 bars, count badge, and close button */}
                  <div className="flex items-center justify-between gap-3 w-full px-1">
                    {/* 2 bars */}
                    <div className="grow flex items-center h-1 gap-2">
                      {/* Left part (filled) */}
                      <motion.div 
                        key={`${latestToast.id}-left`}
                        initial={{ flexGrow: 0, flexBasis: 0 }}
                        animate={{ flexGrow: 100 }}
                        transition={{ duration: 4, ease: "linear" }}
                        className={`h-1 rounded-full ${latestToast.type === "error" ? "bg-red-500" : "bg-green-500"}`}
                      />
                      {/* Right part (empty) */}
                      <motion.div 
                        key={`${latestToast.id}-right`}
                        initial={{ flexGrow: 100, opacity: 1 }}
                        animate={{ flexGrow: 0, opacity: 0 }}
                        transition={{ duration: 4, ease: "linear" }}
                        className="h-1 rounded-full bg-zinc-300"
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
              <button onClick={() => setCropImage(null)} className="text-zinc-500 hover:text-zinc-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div 
              className="w-full h-72 relative overflow-hidden bg-zinc-50 rounded-2xl flex items-center justify-center cursor-move"
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
                  onChange={(e) => {
                    const newZoom = parseFloat(e.target.value);
                    setCropZoom(newZoom);
                    updateCropOffset(cropOffset, newZoom, imageSize);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />                
                {/* Custom Track & Handle Layout */}
                <div className="w-full flex items-center h-1 gap-3 pointer-events-none z-0">
                  {/* Left segment (filled) */}
                  <div 
                    className="h-1 bg-main rounded-full transition-all duration-75"
                    style={{ flexGrow: Math.max(0.001, ((cropZoom - 1) / 2) * 100), flexBasis: 0 }}
                  />
                  {/* Handle */}
                  <div className="w-1.25 h-3 rounded-full bg-main shrink-0" />
                  {/* Right segment (empty) */}
                  <div 
                    className="h-1 bg-zinc-200 rounded-full transition-all duration-75"
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
                        className={`w-full h-14 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-500 text-zinc-800 text-center text-sm ${
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

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-xs font-semibold text-zinc-400">lub</span>
                    <div className="flex-1 h-px bg-zinc-200" />
                  </div>

                  {/* Social Login Buttons */}
                  <SocialButtons apiUrl={API_URL} />

                  <p className="text-center text-zinc-500 text-xs mt-2">
                    Nie masz jeszcze konta?&apos;{" "}
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
                        className="w-full h-14 rounded-xl border border-zinc-200 text-center font-semibold text-lg text-zinc-800 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent bg-white shadow-sm placeholder:text-zinc-500 placeholder:text-sm placeholder:font-normal"
                      />

                      <div className="flex flex-col items-center gap-1 min-h-6">
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
                      className="text-zinc-500 hover:text-zinc-600 transition-colors font-medium cursor-pointer"
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
                          <p className="text-xs text-zinc-500 font-montserrat">
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
                            className="absolute bottom-1 right-1 w-10 h-10 bg-zinc-200 hover:bg-zinc-300 hover:bg-zinc-200 text-zinc-600 rounded-full flex items-center justify-center shadow-lg border-4 border-zinc-50 border-zinc-200 cursor-pointer transition-all"
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
                  <div className="w-20 h-20 rounded-full bg-green-100 bg-green-950/30 border border-green-200 border-green-900/50 text-green-600 text-green-400 flex items-center justify-center mb-2 shadow-sm transition-colors">
                    <Check size={40} className="stroke-[3px]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-main text-lightest font-fraunces mb-2">
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

const PROVIDER_META: Record<string, { label: string; bg: string; hover: string; color: string }> = {
  google: { label: "Google", bg: "bg-white", hover: "hover:bg-zinc-50", color: "text-zinc-700" },
  facebook: { label: "Facebook", bg: "bg-[#1877F2]", hover: "hover:bg-[#166fe5]", color: "text-white" },
  apple: { label: "Apple", bg: "bg-black", hover: "hover:bg-zinc-900", color: "text-white" },
  discord: { label: "Discord", bg: "bg-[#5865F2]", hover: "hover:bg-[#4752c4]", color: "text-white" },
};

function SocialLogoSvg({ provider }: { provider: string }) {
  if (provider === "google") return (
    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  );
  if (provider === "facebook") return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  );
  if (provider === "apple") return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
  );
  if (provider === "discord") return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
  );
  return null;
}

function SocialButtons({ apiUrl }: { apiUrl: string }) {
  const ALL_PROVIDERS = ["google", "facebook", "apple", "discord"];
  const [providers, setProviders] = useState(ALL_PROVIDERS);

  useEffect(() => {
    fetch(`${apiUrl}/auth/providers`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.providers || [];
        if (list.length > 0) setProviders(list);
      })
      .catch(() => {}); // show all if backend unavailable
  }, [apiUrl]);

  return (
    <div className="flex flex-col gap-2.5">
      {providers.map((p) => {
        const meta = PROVIDER_META[p];
        if (!meta) return null;
        return (
          <a
            key={p}
            href={`${apiUrl}/auth/${p}/login`}
            className={`w-full h-12 rounded-xl border border-zinc-200 ${meta.bg} ${meta.hover} ${meta.color} font-semibold flex items-center justify-center gap-3 transition-all text-sm cursor-pointer`}
          >
            <SocialLogoSvg provider={p} />
            {meta.label}
          </a>
        );
      })}
    </div>
  );
}
