import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import { Knob } from "primereact/knob";

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
    <div className="w-full flex flex-col text-lg overflow-auto">
      {equations.map((equation, index) => {
        const isSelected = selectedIndex === index;

        // Decide row background: selected row gets lime-200,
        // otherwise alternate between white (even) and gray (odd).
        const rowBg = isSelected
          ? "bg-lime-200"
          : index % 2 === 0
          ? "bg-white"
          : "bg-gray-100";

        return (
          <div
            key={equation.id}
            onClick={() => onSelect(index)}
            className={`relative flex flex-row items-center px-2 py-1 ${rowBg} hover:bg-lime-100`}
          >
            <div className="font-large" style={{ color: equation.color }}>
              <BlockMath>{`f(x) = ${equation.latex}`}</BlockMath>
            </div>
            <div className="ml-auto mr-7">
              <Knob
                value={equation.gain}
                size={40}
                onChange={(e) => onGainChange(index, e.value)}
                min={0}
                max={10}
                valueColor="#65a30d"
                textColor="#3f6212"
                rangeColor="#1a2e05"
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="absolute top-0 right-0 w-[14px] h-[14px] mt-2 mr-4 flex items-center justify-center text-[14px] leading-[14px] bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors"
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
