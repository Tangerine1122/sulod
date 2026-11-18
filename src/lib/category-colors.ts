/** Colors offered for categories. The first eight are the starter categories' colors. */
export const CATEGORY_COLORS = [
  { hex: "#F2B33D", name: "Mango" },
  { hex: "#0E5A57", name: "Sea teal" },
  { hex: "#C4421A", name: "Chili" },
  { hex: "#9CC9C2", name: "Mint" },
  { hex: "#E8A87C", name: "Peach" },
  { hex: "#8C7B6B", name: "Driftwood" },
  { hex: "#D9B8E8", name: "Lilac" },
  { hex: "#CFC5B8", name: "Sand" },
  { hex: "#5B7DB1", name: "Sky" },
  { hex: "#7A9A3A", name: "Moss" },
  { hex: "#B5546B", name: "Rose" },
  { hex: "#3D3A8C", name: "Indigo" },
] as const;

export const CATEGORY_HEXES = CATEGORY_COLORS.map((c) => c.hex) as [string, ...string[]];
