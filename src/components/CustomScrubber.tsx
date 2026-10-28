import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatTimecode } from '../engine/timelineEngine';

interface CustomScrubberProps {
  value: number;
  min?: number;
  max: number;
  fps?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
  className?: string;
}

export const CustomScrubber: React.FC<CustomScrubberProps> = ({
  value,
  min = 0,
  max,
  fps = 30,
  onChange,
  ariaLabel = 'Video scrubber',
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; time: number } | null>(null);

  const safeMax = Math.max(min + 0.001, max);
  const clampedValue = Math.max(min, Math.min(safeMax, value));
  const progressPercent = ((clampedValue - min) / (safeMax - min)) * 100;

  const calculateTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return min;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return min + ratio * (safeMax - min);
    },
    [min, safeMax]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    trackRef.current?.focus();
    setIsDragging(true);
    const newTime = calculateTimeFromClientX(e.clientX);
    onChange(newTime);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newTime = calculateTimeFromClientX(e.clientX);
      onChange(newTime);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, calculateTimeFromClientX, onChange]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const time = min + (x / rect.width) * (safeMax - min);
    setHoverInfo({ x, time });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const frameStep = 1 / Math.max(1, fps);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, clampedValue - (e.shiftKey ? 1 : frameStep)));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(safeMax, clampedValue + (e.shiftKey ? 1 : frameStep)));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(safeMax);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      onChange(Math.min(safeMax, clampedValue + 5));
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      onChange(Math.max(min, clampedValue - 5));
    }
  };

  return (
    <div
      ref={trackRef}
      className={`custom-scrubber ${isDragging ? 'is-dragging' : ''} ${className}`}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={safeMax}
      aria-valuenow={clampedValue}
      aria-valuetext={formatTimecode(clampedValue, fps)}
      onPointerDown={handlePointerDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <div className="custom-scrubber-track">
        {/* Fill bar showing current played progress */}
        <div
          className="custom-scrubber-fill"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Hover preview line */}
        {hoverInfo && (
          <div
            className="custom-scrubber-hover-line"
            style={{ left: `${hoverInfo.x}px` }}
          />
        )}

        {/* Playhead thumb */}
        <div
          className="custom-scrubber-thumb"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Floating hover timecode tooltip */}
      {hoverInfo && (
        <div
          className="custom-scrubber-tooltip"
          style={{ left: `${hoverInfo.x}px` }}
        >
          {formatTimecode(hoverInfo.time, fps)}
        </div>
      )}
    </div>
  );
};
