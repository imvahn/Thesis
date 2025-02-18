import { useState, useEffect } from "react";
import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

interface EquationButtonProps {
  onSubmit: (params: {
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
  }) => void;
  selectedEquation?: {
    graphId: string;
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
  } | null;
  onUpdate?: (params: {
    equationType: string;
    a: number;
    h: number;
    k: number;
    p?: number;
    graphId: string;
  }) => void;
  isPlaying: boolean;
}

export default function EquationButton({
  onSubmit,
  selectedEquation,
  onUpdate,
  isPlaying
}: EquationButtonProps) {
  const [equationType, setEquationType] = useState("Polynomial");

  const [aInput, setAInput] = useState("");
  const [hInput, setHInput] = useState("");
  const [kInput, setKInput] = useState("");
  const [pInput, setPInput] = useState("");

  function parseOrNaN(str: string): number {
    if (!str.trim()) return NaN;
    const val = Number(str);
    return Number.isNaN(val) ? NaN : val;
  }

  const parsedA = parseOrNaN(aInput);
  const parsedH = parseOrNaN(hInput);
  const parsedK = parseOrNaN(kInput);
  const parsedP = parseOrNaN(pInput);

  function displayValueOrSymbol(
    parsedVal: number,
    symbol: string,
    color: string
  ) {
    const displayStr = Number.isNaN(parsedVal) ? symbol : parsedVal.toString();
    return `\\textcolor{${color}}{${displayStr}}`;
  }

  const buildPreviewEquation = () => {
    const A = displayValueOrSymbol(parsedA, "a", "red");
    const H = displayValueOrSymbol(parsedH, "h", "blue");
    const K = displayValueOrSymbol(parsedK, "k", "purple");
    const P = displayValueOrSymbol(parsedP, "p", "green");

    switch (equationType) {
      case "Polynomial":
        return `${A} \\cdot (x - ${H})^{${P}} + ${K}`;
      case "Logarithm":
        return `${A} \\cdot \\ln(x - ${H}) + ${K}`;
      case "Exponential":
        return `${A} \\cdot e^{(x - ${H})} + ${K}`;
      case "Absolute Value":
        return `${A} \\cdot \\lvert x - ${H} \\rvert + ${K}`;
      case "Rational":
        return `\\frac{${A}}{x - ${H}} + ${K}`;
      case "Square Root":
        return `${A} \\cdot \\sqrt[2]{x - ${H}} + ${K}`;
      case "Cube Root":
        return `${A} \\cdot \\sqrt[3]{x - ${H}} + ${K}`;
      default:
        return "";
    }
  };

  const displayEquation = buildPreviewEquation();

  const canSubmit = () => {
    if (Number.isNaN(parsedA) || parsedA === 0) {
      return false;
    }
    if (equationType === "Polynomial" && Number.isNaN(parsedP) || Number(parsedP) > 3) {
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
        // Prevent submission if sound is playing.
    if (isPlaying) {
      alert("you cannot add equations while sound is playing!");
      return;
    }
    if (!canSubmit()) {
      alert(
        "Please enter valid values, ensuring 'a' is nonzero\n(and 0 > 'p' ≥ 3 if Polynomial)."
      );
      return;
    }
    const params = {
      equationType,
      a: parseOrNaN(aInput),
      h: Number.isNaN(parseOrNaN(hInput)) ? 0 : parseOrNaN(hInput),
      k: Number.isNaN(parseOrNaN(kInput)) ? 0 : parseOrNaN(kInput),
      p:
        equationType === "Polynomial"
          ? Number.isNaN(parseOrNaN(pInput))
            ? 2
            : parseOrNaN(pInput)
          : undefined,
    };

    // If in update mode (i.e. selectedEquation exists), call onUpdate; otherwise, call onSubmit
    if (selectedEquation && onUpdate) {
      onUpdate({ ...params, graphId: selectedEquation.graphId });
    } else {
      onSubmit(params);
    }
  };

  // When a selected equation is provided, prefill the inputs
  useEffect(() => {
    if (selectedEquation) {
      setEquationType(selectedEquation.equationType);
      setAInput(selectedEquation.a.toString());
      setHInput(selectedEquation.h.toString());
      setKInput(selectedEquation.k.toString());
      setPInput(selectedEquation.p?.toString() || "");
    }
  }, [selectedEquation]);

  useEffect(() => {
    if (!selectedEquation) {
      // Reset the form inputs
      setEquationType("Polynomial");
      setAInput("");
      setHInput("");
      setKInput("");
      setPInput("");
    }
  }, [selectedEquation]);

  return (
    <div className="w-full flex flex-row items-center text-sm bg-gray-200">
      {/* Left side: select + button */}
      <div className="flex flex-row items-center px-2 space-x-2">
        <label className="font-medium text-gray-700">Type:</label>
        <select
          className="px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none"
          onChange={(e) => setEquationType(e.target.value)}
          value={equationType}
        >
          <option value="Polynomial">Polynomial</option>
          <option value="Logarithm">Logarithm</option>
          <option value="Exponential">Exponential</option>
          <option value="Absolute Value">Absolute Value</option>
          <option value="Rational">Rational</option>
          <option value="Square Root">Square Root</option>
          <option value="Cube Root">Cube Root</option>
        </select>

        <button
          onClick={handleSubmit}
          className="px-3 py-1 bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors"
        >
          {selectedEquation ? "Update Equation" : "Add Equation"}{" "}
        </button>
      </div>

      {/* Right side: inputs + preview */}
      <div className="flex flex-row flex-grow justify-end items-center space-x-2 px-2">
        <label className="flex items-center space-x-1">
          <span className="text-red-500 font-semibold">a</span>
          <input
            type="text"
            className="w-12 px-1 py-0.5 text-center border border-red-300 rounded focus:outline-none"
            value={aInput}
            onChange={(e) => setAInput(e.target.value)}
            placeholder="a"
          />
        </label>

        <label className="flex items-center space-x-1">
          <span className="text-blue-500 font-semibold">h</span>
          <input
            type="text"
            className="w-12 px-1 py-0.5 text-center border border-blue-300 rounded focus:outline-none"
            value={hInput}
            onChange={(e) => setHInput(e.target.value)}
            placeholder="h"
          />
        </label>

        <label className="flex items-center space-x-1">
          <span className="text-purple-500 font-semibold">k</span>
          <input
            type="text"
            className="w-12 px-1 py-0.5 text-center border border-purple-300 rounded focus:outline-none"
            value={kInput}
            onChange={(e) => setKInput(e.target.value)}
            placeholder="k"
          />
        </label>

        {equationType === "Polynomial" && (
          <label className="flex items-center space-x-1">
            <span className="text-green-500 font-semibold">p</span>
            <input
              type="text"
              className="w-12 px-1 py-0.5 text-center border border-green-300 rounded focus:outline-none"
              value={pInput}
              onChange={(e) => setPInput(e.target.value)}
              placeholder="p"
            />
          </label>
        )}

        {/* Preview */}
        <div className="text-base font-semibold text-gray-800">
          <InlineMath>{`f(x) = ${displayEquation}`}</InlineMath>
        </div>
      </div>
    </div>
  );
}
