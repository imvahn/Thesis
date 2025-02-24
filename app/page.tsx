"use client";

import { useState, useRef } from "react";

import { EquationEntry } from "@/components/Calculator";
import dynamic from "next/dynamic";
const Calculator = dynamic(() => import("@/components/Calculator"), {
  ssr: false,
});

import UI from "@/components/UI";

export default function Home() {
  // Keep track of equations for EquationList (rendered in Desmos)
  const [equations, setEquations] = useState<EquationEntry[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Keep track of all submitted equations
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

  // selectedEquation holds the equation in update mode.
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

  // Called by Calculator each time a new equation is submitted
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

  // Remove from both the Desmos calculator & local arrays
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

  // Called when a user clicks an equation in EquationList
  const handleEquationSelect = (index: number) => {
    if (selectedEquation) {
      // If update mode is active and the clicked equation is different,
      // exit update mode and unhighlight.
      if (submittedEquations[index].graphId !== selectedEquation.graphId) {
        setSelectedEquation(null);
      } else {
        // If the same equation is clicked, toggle off (exit update mode)
        setSelectedEquation(null);
      }
    } else {
      // Not in update mode—select this equation
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

  // When an equation is updated (from EquationButton), clear update mode.
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
    // Update the Desmos equation list state
    setEquations((prev) =>
      prev.map((eq) =>
        eq.id === graphId ? { ...eq, latex: updatedData.equation, color:updatedData.color } : eq
      )
    );
    // Update submittedEquations (for SoundGenerator and AnimationGenerator)
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
    // Clear update mode and unhighlight the selected equation
    setSelectedEquation(null);
  };

  // Called by Calculator each time a new equation is fully created
  const handleEquationAdded = (newEq: EquationEntry) => {
    setEquations((prev) => [...prev, newEq]);
  };

  // Compute the selected index from the selectedEquation
  const selectedIndex =
    selectedEquation !== null
      ? submittedEquations.findIndex(
          (eq) => eq.graphId === selectedEquation.graphId
        )
      : null;

  return (
    <main className="w-screen h-screen flex flex-row bg-gray-100">
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

      <div className="flex flex-col w-[27%] border-l">
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
