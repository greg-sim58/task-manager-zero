import { hashString } from "@/lib/noteIcons";

// Static palette derived from color-swatches.html.
export const NOTE_COLORS: { name: string; hex: string }[] = [
  { name: "Bright Marine", hex: "#00A7B5" },
  { name: "Deep Lagoon", hex: "#008C95" },
  { name: "Sea Glass", hex: "#20B2AA" },
  { name: "Tidal Mint", hex: "#46C2B0" },
  { name: "Abyss Teal", hex: "#007C83" },
  { name: "Storm Glass", hex: "#5B8E9E" },
  { name: "Slate Azure", hex: "#7189A6" },
  { name: "Dusty Iris", hex: "#7B6FA8" },
  { name: "Orchid Haze", hex: "#9A6FB0" },
  { name: "Mulberry", hex: "#A85B9E" },
  { name: "Raspberry Smoke", hex: "#C04F8A" },
  { name: "Rose Current", hex: "#D45A7A" },
  { name: "Burnished Coral", hex: "#E06B5F" },
  { name: "Persimmon", hex: "#E8794F" },
  { name: "Apricot Flame", hex: "#F08A4B" },
  { name: "Amber Sand", hex: "#EFA94A" },
  { name: "Ochre Gold", hex: "#D9A441" },
  { name: "Antique Brass", hex: "#C9B458" },
  { name: "Olive Mist", hex: "#A6A34C" },
  { name: "Moss Jade", hex: "#8FA35B" },
  { name: "Sage Current", hex: "#6FAF76" },
  { name: "Jade Mist", hex: "#4FAF87" },
  { name: "Lagoon Jade", hex: "#3BAF9A" },
  { name: "Harbour Jade", hex: "#3E9D9A" },
  { name: "Ocean Slate", hex: "#3F8296" },
  { name: "Indigo Steel", hex: "#536F8F" },
  { name: "Twilight Iris", hex: "#685F91" },
  { name: "Plum Stone", hex: "#765A91" },
  { name: "Mauve Wine", hex: "#875C82" },
  { name: "Dried Rose", hex: "#965C70" },
  { name: "Clay Rose", hex: "#A65E62" },
  { name: "Terracotta", hex: "#B56B58" },
  { name: "Copper Earth", hex: "#B87A4A" },
  { name: "Bronze Dust", hex: "#9B774B" },
  { name: "Weathered Brass", hex: "#7F7654" },
  { name: "Lichen", hex: "#69765F" },
  { name: "Pine Smoke", hex: "#59766F" },
  { name: "Harbour Fog", hex: "#52777C" },
  { name: "Blue Slate", hex: "#596C7D" },
  { name: "Graphite Violet", hex: "#665F70" },
  { name: "Plum Charcoal", hex: "#745D68" },
  { name: "Rosewood", hex: "#805F5C" },
  { name: "Cedar", hex: "#7D6A52" },
  { name: "Moss Bronze", hex: "#746F55" },
  { name: "Olive Charcoal", hex: "#655F52" },
  { name: "Gunmetal Moss", hex: "#585C58" },
  { name: "Deep Harbour", hex: "#4F6264" },
  { name: "Night Orchid", hex: "#584F67" },
  { name: "Dark Mulberry", hex: "#684F59" },
  { name: "Deep Ochre", hex: "#685945" },
];

// Deterministically assign each note a color from the palette (may repeat).
export function assignNoteColors<T extends { id: string }>(
  notes: T[]
): (T & { color: string })[] {
  return notes.map((note) => ({
    ...note,
    color: NOTE_COLORS[hashString(note.id) % NOTE_COLORS.length].hex,
  }));
}
