export type ObjectId = 'terminal' | 'notes' | 'light';
export type Point = { x: number; z: number };
export type Solid = { x: number; z: number; width: number; depth: number };
export const objects: Array<{
  id: ObjectId;
  name: string;
  description: string;
  anchor: Point;
  label: { x: number; y: number; z: number };
}> = [
  {
    id: 'terminal',
    name: '我的终端',
    description: '打开电脑，开始创造。',
    anchor: { x: -1.5, z: -1.05 },
    label: { x: -1.45, y: 2.3, z: -2.8 },
  },
  {
    id: 'notes',
    name: '随手记',
    description: '给此刻的想法留个位置。',
    anchor: { x: -3.35, z: 0.4 },
    label: { x: -4.15, y: 1.85, z: 0.25 },
  },
  {
    id: 'light',
    name: '房间灯光',
    description: '给房间换一种心情。',
    anchor: { x: 3.4, z: 2.3 },
    label: { x: 4.15, y: 2.9, z: 2.1 },
  },
];
export const solids: Solid[] = [
  { x: -1.6, z: -2.9, width: 3.5, depth: 1.25 },
  { x: -4.25, z: -0.8, width: 1.15, depth: 3.7 },
  { x: 3.0, z: -1.6, width: 2.45, depth: 3.9 },
  { x: 4.15, z: 2.1, width: 0.6, depth: 0.6 },
  { x: -3.95, z: 2.8, width: 0.85, depth: 0.85 },
];
