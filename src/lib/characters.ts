import shibu from "@/assets/characters/Sendagaya_Shibu.vrm.asset.json";
import shino from "@/assets/characters/Sendagaya_Shino.vrm.asset.json";
import fumiriya from "@/assets/characters/Sakurada_Fumiriya.vrm.asset.json";
import sampleB from "@/assets/characters/AvatarSample_B.vrm.asset.json";
import sampleC from "@/assets/characters/AvatarSample_C.vrm.asset.json";

export interface Character {
  id: string;
  name: string;
  title: string;
  style: string;
  /** URL of the .vrm model */
  vrm: string;
  /** Fallback portrait shown while loading or when 3D is unavailable */
  thumb?: string;
  /** Optional short voice sample used by /character-test */
  preview?: string;
}

export const CHARACTERS: Character[] = [
  { id: "kai", name: "Kai", title: "Staff Engineer", style: "Calm and methodical", vrm: shibu.url },
  { id: "mira", name: "Mira", title: "Engineering Manager", style: "Warm and encouraging", vrm: shino.url },
  { id: "elena", name: "Elena", title: "Principal Architect", style: "Direct and precise", vrm: fumiriya.url },
  { id: "noor", name: "Noor", title: "Senior Tech Lead", style: "Curious, asks follow-ups", vrm: sampleB.url },
  { id: "theo", name: "Theo", title: "Reliability Lead", style: "Practical, real-world focus", vrm: sampleC.url },
];

export const DEFAULT_CHARACTER_ID = "mira";

export function getCharacter(id: string | undefined): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[1] ?? (CHARACTERS[0] as Character);
}
