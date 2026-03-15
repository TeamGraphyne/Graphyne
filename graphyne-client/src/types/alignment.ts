export interface GuideLine {
  id: string;
  type: "vertical" | "horizontal";
  position: number;
  label?: string;
  color?: string;
}

export interface SnapPoint {
  position: number;
  elementId: string;
  type: "left" | "center" | "right" | "top" | "middle" | "bottom";
}
