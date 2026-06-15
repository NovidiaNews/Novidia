"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  className?: string;
  id?: string;
  required?: boolean;
  showStrengthMeter?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Hasło",
  name = "password",
  className = "",
  id = "password",
  required = false,
  showStrengthMeter = true,
}: PasswordInputProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  // Calculate password strength (0 to 100)
  const calculateStrength = (password: string) => {
    if (!password) {
      return 0;
    }

    let score = 0;
    
    // Rule 1: Length >= 8
    if (password.length >= 8) score += 20;
    
    // Rule 2: Contains lowercase
    if (/[a-z]/.test(password)) score += 20;
    
    // Rule 3: Contains uppercase
    if (/[A-Z]/.test(password)) score += 20;
    
    // Rule 4: Contains numbers
    if (/[0-9]/.test(password)) score += 20;
    
    // Rule 5: Contains special characters
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    return score;
  };

  const strength = calculateStrength(value);

  const toggleReveal = () => {
    setIsRevealed(!isRevealed);
  };

  // Get color for password strength meter
  const getStrengthColor = (s: number) => {
    if (s <= 20) return "bg-red-500";
    if (s <= 40) return "bg-orange-500";
    if (s <= 60) return "bg-yellow-500";
    return "bg-green-500"; // 80%+ is green
  };

  const strengthColor = getStrengthColor(strength);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Password Input Container */}
      <div className="relative w-full">
        <input
          type={isRevealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          name={name}
          id={id}
          required={required}
          className={`w-full h-16 rounded-xl border border-zinc-200 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-main focus:border-transparent placeholder:text-zinc-400 text-zinc-800 placeholder:text-center ${className}`}
        />
        <button
          type="button"
          onClick={toggleReveal}
          disabled={!value}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {/* Eye Icon States */}
          {!isRevealed ? (
            <Eye size={20} className="stroke-[2px]" />
          ) : (
            <EyeOff size={20} className="stroke-[2px]" />
          )}
        </button>
      </div>

      {/* Password Strength Meter */}
      {showStrengthMeter && value && (
        <div className="w-full flex items-center h-1.5 gap-4 overflow-hidden rounded-full">
          {/* Expanding Bar */}
          <motion.div
            layout
            animate={{ flexGrow: strength }}
            transition={{ type: "spring", stiffness: 150, damping: 12 }}
            className={`h-1.5 rounded-full ${strengthColor}`}
            style={{ flexBasis: 0 }}
          />
          {/* Shrinking Bar (Background) - fully disappears if strength is 100 */}
          {strength < 100 && (
            <motion.div
              layout
              initial={{ flexGrow: 100 - strength }}
              animate={{ flexGrow: 100 - strength }}
              transition={{ type: "spring", stiffness: 150, damping: 12 }}
              className="h-1.5 rounded-full bg-zinc-200"
              style={{ flexBasis: 0 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
