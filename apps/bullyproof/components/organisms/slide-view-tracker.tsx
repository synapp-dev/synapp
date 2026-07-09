"use client";

import { useEffect, useRef, useCallback } from "react";
import { certificationApi } from "@/entities/certification/api/endpoints";

/**
 * SlideViewTracker component for tracking active viewing time on slides.
 * 
 * Features:
 * - Starts a viewing session when slide is viewed
 * - Sends heartbeat every 30 seconds to track activity
 * - Pauses on visibility change (tab hidden) or blur
 * - Resumes on visibility change (tab visible) or focus
 * - Ends session when navigating away
 * - Handles browser close/reload gracefully
 */
export class SlideViewTracker {
  private sessionId: string | null = null;
  private slideId: string;
  private topicId: string;
  private courseId: string;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private isPaused: boolean = false;
  private visibilityHandler: () => void;
  private focusHandler: () => void;
  private blurHandler: () => void;
  private beforeUnloadHandler: () => void;
  private enabled: boolean;

  constructor(
    slideId: string,
    topicId: string,
    courseId: string,
    enabled: boolean = true
  ) {
    this.slideId = slideId;
    this.topicId = topicId;
    this.courseId = courseId;
    this.enabled = enabled;

    // Bind handlers
    this.visibilityHandler = this.handleVisibilityChange.bind(this);
    this.focusHandler = this.handleFocus.bind(this);
    this.blurHandler = this.handleBlur.bind(this);
    this.beforeUnloadHandler = this.handleBeforeUnload.bind(this);
  }

  async start(): Promise<void> {
    if (!this.enabled) return;

    try {
      const result = await certificationApi.slideSessions.start({
        slideId: this.slideId,
        topicId: this.topicId,
        courseId: this.courseId,
      });

      if (result.data) {
        this.sessionId = result.data.id;
        this.lastActivityTime = Date.now();
        this.isPaused = false;

        // Set up event listeners
        document.addEventListener("visibilitychange", this.visibilityHandler);
        window.addEventListener("focus", this.focusHandler);
        window.addEventListener("blur", this.blurHandler);
        window.addEventListener("beforeunload", this.beforeUnloadHandler);

        // Start heartbeat
        this.startHeartbeat();
      }
    } catch (error) {
      console.error("Failed to start slide viewing session:", error);
    }
  }

  private startHeartbeat(): void {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 seconds
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.sessionId || this.isPaused || !this.enabled) return;

    try {
      await certificationApi.slideSessions.heartbeat({
        sessionId: this.sessionId,
        slideId: this.slideId,
      });
      this.lastActivityTime = Date.now();
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  }

  private handleVisibilityChange(): void {
    if (!this.enabled || !this.sessionId) return;

    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  private handleFocus(): void {
    if (!this.enabled || !this.sessionId) return;
    this.resume();
  }

  private handleBlur(): void {
    if (!this.enabled || !this.sessionId) return;
    // Don't pause on blur - only on visibility change
    // This allows users to switch between tabs/apps without pausing
  }

  private async pause(): Promise<void> {
    if (!this.sessionId || this.isPaused) return;

    this.isPaused = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    try {
      await certificationApi.slideSessions.pause({
        sessionId: this.sessionId,
        slideId: this.slideId,
      });
    } catch (error) {
      console.error("Failed to pause session:", error);
    }
  }

  private async resume(): Promise<void> {
    if (!this.sessionId || !this.isPaused) return;

    this.isPaused = false;
    this.lastActivityTime = Date.now();

    try {
      await certificationApi.slideSessions.resume({
        sessionId: this.sessionId,
        slideId: this.slideId,
      });

      // Restart heartbeat
      this.startHeartbeat();
    } catch (error) {
      console.error("Failed to resume session:", error);
    }
  }

  private async handleBeforeUnload(): Promise<void> {
    // End session when page is unloaded
    await this.end();
  }

  async end(): Promise<void> {
    if (!this.sessionId || !this.enabled) return;

    // Clear interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Remove event listeners
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    window.removeEventListener("focus", this.focusHandler);
    window.removeEventListener("blur", this.blurHandler);
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);

    try {
      await certificationApi.slideSessions.end({
        sessionId: this.sessionId,
        slideId: this.slideId,
      });
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      this.sessionId = null;
    }
  }

  // Public method to manually record activity (e.g., on user interaction)
  recordActivity(): void {
    if (!this.enabled || !this.sessionId || this.isPaused) return;
    this.lastActivityTime = Date.now();
    // Optionally send immediate heartbeat on significant activity
    this.sendHeartbeat();
  }
}

/**
 * React hook for using SlideViewTracker
 */
export function useSlideViewTracker(
  slideId: string,
  topicId: string,
  courseId: string,
  enabled: boolean = true
) {
  const trackerRef = useRef<SlideViewTracker | null>(null);

  useEffect(() => {
    if (!enabled || !slideId || !topicId || !courseId) return;

    // Create tracker
    trackerRef.current = new SlideViewTracker(
      slideId,
      topicId,
      courseId,
      enabled
    );

    // Start tracking
    trackerRef.current.start();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (trackerRef.current) {
        trackerRef.current.end();
        trackerRef.current = null;
      }
    };
  }, [slideId, topicId, courseId, enabled]);

  const recordActivity = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.recordActivity();
    }
  }, []);

  return { recordActivity };
}
