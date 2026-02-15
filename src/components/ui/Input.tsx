"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-lg border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-white placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-transparent resize-none ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
