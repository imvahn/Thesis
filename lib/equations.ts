// Data structure for a created equation in Desmos
export type EquationEntry = {
  id: string; // same as graphId
  latex: string;
  color?: string;
  expressionIds: string[];
  gain: number;
};

export const getInstrument = (type: string, pValue?: number): string => {
  if (type === "Polynomial") {
    if (pValue === 2) return "Kick";
    if (pValue === 3) return "Snare";
  }
  switch (type) {
    case "Logarithm":
      return "idk";
    case "Exponential":
      return "LongC";
    case "Absolute Value":
      return "Synth";
    case "Rational":
      return "Reverse";
    case "Square Root":
      return "Guitar";
    case "Cube Root":
      return "HarmC";
    default:
      return "Synth";
  }
};

export const getColor = (instrument: string): string => {
  switch (instrument) {
    case "Guitar":
      return "red";
    case "HarmC":
      return "darkblue";
    case "Kick":
      return "orange";
    case "LongC":
      return "green";
    case "Reverse":
      return "purple";
    case "Synth":
      return "brown";
    case "idk":
      return "blue";
    case "snare":
      return "darkgreen";
    default:
      return "black";
  }
};
