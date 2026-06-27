import React from "react";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const base = "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-gradient-to-r from-[#C68642] to-[#8B5E3C] text-[#FFFDF9] shadow hover:bg-[#C68642] border border-transparent",
    destructive: "bg-red-600 text-white shadow-md hover:bg-red-700 border border-transparent",
    outline: "border border-[#EFE7DD] bg-transparent shadow-md hover:bg-[#E7C9A9] text-[#2F2F2F]",
    secondary: "bg-[#E7C9A9] text-[#2F2F2F] shadow-md hover:bg-[#FFFDF9] border border-transparent",
    ghost: "hover:bg-[#FFFDF9] hover:text-[#2F2F2F] text-[#2F2F2F]/90",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-full px-3 text-xs",
    lg: "h-10 rounded-full px-8",
    icon: "h-9 w-9",
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className || ""}`} {...props} />;
}
