import React from "react";

export function Button({ className, variant = "default", size = "default", ...props }) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-black text-white shadow hover:bg-black/90",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-500/90",
    outline: "border border-gray-200 bg-transparent shadow-sm hover:bg-gray-100 text-black",
    secondary: "bg-gray-100 text-black shadow-sm hover:bg-gray-100/80",
    ghost: "hover:bg-gray-100 hover:text-black",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className || ""}`} {...props} />;
}
