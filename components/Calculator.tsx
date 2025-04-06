"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, Ref } from "react";
import Desmos from "desmos";
import EquationButton from "@/components/EquationButton";
import { getInstrument, getColor } from "@/lib/equations";

interface DesmosCalculator {
  setExpression: (expression: {
    id: string;
    latex: string;
    [key: string]: any;
  }) => void;
  removeExpression: (expression: { id: string }) => void;
  setMathBounds: (bounds: {
    left: number;
    right: number;
    bottom: number;
    top: number;
  }) => void;
  getExpressions: () => Array<{ id: string; latex: string; color?: string }>;
  destroy: () => void;
}

// Data structure for a created equation in Desmos
export type EquationEntry = {
  id: string; // same as graphId
  latex: string;
  color?: string;
  expressionIds: string[];
  gain: number;
};

interface CalculatorProps {
  // Called after we fully create the new equation (including color, expressionIds)
  onEquationAdded: (eq: EquationEntry) => void;

  // Called for SoundGenerators
  onEquationSubmit: (
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
    instrument: string
  ) => void;

  // Called when an equation is removed
  onEquationRemove: (graphId: string) => void;

  // The parent’s array of equations with updated pointX (for animation)
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
    pointX: number | null;
  }[];

  selectedEquation?: {
    graphId: string;
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
    instrument: string;
  } | null;

  onEquationUpdate: (
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
      instrument: string;
      color: string;
    }
  ) => void;
  isPlaying: boolean;
}

