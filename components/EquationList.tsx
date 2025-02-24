import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { Knob } from "primereact/knob";
import { useEffect, useState } from "react";

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
            className={`relative flex flex-row items-center px-2 py-1 border-black border-t-2 ${
              isSelected ? "bg-lime-200" : "bg-white"
            } hover:bg-lime-100`}
          >
            <div className="font-large" style={{ color: equation.color }}>
              <BlockMath>{`f(x) = ${equation.latex}`}</BlockMath>
            </div>
            <div className="ml-auto mr-5">
              <Knob
                value={equation.gain}
                size={40}
                onChange={(e) => onGainChange(index, e.value)}
                min={0}
                max={10}
                valueColor="#65a30d" // tailwindcss lime 600
                textColor="#3f6212" // tailwindcss lime 800
                rangeColor="#1a2e05" // tailwindcss lime 950
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering onSelect when clicking remove
                onRemove(index);
              }}
              className="absolute top-0 right-0 w-[14px] h-[14px] mt-2 mr-2 flex items-center justify-center text-[14px] leading-[14px] bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors"
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EquationList;
