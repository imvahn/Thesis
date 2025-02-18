import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

interface EquationListProps {
  equations: Array<{
    id: string;
    latex: string;
    color?: string;
  }>;
  onRemove: (index: number) => void;
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

const EquationList = ({
  equations,
  onRemove,
  onSelect,
  selectedIndex,
}: EquationListProps) => {
  return (
    <div className="w-full flex flex-col text-sm">
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
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering onSelect when clicking remove
                onRemove(index);
              }}
              className="ml-2 px-3 py-1 bg-lime-600 text-white rounded hover:bg-lime-700 transition-colors"
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
