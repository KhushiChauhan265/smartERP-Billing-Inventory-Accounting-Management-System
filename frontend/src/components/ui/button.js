import React from "react";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-indigo-600 text-white shadow hover:bg-indigo-500 border border-transparent",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600 border border-transparent",
    outline: "border border-slate-600 bg-transparent shadow-sm hover:bg-slate-700 text-slate-200",
    secondary: "bg-slate-700 text-slate-100 shadow-sm hover:bg-slate-600 border border-transparent",
    ghost: "hover:bg-slate-800 hover:text-slate-100 text-slate-300",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className || ""}`} {...props} />;
}
