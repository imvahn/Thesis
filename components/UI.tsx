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
import "katex/dist/katex.min.css";

import EquationList from "@/components/EquationList";
import SoundGenerator from "@/components/SoundGenerator";
import AnimationGenerator from "@/components/AnimationGenerator";
import { EquationEntry } from "@/lib/equations";
import Slider from "@mui/material/Slider";

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
  const [bpm, setBPM] = useState(60);
  const [flash, setFlash] = useState(false);

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

  // Wrap the play/stop toggle with a flash effect.
  const handleButtonClick = async () => {
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
      // Only look at shift
      cpxValue = tx.toString();
      cpyValue = ty.toString();
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
      {/* Top toolbar (Tempo Slider & Play/Pause) */}
      <div className="flex flex-col items-center justify-center px-5 py-5 border-gray-300 border-b-2">
        <div className="flex flex-row items-center gap-8">
          {/* Fixed-width container for the Tempo Slider group */}
          <div className="w-56 flex flex-row items-center gap-2">
            <span className="text-sm font-medium text-lime-700">tempo:</span>
            <Slider
              value={bpm}
              min={40}
              max={120}
              onChange={(e, newValue) => {
                if (typeof newValue === "number") setBPM(newValue);
              }}
              className="w-40 cursor-pointer"
              sx={{
                color: "#a3e635", // lime-400
                // remove box shadow/highlight from all instances
                "& .MuiSlider-thumb": {
                  boxShadow: "none",
                  "&:focus, &:hover, &.Mui-active": {
                    boxShadow: "none",
                  },
                  "&:before": {
                    boxShadow: "none",
                  },
                },
              }}
            />
            <span className="text-lime-700 text-sm font-medium">{bpm}</span>
          </div>
          {/* Play/Pause Button */}
          <button
            onClick={handleButtonClick}
            className="h-[100px] w-[100px] bg-lime-500 rounded transition-transform duration-300 hover:-rotate-1 hover:scale-105"
          >
            {isPlaying ? (
              // Stop Icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full"
                viewBox="0 0 24 24"
              >
                <path d="M6 6h12v12H6z" fill="white" />
              </svg>
            ) : (
              // Play Icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" fill="white" />
              </svg>
            )}
          </button>
        </div>
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
          {submittedEquations.map(
            ({ equation, params, graphId, gain }, idx) => {
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
            }
          )}
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
