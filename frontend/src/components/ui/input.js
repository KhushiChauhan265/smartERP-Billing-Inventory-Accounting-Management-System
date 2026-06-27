import React from "react";

export function Input({ className, ...props }) {
  return (
    <input
      className={`flex h-9 w-full rounded-full border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-md transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-50 ${className || ""}`}
      {...props}
    />
  );
}