function Calculator(
  {
    onEquationAdded,
    onEquationSubmit,
    onEquationRemove,
    submittedEquations,
    selectedEquation,
    onEquationUpdate,
    isPlaying,
  }: CalculatorProps,
  ref: Ref<any>
) {
  const calculatorRef = useRef<HTMLDivElement | null>(null);
  const calculatorInstance = useRef<DesmosCalculator | null>(null);

  // Create the Desmos instance
  useEffect(() => {
    if (calculatorRef.current) {
      const calc = Desmos.GraphingCalculator(calculatorRef.current, {
        keypad: false,
        settingsMenu: false,
        expressions: false,
        zoomButtons: false,
        lockViewport: true,
      });

      calc.setMathBounds({
        left: -16,
        right: 16,
        bottom: -12,
        top: 12,
      });

      calculatorInstance.current = calc;

      return () => {
        calc.destroy();
      };
    }
  }, []);

  // Expose a method to remove expressions by graphId
  useImperativeHandle(ref, () => ({
    removeEquationById: (graphId: string) => {
      if (!calculatorInstance.current) return;
      const calc = calculatorInstance.current;
      // Remove all known expressions related to this equation
      calc.removeExpression({ id: `f-${graphId}` });
      calc.removeExpression({ id: `a-${graphId}` });
      calc.removeExpression({ id: `xPoint-${graphId}` });
      calc.removeExpression({ id: `yPoint-${graphId}` });
      calc.removeExpression({ id: `pt-${graphId}` });
      calc.removeExpression({ id: `eq-${graphId}` });
    },
  }));

  // Build final latex for the transformed equation
  function constructTransformedEquation(
    baseEquation: string,
    stretch: number,
    transformX: number,
    transformY: number
  ): string {
    const xReplacement =
      transformX === 0
        ? "x"
        : `(x${transformX < 0 ? "+" : "-"}${Math.abs(transformX)})`;

    let transformed = baseEquation.replace(/x/g, xReplacement);
    transformed = `${stretch}*(${transformed})`;
    if (transformY !== 0) {
      transformed = `(${transformed})${transformY > 0 ? "+" : ""}${transformY}`;
    }
    return transformed;
  }

  // Map from selected type + optional exponent to baseEquation
  function mapEquationTypeToBaseEquation(
    equationType: string,
    p?: number
  ): string {
    switch (equationType) {
      case "Polynomial":
        if (p === 2) return "x^{2}";
        if (p === 3) return "x^{3}";
        return `x^{${p ?? 2}}`;
      case "Logarithm":
        return "\\ln{x}";
      case "Exponential":
        return "e^{x}";
      case "Absolute Value":
        return "\\left|x\\right|";
      case "Rational":
        return "\\frac{1}{x}";
      case "Square Root":
        return "\\sqrt[2]{x}";
      case "Cube Root":
        return "\\sqrt[3]{x}";
      default:
        return "x^{2}";
    }
  }

  // Called by <EquationButton> when user hits "Add Equation"
  const handleEquationSubmitFromButton = (newParams: {
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
    instrument: string;
  }) => {
    if (!calculatorInstance.current) return;

    const color = getColor(newParams.instrument);

    // 1) build the baseEquation
    const baseEquation = mapEquationTypeToBaseEquation(
      newParams.equationType,
      newParams.p
    );
    // 2) build the final equation
    const finalEquation = constructTransformedEquation(
      baseEquation,
      newParams.a,
      newParams.h,
      newParams.k
    );
    // 3) generate a unique ID
    const graphId = `${Date.now()}`;

    // 4) build expression IDs
    const exprIds = {
      functionId: `f-${graphId}`,
      paramId: `a-${graphId}`,
      xPointId: `xPoint-${graphId}`,
      yPointId: `yPoint-${graphId}`,
      pointId: `pt-${graphId}`,
      graphId: `eq-${graphId}`,
    };

    // 5) set expressions in Desmos
    const calc = calculatorInstance.current;

    // (A) hidden function
    calc.setExpression({
      id: exprIds.functionId,
      latex: `f_{${graphId}}(x) = ${baseEquation}`,
      hidden: true,
    });

    // (B) param a_{graphId} = 0
    calc.setExpression({
      id: exprIds.paramId,
      latex: `a_{${graphId}} = 0`,
    });

    // (C) x_{graphId} and y_{graphId}
    calc.setExpression({
      id: exprIds.xPointId,
      latex: `x_{${graphId}} = a_{${graphId}} + (${newParams.h})`,
    });
    calc.setExpression({
      id: exprIds.yPointId,
      latex: `y_{${graphId}} = ${newParams.a}*f_{${graphId}}(a_{${graphId}}) + (${newParams.k})`,
    });

    // (D) the moving point
    calc.setExpression({
      id: exprIds.pointId,
      latex: `(x_{${graphId}}, y_{${graphId}})`,
      showLabel: false,
      color: color,
    });

    // (E) final transformed equation
    calc.setExpression({
      id: exprIds.graphId,
      latex: `y=${finalEquation}`,
      color: color,
    });

    // Tell the parent that we created a new Desmos equation
    onEquationAdded({
      id: graphId,
      latex: finalEquation,
      color,
      expressionIds: Object.values(exprIds),
      gain: 5,
    });

    // Also notify the parent so it can create a SoundGenerator entry
    onEquationSubmit(
      finalEquation,
      {
        equationType: newParams.equationType,
        baseEquation,
        stretch: newParams.a,
        transformX: newParams.h,
        transformY: newParams.k,
        p: newParams.p,
      },
      true,
      5,
      graphId,
      newParams.instrument
    );
  };

  const handleEquationUpdateFromButton = (updatedParams: {
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
    graphId: string;
    instrument: string;
  }) => {
    if (!calculatorInstance.current) return;

    const newInstrument =
   updatedParams.equationType === "Polynomial"
     ? getInstrument(updatedParams.equationType, updatedParams.p)
     : getInstrument(updatedParams.equationType);

    const color = getColor(updatedParams.instrument);

    const baseEquation = mapEquationTypeToBaseEquation(
      updatedParams.equationType,
      updatedParams.p
    );
    const finalEquation = constructTransformedEquation(
      baseEquation,
      updatedParams.a,
      updatedParams.h,
      updatedParams.k
    );
    const graphId = updatedParams.graphId;

    const exprIds = {
      functionId: `f-${graphId}`,
      paramId: `a-${graphId}`,
      xPointId: `xPoint-${graphId}`,
      yPointId: `yPoint-${graphId}`,
      pointId: `pt-${graphId}`,
      graphId: `eq-${graphId}`,
    };
    const calc = calculatorInstance.current;

    // (A) hidden function
    calc.setExpression({
      id: exprIds.functionId,
      latex: `f_{${graphId}}(x) = ${baseEquation}`,
      hidden: true,
    });

    // (B) param a_{graphId} = 0
    calc.setExpression({
      id: exprIds.paramId,
      latex: `a_{${graphId}} = 0`,
    });

    // (C) x_{graphId} and y_{graphId}
    calc.setExpression({
      id: exprIds.xPointId,
      latex: `x_{${graphId}} = a_{${graphId}} + (${updatedParams.h})`,
    });
    calc.setExpression({
      id: exprIds.yPointId,
      latex: `y_{${graphId}} = ${updatedParams.a}*f_{${graphId}}(a_{${graphId}}) + (${updatedParams.k})`,
    });

    // (D) the moving point
    calc.setExpression({
      id: exprIds.pointId,
      latex: `(x_{${graphId}}, y_{${graphId}})`,
      showLabel: false,
      color: color,
    });

    // (E) final transformed equation
    calc.setExpression({
      id: exprIds.graphId,
      latex: `y=${finalEquation}`,
      color: color,
    });

    // Call the parent’s update callback so the UI (and Sound/Animation generators) update accordingly
    onEquationUpdate(graphId, {
      equation: finalEquation,
      params: {
        equationType: updatedParams.equationType,
        baseEquation,
        stretch: updatedParams.a,
        transformX: updatedParams.h,
        transformY: updatedParams.k,
        p: updatedParams.p,
      },
      instrument: newInstrument,
      color: color,
    });
  };

  // Whenever parent's submittedEquations changes, we update the param a_{graphId} so the point is “animated”
  useEffect(() => {
    if (!calculatorInstance.current) return;
    const calc = calculatorInstance.current;

    submittedEquations.forEach((eq) => {
      const paramId = `a-${eq.graphId}`;
      calc.setExpression({
        id: paramId,
        latex: `a_{${eq.graphId}}=${eq.pointX ?? 0}`,
      });
    });
  }, [submittedEquations]);

  return (
    <div className="flex flex-col">
      {/* Desmos graph */}
      <div
        ref={calculatorRef}
        className="bg-white"
        style={{ width: "100%", height: "90vh" }}
      />

      {/* EquationButton to add new equations */}
      <EquationButton
        onSubmit={handleEquationSubmitFromButton} // for new equations
        selectedEquation={selectedEquation} // pass the selected equation, if any
        onUpdate={handleEquationUpdateFromButton} // callback for updating an existing equation
        isPlaying={isPlaying}
      />
    </div>
  );
}

// Export the wrapped version so parent can call .removeEquationById(...)
export default forwardRef(Calculator);
