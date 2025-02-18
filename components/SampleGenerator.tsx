"use client";

import { useRef, useEffect, useState } from "react";
import * as Tone from "tone";

interface SoundGeneratorProps {
  equation: string;
  params: {
    baseEquation: string;
    stretch: number;
    transformX: number;
    transformY: number;
  };
  graphId: string;
  isPlaying: boolean;
  bpm: number;
  xStart: number | null;
  xEnd: number | null;
  cpxValue: string | null;
  cpyValue: string | null;
}

export default function SoundGenerator({
  equation,
  params,
  graphId,
  isPlaying,
  bpm,
  xStart,
  xEnd,
  cpxValue,
  cpyValue,
}: SoundGeneratorProps) {
  const { baseEquation, stretch, transformX, transformY } = params;

  const synthRef = useRef<Tone.FMSynth | null>(null);
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const gainRef = useRef<Tone.Gain | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const LFORef = useRef<Tone.LFO | null>(null);
  const WaveShaperRef = useRef<Tone.WaveShaper | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  const [samplerLoaded, setSamplerLoaded] = useState<boolean>(false);

  // Chromatic
  const keyMap: { [key: string]: string } = {
    "-12": "C2",
    "-11": "C#2",
    "-10": "D2",
    "-9": "D#2",
    "-8": "E2",
    "-7": "F2",
    "-6": "F#2",
    "-5": "G2",
    "-4": "G#2",
    "-3": "A2",
    "-2": "A#2",
    "-1": "B2",
    "0": "C3",
    "1": "C#3",
    "2": "D3",
    "3": "D#3",
    "4": "E3",
    "5": "F3",
    "6": "F#3",
    "7": "G3",
    "8": "G#3",
    "9": "A3",
    "10": "A#3",
    "11": "B3",
    "12": "C4",
  };

  // Chromatic bass
  const bassKeyMap: { [key: string]: string } = {
    "-12": "C1",
    "-11": "C#1",
    "-10": "D1",
    "-9": "D#1",
    "-8": "E1",
    "-7": "F1",
    "-6": "F#1",
    "-5": "G1",
    "-4": "G#1",
    "-3": "A1",
    "-2": "A#1",
    "-1": "B1",
    "0": "C2",
    "1": "C#2",
    "2": "D2",
    "3": "D#2",
    "4": "E2",
    "5": "F2",
    "6": "F#2",
    "7": "G2",
    "8": "G#2",
    "9": "A2",
    "10": "A#2",
    "11": "B2",
    "12": "C3",
  };

  // C Aeolian
  // const keyMap: { [key: string]: string } = {
  //   "-12": "C2",
  //   "-11": "D2",
  //   "-10": "Eb2",
  //   "-9": "F2",
  //   "-8": "G2",
  //   "-7": "Ab2",
  //   "-6": "Bb2",
  //   "-5": "C3",
  //   "-4": "D3",
  //   "-3": "Eb3",
  //   "-2": "F3",
  //   "-1": "G3",
  //   "0": "Ab3",
  //   "1": "Bb3",
  //   "2": "C4",
  //   "3": "D4",
  //   "4": "Eb4",
  //   "5": "F4",
  //   "6": "G4",
  //   "7": "Ab4",
  //   "8": "Bb4",
  //   "9": "C5",
  //   "10": "D5",
  //   "11": "Eb5",
  //   "12": "F5",
  // };

  const RepeatedSound = (note: string) => {
    // console.log(samplerLoaded,"samplerloaded");
    if (samplerLoaded && stretch !== null) {
      let currentStep = 0;
      var STEPS: number;

      var duration: number;
      var interval: number;

      duration = (32 * 60) / bpm;
      interval = (1 / Math.abs(stretch)) * (60 / bpm);
      // console.log(start);

      STEPS = 32 * stretch;
      const id = Tone.getTransport().scheduleRepeat(
        (time) => {
          samplerRef.current?.triggerAttackRelease(note, interval, time);
          currentStep++;
          if (currentStep >= STEPS) Tone.getTransport().clear(id);
        },
        interval,
        undefined,
        duration
      );
      return () => {
        Tone.getTransport().clear(id);
      };
    }
  };

  // Preload the sampler on mount
  useEffect(() => {
    if (!samplerRef.current) {
      samplerRef.current = new Tone.Sampler({
        urls: {
          A1: "A1new.mp3",
        },
        baseUrl: "/api/samples/",
        onload: () => {
          setSamplerLoaded(true);
          // If isPlaying is already true, playback will start in the playback effect.
        },
      });
    }
    return () => {
      if (samplerRef.current) {
        samplerRef.current.dispose();
        samplerRef.current = null;
      }
    };
  }, []);

  // Initialize synth and control Tone.Transport based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      if (!synthRef.current) {
        synthRef.current = new Tone.FMSynth({
          oscillator: {
            type: "sine",
          },
        });
        Tone.getTransport().bpm.value = bpm;
        // Tone.getTransport().swing = .5;
        Tone.getTransport().start("+0.1");
      }
    } else {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
      Tone.getTransport().stop();
      Tone.getTransport().cancel(0);
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
    };
  }, [isPlaying, bpm]);

  // Setup filter, LFO, etc
  useEffect(() => {
    // console.log("useeffect2",isPlaying);
    if (
      synthRef.current &&
      samplerLoaded &&
      samplerRef.current &&
      xStart !== null &&
      xEnd !== null
    ) {
      // Create / connect Filter
      filterRef.current = new Tone.Filter({
        type: "lowpass",
        frequency: 5000,
        rolloff: -24,
        Q: 12,
      });

      reverbRef.current = new Tone.Reverb();
      // filterRef.current.connect(gain);

      // Route the synth to the filter
      synthRef.current.connect(filterRef.current);
      filterRef.current.connect(reverbRef.current);
      reverbRef.current.toDestination();
      // filterRef.current.toDestination();
      // samplerRef.current.connect(filterRef.current);
      samplerRef.current.toDestination();

      // Helper function that sets up LFO -> waveshaper -> param
      function setupLFO(
        computeValue: (x: number) => number,
        phase: number,
        outputParam: Tone.Signal<any>,
        frequency: number
      ) {
        var transportTime: number;
        if (
          ["e^{x}", "2^{x}", "\\frac{1}{x}", "\\sqrt[3]{x}"].includes(
            baseEquation
          )
        ) {
          transportTime = 0;
        } else {
          transportTime = ((params.transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
        }
        const lfo = new Tone.LFO({
          frequency,
          min: -1,
          max: 1,
          type: "sawtooth",
          phase,
        }).start(transportTime);
        const shaper = new Tone.WaveShaper(computeValue, 4096/16);

        lfo.connect(shaper);
        shaper.connect(outputParam);

        LFORef.current = lfo;
        WaveShaperRef.current = shaper;
      }

      const yToFrequency = (y: number): number => {
        // MIDI note base: (A4 is noteNumber 69, freq 440)
        const noteNumber = y + 60;
        return 440 * Math.pow(2, (noteNumber - 69) / 12);
      };

      const computeFrequency = (func: (t: number) => number) => {
        return (x: number): number => {
          x = Math.max(-1, Math.min(1, x));
          if (xStart == null || xEnd == null) return 440; // fallback
          const t = ((x + 1) / 2) * (xEnd - xStart) + xStart;

          let yVal = func(t);

          if (yVal < -12) return -12;
          if (yVal > 12) return 12;
          // console.log("yVal",yVal, "t",t, "frequency",yToFrequency(yVal));
          if (!isFinite(yVal)) return 440; // fallback
          return yToFrequency(yVal);
        };
      };

      const computeFrequencyExp = (func: (t: number) => number) => {
        return (x: number): number => {
          if (xStart == null || xEnd == null) return 440; // fallback
          // Map x from [-1, 1] to t from xStart to 16
          const t = ((x + 1) / 2) * (16 - xStart) + xStart;
          // console.log(xStart,xEnd);
          // For t beyond xEnd, return -1
          if (t > xEnd) return -1;
          let yVal = func(t);
          // console.log(t,yVal);
          if (yVal < -12) return -12;
          if (yVal > 12) return 12;
          if (!isFinite(yVal)) return 440; // fallback
          return yToFrequency(yVal);
        };
      };

      const computeCutoff = (
        func: (t: number) => number
      ): ((x: number) => number) => {
        return (x: number) => {
          x = Math.max(-1, Math.min(1, x)); // Clamp x
          if (xStart === null || xEnd === null) return 20000;
          const t = ((x + 1) / 2) * (xEnd - xStart) + xStart;

          const yVal = func(t);
          // Evaluate function at boundaries so we know min & max
          const yValStart = func(xStart);
          const yValEnd = func(xEnd);

          if (!isFinite(yVal) || !isFinite(yValStart) || !isFinite(yValEnd)) {
            console.warn(
              "Invalid computation in computeCutoff; using default cutoff."
            );
            return 10000; // fallback
          }

          // Find true min/max to handle negatives, reversed, etc.
          const minY = Math.min(yValStart, yValEnd);
          const maxY = Math.max(yValStart, yValEnd);

          // If they're equal (e.g. function is constant), fallback
          if (minY === maxY) return 10000;

          // Scale [minY, maxY] => [200, 4000]
          let cutoff = ((yVal - minY) / (maxY - minY)) * (4000 - 200) + 200;

          cutoff = Math.max(200, Math.min(4000, cutoff));
          return cutoff;
        };
      };

      let baseFunc: (t: number) => number;
      let cutoffFunction: (x: number) => number;
      let frequencyFunction: (x: number) => number;
      let phase: number;

      switch (baseEquation) {
        case "x^{2}":
          phase = 180;
          baseFunc = (t) => stretch * (t * t) + transformY;
          cutoffFunction = computeCutoff(baseFunc);
          setupLFO(
            cutoffFunction,
            phase,
            filterRef.current.frequency,
            (60 / bpm) * Math.abs(stretch)
          );
          break;

        case "x^{3}":
          phase = 180;
          baseFunc = (t) => stretch * (t * t * t) + transformY;
          cutoffFunction = computeCutoff(baseFunc);
          setupLFO(
            cutoffFunction,
            phase,
            filterRef.current.frequency,
            (60 / bpm) * Math.abs(stretch)
          );
          break;

        case "\\left|x\\right|":
          phase = 180;
          baseFunc = (t) => stretch * Math.abs(t) + transformY;
          cutoffFunction = computeCutoff(baseFunc);
          setupLFO(
            cutoffFunction,
            phase,
            filterRef.current.frequency,
            (60 / bpm) * Math.abs(stretch)
          );
          break;

        case "\\sqrt[3]{x}":
          phase = 180;
          baseFunc = (t) => stretch * Math.cbrt(t);
          cutoffFunction = computeCutoff((t) => baseFunc(t));
          setupLFO(
            cutoffFunction,
            phase,
            filterRef.current.frequency,
            bpm / (60 * 32)
          );
          break;

        case "\\sqrt[2]{x}":
          phase = 180;
          baseFunc = (t) => {
            const sqrtVal = t < 0 ? 0 : Math.sqrt(t);
            return stretch * sqrtVal + transformY;
          };
          cutoffFunction = computeCutoff((t) => baseFunc(t));
          setupLFO(
            cutoffFunction,
            phase,
            filterRef.current.frequency,
            (bpm / 60) * (1 / (16 - transformX))
          );
          break;

        case "\\ln{x}":
          phase = 180;
          baseFunc = (t) => {
            // avoid ln(<= 0)
            if (t <= 0) return stretch * Number.EPSILON + transformY;
            return stretch * Math.log(t) + transformY;
          };
          frequencyFunction = computeFrequency((t) => baseFunc(t));
          setupLFO(
            frequencyFunction,
            phase,
            synthRef.current.frequency,
            (bpm / 60) * (1 / (16 - transformX))
          );
          break;

        case "e^{x}":
          phase = 180;
          baseFunc = (t) => stretch * Math.exp(t) + transformY;
          frequencyFunction = computeFrequencyExp((t) => baseFunc(t));
          setupLFO(
            frequencyFunction,
            phase,
            synthRef.current.frequency,
            bpm / (60 * 32)
          );
          break;

        case "2^{x}":
          phase = 180;
          baseFunc = (t) => stretch * Math.pow(2, t) + transformY;
          frequencyFunction = computeFrequency((t) => baseFunc(t));
          setupLFO(
            frequencyFunction,
            phase,
            synthRef.current.frequency,
            (bpm / 60) * (1 / (xEnd - xStart))
          );
          break;

        case "\\frac{1}{x}":
          phase = 180;
          baseFunc = (t) => {
            return stretch * (1 / t);
          };
          frequencyFunction = computeFrequency((t) => baseFunc(t));
          setupLFO(
            frequencyFunction,
            phase,
            synthRef.current.frequency,
            bpm / (60 * 32)
          );
          break;

        default:
          phase = 0;
          baseFunc = (t) => t;
          frequencyFunction = computeFrequency(
            (t) => baseFunc(t - transformX) + transformY
          );
          setupLFO(frequencyFunction, phase, synthRef.current.frequency, 0);
          break;
      }
    }

    // Cleanup
    return () => {
      if (LFORef.current) {
        LFORef.current.dispose();
        LFORef.current = null;
      }
      if (WaveShaperRef.current) {
        WaveShaperRef.current.dispose();
        WaveShaperRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.dispose();
        filterRef.current = null;
      }
    };
  }, [synthRef.current, samplerLoaded, xStart, xEnd, isPlaying]);

  // Trigger the note
  useEffect(() => {
    // console.log(isPlaying,samplerLoaded,cpyValue,xStart,xEnd)
    // console.log("useeffect3",isPlaying);
    if (
      isPlaying &&
      samplerLoaded &&
      cpyValue !== null &&
      xStart !== null &&
      xEnd !== null
    ) {
      var duration: number;
      var transportTime: number;
      if (["x^{2}", "x^{3}", "\\left|x\\right|"].includes(baseEquation)) {
        duration = (1 / Math.abs(stretch)) * (60 / bpm);
        transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
      } else if (["\\ln{x}", "\\sqrt[2]{x}"].includes(baseEquation)) {
        duration = ((16 - transformX) * 60) / bpm; // one to one functions last the entire time they're visible. (32*60)/bpm seconds in 8 measures
        transportTime = ((transformX + 16) * 60) / bpm; // 60/bpm * 32 is 8 measures of 4 beats per measure
      } else if (["e^{x}", "2^{x}", "\\frac{1}{x}"].includes(baseEquation)) {
        duration = ((xEnd - xStart) * 60) / bpm;
        transportTime = 0;
      } else if (["\\sqrt[3]{x}"].includes(baseEquation)) {
        duration = ((xEnd - xStart) * 60) / bpm;
        transportTime = (Math.abs(transformX) % (1 / stretch)) * (60 / bpm);
      } else {
        duration = 0;
        transportTime = 0;
      }
      console.log(duration);
      const yNum = parseFloat(cpyValue);
      // console.log("sound transporttime", transportTime);
      // console.log("sound duration", duration);
      // console.log("sound", xStart, xEnd);
      // console.log(yNum);
      if (!isNaN(yNum)) {
        let note: string;
        const yKey = Math.round(yNum).toString();
        if (baseEquation === "x^{2}") {
          note = bassKeyMap[yKey];
        } else {
          note = keyMap[yKey];
        }
        if (note) {
          // console.log("note", note);
          // console.log('transporttime',transportTime);
          var loop = new Tone.Loop(function (time) {
            // const currentVal = LFORef.current?.get().phase;
            // console.log(`Time: ${time.toFixed(2)}s, LFO Value: ${currentVal}`);
            // samplerRef.current?.triggerAttackRelease(note, duration, time);
            // console.log("test");
            if (baseEquation === "\\sqrt[3]{x}") {
              RepeatedSound(note);
            } else {
              synthRef.current?.triggerAttackRelease(note, duration, time);
            }
          }, "8m").start(transportTime);
          loopRef.current = loop;
        }
      }
      return () => {
        loop.stop();
        loop.dispose();
        loopRef.current = null;
      };
    }
  }, [cpyValue, samplerLoaded, isPlaying, xStart, xEnd, bpm, transformX]);

  return (
    <>
      {!samplerLoaded && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-700 bg-opacity-50">
          <div className="bg-white px-6 py-4 rounded shadow-lg text-black">
            <p>Loading...</p>
          </div>
        </div>
      )}
    </>
  );
}
