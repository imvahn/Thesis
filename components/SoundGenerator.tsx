"use client";

import { useRef, useEffect, useMemo, useState } from "react";
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
  gain: number;
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
  gain,
}: SoundGeneratorProps) {
  const { baseEquation, stretch, transformX, transformY } = params;

  const synthRef = useRef<Tone.FMSynth | null>(null);
  const membraneRef = useRef<Tone.MembraneSynth | null>(null);
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const ringRef = useRef<Tone.FrequencyShifter | null>(null);
  const envelopeRef = useRef<Tone.AmplitudeEnvelope | null>(null);
  const gainRef = useRef<Tone.Gain | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const LFORef = useRef<Tone.LFO | null>(null);
  const WaveShaperRef = useRef<Tone.WaveShaper | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  const [samplerLoaded, setSamplerLoaded] = useState<boolean>(false);

  // Chromatic key map
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

  // Chromatic bass key map
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

  // Utility functions
  const yToFrequency = (y: number): number => {
    const noteNumber = y + 60;
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
  };

  const computeFrequency = (func: (t: number) => number) => {
    return (x: number): number => {
      if (xStart === null || xEnd === null) return 440;
      const t = ((x + 1) / 2) * (xEnd - xStart) + xStart;
      let yVal = func(t);
      console.log(t,yVal);
      if (yVal < -12) return 0;
      if (yVal > 12) return 0;
      if (!isFinite(yVal)) return 440;
      return yToFrequency(yVal);
    };
  };

  const computeFrequencyExp = (func: (t: number) => number) => {
    return (x: number): number => {
      if (xStart === null || xEnd === null) return 440;
      const t = ((x + 1) / 2) * (16 - xStart) + xStart;
      let yVal = func(t);
      // console.log(t,yVal);
      if (t > xEnd) return 0;
      if (yVal < -12) return 0;
      if (yVal > 12) return 0;
      if (!isFinite(yVal)) return 440;
      return yToFrequency(yVal);
    };
  };

  const computeCutoff = (
    func: (t: number) => number
  ): ((x: number) => number) => {
    return (x: number) => {
      x = Math.max(-1, Math.min(1, x));
      if (xStart === null || xEnd === null) return 4000;
      const t = ((x + 1) / 2) * (xEnd - xStart) + xStart;
      const yVal = func(t);
      const yValStart = func(xStart);
      const yValEnd = func(xEnd);
      if (!isFinite(yVal) || !isFinite(yValStart) || !isFinite(yValEnd)) {
        console.warn(
          "Invalid computation in computeCutoff; using default cutoff."
        );
        return 4000;
      }
      const minY = Math.min(yValStart, yValEnd);
      const maxY = Math.max(yValStart, yValEnd);
      if (minY === maxY) return 4000;
      let cutoff: number;
      if (baseEquation === "x^{2}") {
        cutoff = ((yVal - minY) / (maxY - minY)) * (1000 - 500) + 200;
        cutoff = Math.max(500, Math.min(1000, cutoff));
      } else {
        cutoff = ((yVal - minY) / (maxY - minY)) * (4000 - 200) + 200;
        cutoff = Math.max(200, Math.min(4000, cutoff));
      }
      return cutoff;
    };
  };

  const yToRingFrequency = (y: number, yMin: number, yMax: number): number => {
    const minFreq = 1;
    const maxFreq = 2000;
    // Normalize y from the range [-12, 12] to [0, 1]
    const normalized = (y - yMin) / (yMax - yMin);
    // Exponentially interpolate between minFreq and maxFreq
    return minFreq * Math.pow(maxFreq / minFreq, normalized);
  };

  const computeRing = (func: (t: number) => number) => {
    return (x: number): number => {
      if (xStart === null || xEnd === null) return 0;
      // Map x from [-1, 1] to [xStart, xEnd]
      const t = ((x + 1) / 2) * (xEnd - xStart) + xStart;
      const yVal = func(t);
      // Compute the endpoints
      const yValStart = func(xStart);
      const yValEnd = func(xEnd);
      const yMin = Math.min(yValStart, yValEnd);
      const yMax = Math.max(yValStart, yValEnd);
      if (!isFinite(yVal) || !isFinite(yMin) || !isFinite(yMax)) return 0;
      return yToRingFrequency(yVal, yMin, yMax);
    };
  };

  const computeRingExp = (func: (t: number) => number) => {
    return (x: number): number => {
      if (xStart === null || xEnd === null) return 0;
      const t = ((x + 1) / 2) * (16 - xStart) + xStart;
      const yVal = func(t);
      if (t > xEnd) return 0;
      const yValStart = func(xStart);
      const yValEnd = func(xEnd);
      const yMin = Math.min(yValStart, yValEnd);
      const yMax = Math.max(yValStart, yValEnd);
      if (!isFinite(yVal) || !isFinite(yMin) || !isFinite(yMax)) return 0;
      return yToRingFrequency(yVal, yMin, yMax);
    };
  };

  const calculateTransportTime = (equation: string): number => {
    switch (equation) {
      case "x^{2}":
        return ((transformX + 16) * 60) / bpm;
      case "x^{3}":
        return ((transformX + 16) * 60) / bpm;
      case "\\left|x\\right|":
        return ((transformX + 16) * 60) / bpm;
      case "\\sqrt[3]{x}":
        // return (Math.abs(transformX) % (1 / stretch)) * (60 / bpm); // offset looping rhythm depending on place in measure
        return 0;
      case "\\sqrt[2]{x}":
        return ((transformX + 16) * 60) / bpm;
      case "\\ln{x}":
        return ((transformX + 16) * 60) / bpm;
      case "e^{x}":
        return 0;
      case "2^{x}":
        return 0;
      case "\\frac{1}{x}":
        return 0;
      default:
        return 0;
    }
  };

  const calculateDuration = (equation: string): number => {
    switch (equation) {
      case "x^{2}":
        return (1 / Math.abs(stretch)) * (60 / bpm);
      case "x^{3}":
        return (1 / Math.abs(stretch)) * (60 / bpm);
      case "\\left|x\\right|":
        return (1 / Math.abs(stretch)) * (60 / bpm);
      case "\\sqrt[3]{x}":
        return (32 * 60) / bpm;
      case "\\sqrt[2]{x}":
        return ((16 - transformX) * 60) / bpm;
      case "\\ln{x}":
        return ((16 - transformX) * 60) / bpm;
      case "e^{x}":
        return ((xEnd! - xStart!) * 60) / bpm;
      case "2^{x}":
        return ((xEnd! - xStart!) * 60) / bpm;
      case "\\frac{1}{x}":
        return ((xEnd! - xStart!) * 60) / bpm;
      default:
        return 0;
    }
  };

  const calculateLFOFrequency = (equation: string): number => {
    switch (equation) {
      case "x^{2}":
        return (60 / bpm) * Math.abs(stretch);
      case "x^{3}":
        return (60 / bpm) * Math.abs(stretch);
      case "\\left|x\\right|":
        return (60 / bpm) * Math.abs(stretch);
      case "\\sqrt[3]{x}":
        return bpm / (60 * 32);
      case "\\sqrt[2]{x}":
        return (bpm / 60) * (1 / (16 - transformX));
      case "\\ln{x}":
        return (bpm / 60) * (1 / (16 - transformX));
      case "e^{x}":
        return bpm / (60 * 32);
      case "2^{x}":
        return (bpm / 60) * (1 / (xEnd! - xStart!));
      case "\\frac{1}{x}":
        return bpm / (60 * 32);
      default:
        return 0;
    }
  };

  // Compute memoized functions and values for LFO and function calculations
  const memoizedFunctions = useMemo(() => {
    let computedPhase = 0;
    let computedBaseFunc = (t: number) => t;
    let computedCutoffFunction: ((x: number) => number) | null = null;
    let computedFrequencyFunction: ((x: number) => number) | null = null;
    let computedRingFunction: ((x: number) => number) | null = null;

    switch (baseEquation) {
      case "x^{2}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * (t * t) + transformY;
        computedCutoffFunction = computeCutoff(computedBaseFunc);
        break;
      case "x^{3}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * (t * t * t) + transformY;
        computedCutoffFunction = computeCutoff(computedBaseFunc);
        break;
      case "\\left|x\\right|":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * Math.abs(t) + transformY;
        computedCutoffFunction = computeCutoff(computedBaseFunc);
        break;
      case "\\sqrt[3]{x}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * Math.cbrt(t);
        computedCutoffFunction = computeCutoff(computedBaseFunc);
        break;
      case "\\sqrt[2]{x}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => {
          const sqrtVal = t < 0 ? 0 : Math.sqrt(t);
          return stretch * sqrtVal + transformY;
        };
        computedCutoffFunction = computeCutoff(computedBaseFunc);
        break;
      case "\\ln{x}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => {
          if (t <= 0) return stretch * Number.EPSILON + transformY;
          return stretch * Math.log(t) + transformY;
        };
        computedFrequencyFunction = computeFrequency(computedBaseFunc);
        break;
      case "e^{x}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * Math.exp(t) + transformY;
        computedRingFunction = computeRingExp(computedBaseFunc);
        break;
      case "2^{x}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * Math.pow(2, t) + transformY;
        computedFrequencyFunction = computeFrequency(computedBaseFunc);
        break;
      case "\\frac{1}{x}":
        computedPhase = 180;
        computedBaseFunc = (t: number) => stretch * (1 / t);
        computedFrequencyFunction = computeFrequency(computedBaseFunc);
        break;
      default:
        computedPhase = 0;
        computedBaseFunc = (t: number) => t;
        computedFrequencyFunction = computeFrequency(computedBaseFunc);
        break;
    }

    return {
      computedPhase,
      computedBaseFunc,
      computedCutoffFunction,
      computedFrequencyFunction,
      computedRingFunction,
    };
  }, [baseEquation, stretch, transformY, xStart, xEnd, bpm]);

  // setupLFO helper function
  function setupLFO(
    computeValue: (x: number) => number,
    phase: number,
    outputParam: Tone.Signal<any>,
    frequency: number
  ) {
    // console.log("setting up lfo");
    const transportTime = calculateTransportTime(baseEquation);
    const lfo = new Tone.LFO({
      frequency,
      min: -1,
      max: 1,
      type: "sawtooth",
      phase,
    }).start(transportTime);
    const shaper = new Tone.WaveShaper(computeValue, 4096 / 16);
    lfo.connect(shaper);
    shaper.connect(outputParam);
    LFORef.current = lfo;
    WaveShaperRef.current = shaper;
  }

  // Preload the sampler on mount
  useEffect(() => {
    if (!samplerRef.current) {
      if (baseEquation === "x^{2}") {
        samplerRef.current = new Tone.Sampler({
          urls: {
            C3: "kick2.mp3",
          },
          attack: 0.2,
          release: 0.2,
          baseUrl: "/api/samples/",
          onload: () => setSamplerLoaded(true),
        });
      } else if (baseEquation === "x^{3}") {
        samplerRef.current = new Tone.Sampler({
          urls: {
            C3: "Snare.mp3",
          },
          attack: 0.2,
          release: 0.2,
          baseUrl: "/api/samples/",
          onload: () => setSamplerLoaded(true),
        });
      } else if (baseEquation === "e^{x}") {
        samplerRef.current = new Tone.Sampler({
          urls: {
            C3: "LongC.mp3",
          },
          attack: 0.2,
          release: 0.2,
          baseUrl: "/api/samples/",
          onload: () => setSamplerLoaded(true),
        });
      } else {
        samplerRef.current = new Tone.Sampler({
          urls: {
            C3: "LongC.mp3",
          },
          attack: 0.2,
          release: 0.2,
          baseUrl: "/api/samples/",
          onload: () => setSamplerLoaded(true),
        });
      }
    }
    return () => {
      if (samplerRef.current) {
        samplerRef.current.dispose();
        samplerRef.current = null;
      }
    };
  }, [baseEquation]);

  // Initialize synth and control Tone.Transport based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      if (!synthRef.current) {
        synthRef.current = new Tone.FMSynth({
          oscillator: { type: "sawtooth" },
          envelope: {
            attack: 0.1,
            release: 1,
          },
          harmonicity: 5,
          modulation: {
            type: "fatsine",
          },
        });
        Tone.getTransport().bpm.value = bpm;
        Tone.getTransport().start("+0.1");
      }
      if (!membraneRef.current) {
        membraneRef.current = new Tone.MembraneSynth({
        });
      }
    } else {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
      if (membraneRef.current) {
        membraneRef.current.dispose();
        membraneRef.current = null;
      }
      Tone.getTransport().stop();
      Tone.getTransport().cancel(0);
      if (samplerRef.current) {
        samplerRef.current.releaseAll();
      }
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
    };
  }, [isPlaying, bpm]);

  // Setup filter, LFO, etc.
  useEffect(() => {
    // console.log(synthRef.current,samplerLoaded,samplerRef.current,xStart,xEnd)
    if (
      synthRef.current &&
      samplerLoaded &&
      samplerRef.current &&
      membraneRef.current &&
      xStart !== null &&
      xEnd !== null
    ) {
      filterRef.current = new Tone.Filter({
        type: "lowpass",
        frequency: 1000,
        rolloff: -24,
        Q: 3,
      });
      reverbRef.current = new Tone.Reverb();
      gainRef.current = new Tone.Gain(gain).toDestination();
      if (baseEquation === "e^{x}") {
        ringRef.current = new Tone.FrequencyShifter({
          frequency: 1,
        });
        samplerRef.current.chain(
          ringRef.current,
          reverbRef.current,
          gainRef.current
        );
        // ringRef.current.connect(reverbRef.current);
        // } else if (baseEquation === "\\sqrt[3]{x}") {
        //   samplerRef.current.chain(
        //     filterRef.current,
        //     gainRef.current
        //   );
      } else if (baseEquation === "x^{2}") {
        membraneRef.current.chain(
          filterRef.current,
          reverbRef.current,
          gainRef.current
        );
      } else {
        samplerRef.current.chain(
          filterRef.current,
          reverbRef.current,
          gainRef.current
        );
        synthRef.current.chain(
          filterRef.current,
          reverbRef.current,
          gainRef.current
        );
        // filterRef.current.connect(reverbRef.current);
      }
      // reverbRef.current.connect(gainRef.current);
      // reverbRef.current.toDestination();
      // Setup LFO based on computed memoized functions
      if (memoizedFunctions.computedCutoffFunction && filterRef.current) {
        setupLFO(
          memoizedFunctions.computedCutoffFunction,
          memoizedFunctions.computedPhase,
          filterRef.current.frequency,
          calculateLFOFrequency(baseEquation)
        );
      } else if (
        memoizedFunctions.computedFrequencyFunction &&
        synthRef.current
      ) {
        setupLFO(
          memoizedFunctions.computedFrequencyFunction,
          memoizedFunctions.computedPhase,
          synthRef.current.frequency,
          calculateLFOFrequency(baseEquation)
        );
      } else if (memoizedFunctions.computedRingFunction && ringRef.current) {
        setupLFO(
          memoizedFunctions.computedRingFunction,
          memoizedFunctions.computedPhase,
          ringRef.current.frequency,
          calculateLFOFrequency(baseEquation)
        );
      }
    }
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
      if (ringRef.current) {
        ringRef.current.dispose();
        ringRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.dispose();
        gainRef.current = null;
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
        reverbRef.current = null;
      }
    };
  }, [
    synthRef.current,
    samplerLoaded,
    xStart,
    xEnd,
    baseEquation,
    transformX,
    bpm,
    stretch,
    memoizedFunctions,
  ]);

  // Respond to changes in gain by updating Tone.Gain
  useEffect(() => {
    if (gainRef.current) {
      // gainRef.current.gain.value = gain;
      gainRef.current.gain.rampTo(gain, 0.1); // smooth transitions over 0.1s
    }
  }, [gain]);

  // Trigger the note
  useEffect(() => {
    if (
      isPlaying &&
      samplerLoaded &&
      cpyValue !== null &&
      xStart !== null &&
      xEnd !== null
    ) {
      const transportTime = calculateTransportTime(baseEquation);
      const duration = calculateDuration(baseEquation);

      const yNum = parseFloat(cpyValue);
      if (!isNaN(yNum)) {
        let note: string;
        const yKey = Math.round(yNum).toString();
        note = keyMap[yKey];
        if (note) {
          const loop = new Tone.Loop((time) => {
            switch (baseEquation) {
              case "\\sqrt[3]{x}":
                // let currentStep = 0;
                // const STEPS = 32 * stretch;
                // const interval = (1 / Math.abs(stretch)) * (60 / bpm);
                // const id = Tone.getTransport().scheduleRepeat(
                //   (time) => {
                //     samplerRef.current?.triggerAttackRelease(
                //       note,
                //       interval,
                //       time
                //     );
                //     currentStep++;
                //     if (currentStep >= STEPS) Tone.getTransport().clear(id);
                //   },
                //   interval,
                //   undefined,
                //   duration
                // );
                // samplerRef.current?.triggerAttackRelease(note, duration, time);
                synthRef.current?.triggerAttackRelease(note, duration, time);
                break;
              case "x^{3}":
              case "e^{x}":
                samplerRef.current?.triggerAttackRelease(note, duration, time);
                break;
              case "x^{2}":
                membraneRef.current?.triggerAttackRelease(note, duration, time);
              default:
                synthRef.current?.triggerAttackRelease(note, duration, time);
                break;
            }
          }, "8m").start(transportTime);
          loopRef.current = loop;
        }
      }
      return () => {
        if (loopRef.current) {
          loopRef.current.stop();
          loopRef.current.dispose();
          loopRef.current = null;
        }
      };
    }
  }, [
    cpyValue,
    samplerLoaded,
    isPlaying,
    xStart,
    xEnd,
    bpm,
    transformX,
    baseEquation,
    stretch,
  ]);

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
