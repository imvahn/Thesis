"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import * as Tone from "tone";
import nerdamer from "nerdamer";
import "nerdamer/Calculus";
import "nerdamer/Algebra";
import "nerdamer/Solve";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { Knob } from "primereact/knob";
import EquationList from "@/components/EquationList";
import SoundGenerator from "@/components/SoundGenerator";
import AnimationGenerator from "@/components/AnimationGenerator";
import { EquationEntry } from "@/components/Calculator";

interface Props {
  equations: EquationEntry[];
  setEquations: Dispatch<SetStateAction<EquationEntry[]>>;
  onRemoveEquation: (graphId: string) => void;
  submittedEquations: {
    equation: string;
    params: {
      equationType: string;
      baseEquation: string;
      stretch: number;
      transformX: number;
      transformY: number;
      p?: number;
    };
    graphId: string;
    instrument: string;
    gain: number;
    pointX: number | null;
  }[];
  setSubmittedEquations: React.Dispatch<
    React.SetStateAction<
      {
        equation: string;
        params: {
          equationType: string;
          baseEquation: string;
          stretch: number;
          transformX: number;
          transformY: number;
          p?: number;
        };
        graphId: string;
        instrument: string;
        gain: number;
        pointX: number | null;
      }[]
    >
  >;
  onSelectEquation: (index: number) => void;
  selectedIndex: number | null;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
}

