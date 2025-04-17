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

      switch (baseEquation) {
        case "x^{2}":
          duration = (1 / Math.abs(stretch)) * (60 / bpm);
        case "x^{3}":
          duration = (1 / Math.abs(stretch)) * (60 / bpm);
        case "\\left|x\\right|":
          duration = (1 / Math.abs(stretch)) * (60 / bpm);
        case "\\sqrt[3]{x}":
          duration = (32 * 60) / bpm; // (32*60)/bpm seconds in 8 measures
        case "\\sqrt[2]{x}":
          duration = ((16 - transformX) * 60) / bpm; // one to one functions last the entire time they're visible.
        case "\\ln{x}":
          duration = ((16 - transformX) * 60) / bpm; // one to one functions last the entire time they're visible.
        case "e^{x}":
          duration = ((xEnd - xStart) * 60) / bpm;
        case "2^{x}":
          duration = ((xEnd - xStart) * 60) / bpm;
        case "\\frac{1}{x}":
          duration = (32 * 60) / bpm; // (32*60)/bpm seconds in 8 measures
        default:
          duration = 0;
      }

      interval = (12 * 1) / 384;
      const startTime = Tone.now();

      const id = Tone.getTransport().scheduleRepeat(
        (time) => {
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
        },
        interval,
        undefined,
        duration
      );

      return () => {
        Tone.getTransport().clear(id);
        setPointX(null);
        onPointXChange(graphId, null);
      };
    } else {
      setPointX(null);
      onPointXChange(graphId, null);
    }
  };

  useEffect(() => {
    if (isPlaying && cpyValue !== null && xStart !== null) {
      let transportTime: number;

      switch (equation) {
        case "x^{2}":
          transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
        case "x^{3}":
          transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
        case "\\left|x\\right|":
          transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
        case "\\sqrt[3]{x}":
          transportTime = 0;
        case "\\sqrt[2]{x}":
          transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
        case "\\ln{x}":
          transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
        case "e^{x}":
          transportTime = 0;
        case "2^{x}":
          transportTime = 0;
        case "\\frac{1}{x}":
          transportTime = 0;
        default:
          transportTime = 0;
      }

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
