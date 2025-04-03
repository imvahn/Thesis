"use client";

import { useState, useRef, useEffect } from "react";
import * as Tone from "tone";

interface AnimationGeneratorProps {
  equation: string;
  params: {
    baseEquation: string;
    stretch: number;
    transformX: number;
    transformY: number;
  };
  graphId: string;
  onPointXChange: (graphId: string, newX: number | null) => void;
  isPlaying: boolean;
  bpm: number;
  xStart: number | null;
  xEnd: number | null;
  cpxValue: string | null;
  cpyValue: string | null;
}

export default function AnimationGenerator({
  equation,
  params,
  graphId,
  onPointXChange,
  isPlaying,
  bpm,
  xStart,
  xEnd,
  cpxValue,
  cpyValue,
}: AnimationGeneratorProps) {
  const loopRef = useRef<Tone.Loop | null>(null);
  const [pointX, setPointX] = useState<number | null>(null);
  const { baseEquation, stretch, transformX, transformY } = params;

  const Animate = () => {
    if (isPlaying && xStart != null && xEnd != null) {
      let duration: number;
      let interval: number;

      if (["x^{2}", "x^{3}", "\\left|x\\right|"].includes(baseEquation)) {
        duration = (1 / Math.abs(stretch)) * (60 / bpm);
      } else if (["\\ln{x}", "\\sqrt[2]{x}"].includes(baseEquation)) {
        duration = ((16 - transformX) * 60) / bpm; // one to one functions last the entire time they're visible.
      } else if (["e^{x}", "2^{x}"].includes(baseEquation)) {
        duration = ((xEnd - xStart) * 60) / bpm;
      } else if (["\\frac{1}{x}", "\\sqrt[3]{x}"].includes(baseEquation)) {
        duration = (32 * 60) / bpm; // (32*60)/bpm seconds in 8 measures
      } else {
        duration = 0;
      }
      console.log(duration);
      // Using the same interval as before
      interval = (12 * 1) / 384;

      // Record the start time of the animation
      const startTime = Tone.now();

      const id = Tone.getTransport().scheduleRepeat((time) => {
        const elapsed = time - startTime;
        const fraction = elapsed / duration;
        const t = xStart + fraction * (xEnd - xStart);

        // Schedule the visual update to ensure synchronization with the audio clock
        Tone.getDraw().schedule(() => {
          setPointX(t);
          onPointXChange(graphId, t);
        }, time);

        if (elapsed >= duration) {
          Tone.getDraw().schedule(() => {
            onPointXChange(graphId, null);
          }, time);
          Tone.getTransport().clear(id);
        }
      }, interval, undefined, duration);

      return () => {
        Tone.getTransport().clear(id);
        setPointX(null);
        onPointXChange(graphId, null);
      };
    } else {
      // If not playing or no domain is provided, reset the value.
      setPointX(null);
      onPointXChange(graphId, null);
    }
  };

  useEffect(() => {
    if (isPlaying && cpyValue !== null && xStart !== null) {
      let transportTime: number;
      if (
        ["e^{x}", "2^{x}", "\\frac{1}{x}", "\\sqrt[3]{x}"].includes(baseEquation)
      ) {
        transportTime = 0;
      } else {
        transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
      }
      console.log("t",transportTime);
      // Start the loop with the calculated transport time.
      const loop = new Tone.Loop((time) => {
        Animate();
      }, "8m").start(transportTime);
      loopRef.current = loop;
      return () => {
        loop.stop();
        loop.dispose();
        loopRef.current = null;
      };
    }
  }, [cpyValue]);

  return null;
}
