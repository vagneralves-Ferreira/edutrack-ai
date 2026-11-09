import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePlanner } from './PlannerContext';
import confetti from 'canvas-confetti';

export type TimerMode = 'pomodoro' | 'deepWork' | 'shortBreak';

interface TimerContextType {
  mode: TimerMode;
  setMode: (mode: TimerMode) => void;
  timeLeft: number;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  sessionCompleted: boolean;
  setSessionCompleted: (completed: boolean) => void;
  minutes: number;
  seconds: number;
  formattedTime: string;
  totalDuration: number;
  progressPercentage: number;
}

export const getInitialSeconds = (m: TimerMode): number => {
  if (m === 'pomodoro') return 25 * 60;
  if (m === 'deepWork') return 50 * 60;
  return 5 * 60;
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subjects, logStudyTime } = usePlanner();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    return subjects[0]?.id || 'sql-fundamentals';
  });

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(() => getInitialSeconds('pomodoro'));
  const [isActive, setIsActive] = useState<boolean>(false);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);

  // Sync selectedSubjectId if current one is invalid
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Global countdown interval that survives route changes
  useEffect(() => {
    let interval: any = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  // When timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setSessionCompleted(true);

      const minutesCompleted = mode === 'pomodoro' ? 25 : mode === 'deepWork' ? 50 : 5;
      if (mode !== 'shortBreak') {
        logStudyTime(selectedSubjectId, minutesCompleted);
      }

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1']
        });
      } catch (e) {
        // ignore confetti failure in headless/test environments
      }
    }
  }, [timeLeft, isActive, mode, selectedSubjectId, logStudyTime]);

  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(getInitialSeconds(newMode));
    setSessionCompleted(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getInitialSeconds(mode));
    setSessionCompleted(false);
  };

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(getInitialSeconds(mode));
      setSessionCompleted(false);
    }
    setIsActive((prev) => !prev);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = getInitialSeconds(mode);
  const progressPercentage = Math.min(100, Math.max(0, ((totalDuration - timeLeft) / totalDuration) * 100));

  return (
    <TimerContext.Provider
      value={{
        mode,
        setMode: handleModeChange,
        timeLeft,
        isActive,
        setIsActive,
        toggleTimer,
        resetTimer,
        selectedSubjectId,
        setSelectedSubjectId,
        sessionCompleted,
        setSessionCompleted,
        minutes,
        seconds,
        formattedTime,
        totalDuration,
        progressPercentage,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
