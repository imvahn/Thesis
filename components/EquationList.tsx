import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";
import { Knob } from "primereact/knob";
import { useState } from "react";

interface EquationListProps {
  equations: Array<{
    id: string;
    latex: string;
    color?: string;
    gain: number;
  }>;
  onRemove: (index: number) => void;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
  onGainChange: (index: number, newGain: number) => void;
}

const EquationList = ({
  equations,
  onRemove,
  onSelect,
  selectedIndex,
  onGainChange,
}: EquationListProps) => {

  return (
    <div className="w-full flex flex-col text-lg">
      {equations.map((equation, index) => {
        const isSelected = selectedIndex === index;
        return (
          <div
            onClick={() => onSelect(index)}
            key={equation.id}
            className={`flex flex-row items-center px-2 py-1 ${
              isSelected ? "bg-lime-200" : "bg-white"
            } hover:bg-lime-100`}
          >
            <div className="font-medium" style={{ color: equation.color }}>
              <InlineMath>{`f(x) = ${equation.latex}`}</InlineMath>
            </div>
            <div className="ml-auto flex items-center space-x-2">
              <Knob
                value={equation.gain}
                size={40}
                onChange={(e) => onGainChange(index, e.value)}
                min={0}
                max={1}
                step={0.5}
                valueColor="#65a30d" //tailwindcss lime 600
                textColor="#3f6212" //tailwindcss lime 800
                rangeColor="#1a2e05" //tailwindcss lime 950
              />
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent triggering onSelect when clicking remove
                  onRemove(index);
                }}
                className="px-3 py-1 bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EquationList;
