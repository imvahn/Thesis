"use client";

import { useState, useRef } from "react";
import { EquationEntry } from "@/lib/equations";
import dynamic from "next/dynamic";
const Calculator = dynamic(() => import("@/components/Calculator"), {
  ssr: false,
});

import UI from "@/components/UI";

export default function Home() {
  const [equations, setEquations] = useState<EquationEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const [submittedEquations, setSubmittedEquations] = useState<
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
      gain: number;
      instrument: string;
      pointX: number | null;
    }[]
  >([]);

  const [selectedEquation, setSelectedEquation] = useState<{
    graphId: string;
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
    instrument: string;
  } | null>(null);

  const calculatorRef = useRef<any>(null);

  const handleEquationSubmit = (
    equation: string,
    params: {
      equationType: string;
      baseEquation: string;
      stretch: number;
      transformX: number;
      transformY: number;
      p?: number;
    },
    isSubmit: boolean,
    gain: number,
    graphId: string,
    instrument: string,
  ) => {
    setSubmittedEquations((prev) => [
      ...prev,
      { equation, params, graphId, instrument, gain: 5, pointX: null },
    ]);
  };

  const handleEquationRemove = (graphId: string) => {
    // 1) Remove from Desmos
    if (calculatorRef.current) {
      calculatorRef.current.removeEquationById(graphId);
    }
    // 2) Remove from the UI list
    setEquations((prev) => prev.filter((eq) => eq.id !== graphId));
    // 3) Remove from submittedEquations
    setSubmittedEquations((prev) =>
      prev.filter((eq) => eq.graphId !== graphId)
    );
    // 4) Clear selection if the deleted equation is currently selected
    if (selectedEquation && selectedEquation.graphId === graphId) {
      setSelectedEquation(null);
    }
  };

  const handleEquationSelect = (index: number) => {
    if (selectedEquation) {
      if (submittedEquations[index].graphId !== selectedEquation.graphId) {
        setSelectedEquation(null);
      } else {
        setSelectedEquation(null);
      }
    } else {
      const eq = submittedEquations[index];
      if (eq) {
        setSelectedEquation({
          graphId: eq.graphId,
          equationType: eq.params.equationType,
          a: eq.params.stretch,
          h: eq.params.transformX,
          k: eq.params.transformY,
          p: eq.params.p,
          instrument: eq.instrument,
        });
      }
    }
  };

  const handleEquationUpdate = (
    graphId: string,
    updatedData: {
      equation: string;
      params: {
        equationType: string;
        baseEquation: string;
        stretch: number;
        transformX: number;
        transformY: number;
        p?: number;
      };
      color: string;
      instrument: string;
    }
  ) => {
    setEquations((prev) =>
      prev.map((eq) =>
        eq.id === graphId ? { ...eq, latex: updatedData.equation, color: updatedData.color } : eq
      )
    );
    setSubmittedEquations((prev) =>
      prev.map((eq) =>
        eq.graphId === graphId
          ? {
              ...eq,
              equation: updatedData.equation,
              params: updatedData.params,
              instrument: updatedData.instrument,
              color: updatedData.color,
            }
          : eq
      )
    );
    setSelectedEquation(null);
  };

  const handleEquationAdded = (newEq: EquationEntry) => {
    setEquations((prev) => [...prev, newEq]);
  };

  const selectedIndex =
    selectedEquation !== null
      ? submittedEquations.findIndex(
          (eq) => eq.graphId === selectedEquation.graphId
        )
      : null;

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-row">
      <div className="flex flex-col w-[73%]">
        <Calculator
          ref={calculatorRef}
          onEquationAdded={handleEquationAdded}
          onEquationSubmit={handleEquationSubmit}
          onEquationRemove={handleEquationRemove}
          onEquationUpdate={handleEquationUpdate}
          submittedEquations={submittedEquations}
          selectedEquation={selectedEquation}
          isPlaying={isPlaying}
        />
      </div>

      <div className="flex flex-col w-[27%]">
        <UI
          equations={equations}
          onRemoveEquation={handleEquationRemove}
          submittedEquations={submittedEquations}
          setSubmittedEquations={setSubmittedEquations}
          onSelectEquation={handleEquationSelect}
          selectedIndex={
            selectedEquation !== null
              ? submittedEquations.findIndex(
                  (eq) => eq.graphId === selectedEquation.graphId
                )
              : null
          }
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          setEquations={setEquations}
        />
      </div>
    </main>
  );
}