export default function UI({
  equations,
  setEquations,
  onRemoveEquation,
  submittedEquations,
  setSubmittedEquations,
  onSelectEquation,
  selectedIndex,
  isPlaying,
  setIsPlaying,
}: Props) {
  const [bpm, setBPM] = useState(120);

  const handlePlay = async () => {
    if (Tone.getContext().state !== "running") {
      await Tone.start();
    }
    Tone.getContext().lookAhead = 0;
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      handleStop();
    } else {
      await handlePlay();
    }
  };

  const handlePointXChange = useCallback(
    (graphId: string, newX: number | null) => {
      setSubmittedEquations((prev) =>
        prev.map((eq) =>
          eq.graphId === graphId ? { ...eq, pointX: newX } : eq
        )
      );
    },
    [setSubmittedEquations]
  );

  const getCriticalPoints = (
    eq: string,
    baseEquation: string,
    tx: number,
    ty: number
  ) => {
    if (!isPlaying) {
      return { cpx: null, cpy: null };
    } else {
      let cpxValue: string;
      let cpyValue: string;

      // Special cases
      if (
        [
          "\\left|x\\right|",
          "e^{x}",
          "2^{x}",
          "\\sqrt[2]{x}",
          "\\sqrt[3]{x}",
          "\\ln{x}",
          "\\frac{1}{x}",
        ].includes(baseEquation)
      ) {
        // Only look at shift
        cpxValue = tx.toString();
        cpyValue = ty.toString();
      } else {
        const e = nerdamer.convertFromLaTeX(eq);
        const d1 = nerdamer.diff(e, "x").expand();
        cpxValue = d1.solveFor("x").toString();
        cpyValue = e.sub("x", cpxValue.toString()).evaluate().text();
      }
      return { cpx: cpxValue, cpy: cpyValue };
    }
  };

  // On "Play," determine xStart/xEnd for each submitted equation
  const computeDomainBounds = (
    baseEquation: string,
    stretch: number,
    transformX: number,
    transformY: number
  ) => {
    let x1: number | null = null;
    let x2: number | null = null;

    switch (baseEquation) {
      case "x^{2}": {
        const domain = Math.sqrt(Math.abs((12 - transformY) / stretch));
        x1 = -domain;
        x2 = domain;
        break;
      }
      case "x^{3}": {
        x1 = Math.cbrt((-12 - transformY) / Math.abs(stretch));
        x2 = Math.cbrt((12 - transformY) / Math.abs(stretch));
        break;
      }
      case "\\sqrt[3]{x}": {
        x1 = -16 - transformX;
        x2 = 16 - transformX;
        break;
      }
      case "\\sqrt[2]{x}": {
        x1 = 0;
        x2 = 16 - transformX;
        break;
      }
      case "\\left|x\\right|": {
        const domain = Math.abs((12 - transformY) / stretch);
        x1 = -domain;
        x2 = domain;
        break;
      }
      case "\\ln{x}": {
        x1 = Number.EPSILON;
        x2 = 16 - transformX;
        break;
      }
      case "\\frac{1}{x}": {
        x1 = -16 - transformX;
        x2 = 16 - transformX;
        break;
      }
      case "e^{x}": {
        const thresholdX = Math.log((12 - transformY) / Math.abs(stretch));
        const upperBound = Math.min(thresholdX, 16 - transformX);
        x1 = -16 - transformX;
        x2 = upperBound;
        break;
      }
      case "2^{x}": {
        const thresholdX = Math.log2(12 / Math.abs(stretch));
        const upperBound = Math.min(thresholdX, 16 - transformX);
        x1 = -16 - transformX;
        x2 = upperBound;
        break;
      }
      default: {
        console.error("Unknown baseEquation:", baseEquation);
        break;
      }
    }
    if (x1 !== null && x2 !== null) {
      return {
        xStart: Math.min(x1, x2),
        xEnd: Math.max(x1, x2),
      };
    } else {
      return { xStart: null, xEnd: null };
    }
  };

  const memoizedValues = useMemo(() => {
    return submittedEquations.map(({ equation, params }) => {
      return {
        domain: computeDomainBounds(
          params.baseEquation,
          params.stretch,
          params.transformX,
          params.transformY
        ),
        critical: getCriticalPoints(
          equation,
          params.baseEquation,
          params.transformX,
          params.transformY
        ),
      };
    });
  }, [submittedEquations, isPlaying]);

  return (
    // 1) Use h-screen to occupy the full browser height
    <div className="flex flex-col h-screen">
      {/* Top toolbar (BPM & Play/Pause) */}
      <div className="flex flex-row items-start justify-end px-5 py-5 border-black border-b-2">
        <div className="flex flex-col items-start mr-4">
          <div className="bg-transparent text-black text-sm font-medium">
            <p>BPM:</p>
          </div>
          <input
            id="bpm-input"
            type="number"
            value={bpm}
            onChange={(e) => setBPM(Number(e.target.value))}
            className="mt-0.5 w-20 px-1 py-1 text-lg border border-black bg-transparent"
            placeholder="BPM"
          />
        </div>
        {/* Play/Pause Button */}
        <button
          onClick={handleTogglePlay}
          className="h-[100px] w-[100px] bg-lime-200"
        >
          {isPlaying ? (
            // Stop Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              viewBox="0 0 24 24"
            >
              <path d="M6 6h12v12H6z" fill="black" />
            </svg>
          ) : (
            // Play Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" fill="black" />
            </svg>
          )}
        </button>
      </div>

      {/* 2) Scrollable area for everything below the header */}
      <div className="flex-1 overflow-auto">
        {/* EquationList first */}
        <EquationList
          equations={equations}
          onRemove={(index) => {
            const eqToRemove = equations[index];
            if (eqToRemove) {
              onRemoveEquation(eqToRemove.id);
            }
          }}
          onSelect={(index) => {
            onSelectEquation(index);
          }}
          selectedIndex={selectedIndex}
          onGainChange={(index, newGain) => {
            // 1) Update local equations array
            setEquations((prev) => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                gain: newGain,
              };
              return updated;
            });
            // 2) Update the submittedEquations (so SoundGenerator sees the new gain)
            const eq = equations[index];
            if (!eq) return;
            setSubmittedEquations((prev) =>
              prev.map((item) =>
                item.graphId === eq.id ? { ...item, gain: newGain } : item
              )
            );
          }}
        />

        {/* Sound Generators */}
        <div>
          {submittedEquations.map(({ equation, params, graphId, gain }, idx) => {
            const { domain, critical } = memoizedValues[idx];
            return (
              <SoundGenerator
                key={graphId}
                equation={equation}
                params={params}
                graphId={graphId}
                isPlaying={isPlaying}
                bpm={bpm}
                xStart={domain.xStart}
                xEnd={domain.xEnd}
                cpxValue={critical.cpx}
                cpyValue={critical.cpy}
                gain={gain}
              />
            );
          })}
        </div>

        {/* Animation Generators */}
        <div>
          {submittedEquations.map(({ equation, params, graphId }, idx) => {
            const { domain, critical } = memoizedValues[idx];
            return (
              <AnimationGenerator
                key={graphId}
                equation={equation}
                params={params}
                graphId={graphId}
                onPointXChange={handlePointXChange}
                isPlaying={isPlaying}
                bpm={bpm}
                xStart={domain.xStart}
                xEnd={domain.xEnd}
                cpxValue={critical.cpx}
                cpyValue={critical.cpy}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
