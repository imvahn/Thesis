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
import EquationList from "@/components/EquationList";
import SoundGenerator from "@/components/SoundGenerator";
import AnimationGenerator from "@/components/AnimationGenerator";
import { EquationEntry } from "@/components/Calculator";

interface Props {
  equations: EquationEntry[];
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
  onRemoveEquation,
  submittedEquations,
  setSubmittedEquations,
  onSelectEquation,
  selectedIndex,
  isPlaying,
  setIsPlaying,
}: Props) {
  const [bpm, setBPM] = useState(120);
  const [bpmInput, setBPMInput] = useState(120);

  const handleBPMSubmit = () => {
    setBPM(bpmInput);
  };

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
      // console.log(baseEquation,cpxValue,cpyValue);
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
        const thresholdX = Math.log(12 / Math.abs(stretch));
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

  // Load all samples on mount
  useEffect(() => {
    fetch("/api/load-samples")
      .then((res) => res.json())
      .then(() => {
        console.log("loaded samples");
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Single toggle button for play/stop */}
      <div className="flex flex-row px-2 py-3">
        <button
          onClick={handleTogglePlay}
          className="w-full px-4 py-2 bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors flex items-center justify-center space-x-2"
        >
          {isPlaying ? (
            // Stop Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M6 6h12v12H6z" />
            </svg>
          ) : (
            // Play Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* BPM Input */}
      <div className="flex flex-col px-2 py-1 space-y-2">
        <div className="flex flex-row space-x-2">
          <input
            id="bpm-input"
            type="number"
            value={bpmInput}
            onChange={(e) => setBPMInput(Number(e.target.value))}
            className="w-20 px-1 py-1 text-sm border rounded focus:outline-none focus:ring focus:border-blue-300"
          />
          <button
            onClick={handleBPMSubmit}
            className="px-4 py-2 bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors"
          >
            Set BPM
          </button>
        </div>
        <p className="text-xs text-gray-600">Current BPM: {bpm}</p>
      </div>

      {/* EquationList */}
      <div className="bg-white grow">
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
        />
      </div>

      {/* Sound Generators */}
      <div>
        {submittedEquations.map(({ equation, params, graphId }, index) => {
          const { domain, critical } = memoizedValues[index];
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
            />
          );
        })}
      </div>

      {/* Animation Generators */}
      <div>
        {submittedEquations.map(({ equation, params, graphId }, index) => {
          const { domain, critical } = memoizedValues[index];
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
  );
}
