"use client";
import { useEffect } from "react";

/**
 * Hook for mapping keyboard shortcuts to actions.
 * @param {Array} shortcuts - Array of shortcut objects:
 * {
 *   key: String (e.g. "s", "f1", "escape"),
 *   ctrlKey: Boolean (default false),
 *   altKey: Boolean (default false),
 *   shiftKey: Boolean (default false),
 *   handler: Function,
 *   preventDefault: Boolean (default true)
 * }
 */
export function usePageShortcuts(shortcuts = []) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if the user is typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused =
        activeTag === "input" || activeTag === "textarea" || activeTag === "select" || document.activeElement?.isContentEditable;

      // Special exception for CTRL+F (we want it to work even if an input is focused, unless we want to keep it simple and just rely on global prevent)
      // We will allow CTRL+S and others to be ignored if inside an input, UNLESS it's explicitly designed to save forms.
      // But per spec: "ignore shortcuts when focus is inside input, textarea, select"
      
      for (const shortcut of shortcuts) {
        const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !!shortcut.ctrlKey === (e.ctrlKey || e.metaKey);
        const matchesAlt = !!shortcut.altKey === e.altKey;
        const matchesShift = !!shortcut.shiftKey === e.shiftKey;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift) {
          
          // Allow CTRL+S inside inputs if the shortcut specifically allows it (e.g. save form)
          if (isInputFocused && !shortcut.allowInInput) {
             continue; // Skip this shortcut, user is typing
          }

          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          break; // Stop checking other shortcuts if one matches
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
