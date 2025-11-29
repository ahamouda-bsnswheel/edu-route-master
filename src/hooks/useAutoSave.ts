import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // in milliseconds
  enabled?: boolean;
  storageKey?: string; // for localStorage backup
}

export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000, // 30 seconds default
  enabled = true,
  storageKey,
}: UseAutoSaveOptions<T>) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dataRef = useRef(data);
  const lastSavedDataRef = useRef<T | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
    
    // Check if data has changed from last saved
    if (lastSavedDataRef.current !== null) {
      const hasChanges = JSON.stringify(data) !== JSON.stringify(lastSavedDataRef.current);
      setHasUnsavedChanges(hasChanges);
    }

    // Save to localStorage as backup
    if (storageKey && data) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [data, storageKey]);

  // Save function
  const save = useCallback(async (showToast = false) => {
    if (!enabled || isSaving) return;
    
    const currentData = dataRef.current;
    
    // Skip if no changes
    if (lastSavedDataRef.current !== null && 
        JSON.stringify(currentData) === JSON.stringify(lastSavedDataRef.current)) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(currentData);
      lastSavedDataRef.current = currentData;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      if (showToast) {
        toast.success('Auto-saved');
      }
      
      // Clear localStorage backup on successful save
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      if (showToast) {
        toast.error('Auto-save failed');
      }
    } finally {
      setIsSaving(false);
    }
  }, [enabled, isSaving, onSave, storageKey]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      save(true);
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, save]);

  // Save on unmount or navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save on unmount
      if (hasUnsavedChanges) {
        save(false);
      }
    };
  }, [hasUnsavedChanges, save]);

  // Debounced save (for triggering save after user stops typing)
  const debouncedSave = useCallback((delay = 2000) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      save(false);
    }, delay);
  }, [save]);

  // Restore from localStorage
  const restoreFromStorage = useCallback((): T | null => {
    if (!storageKey) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  }, [storageKey]);

  // Clear storage
  const clearStorage = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    save,
    debouncedSave,
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    restoreFromStorage,
    clearStorage,
  };
}
