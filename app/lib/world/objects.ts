export type ObjectId =
  | 'terminal'
  | 'notes'
  | 'light'
  | 'tv'
  | 'profile'
  | 'cube';
export const ROOM = { halfWidth: 6, halfDepth: 5 };
// Walls sit 0.1 beyond the room bounds and are 0.24 thick.
export const WALL_INNER = {
  x: ROOM.halfWidth - 0.02,
  z: ROOM.halfDepth - 0.02,
};
// Rendered furniture and collision footprints share these wall-relative origins.
export const FURNITURE = {
  desk: { x: -1.6, z: -WALL_INNER.z + 1.25 / 2, width: 3.5, depth: 1.25 },
  cabinet: { x: -WALL_INNER.x + 1.24 / 2, z: -0.8, width: 1.24, depth: 3.82 },
  bed: {
    x: WALL_INNER.x - 2.48 / 2,
    z: -WALL_INNER.z + 1.96,
    width: 2.48,
    depth: 3.91,
  },
  tv: { x: -3.1, z: WALL_INNER.z - 0.73 / 2, width: 3, depth: 0.73 },
};
export const PROFILE_URL = 'https://enontime.github.io/';
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
    anchor: { x: FURNITURE.desk.x + 0.1, z: FURNITURE.desk.z + 1.85 },
    label: { x: FURNITURE.desk.x + 0.15, y: 2.3, z: FURNITURE.desk.z + 1.1 },
  },
  {
    id: 'notes',
    name: '随手记',
    description: '给此刻的想法留个位置。',
    anchor: { x: FURNITURE.cabinet.x + 1.05, z: 0.4 },
    label: { x: FURNITURE.cabinet.x + 1.1, y: 1.85, z: 0.25 },
  },
  {
    id: 'light',
    name: '房间灯光',
    description: '给房间换一种心情。',
    anchor: { x: 4.4, z: 3.7 },
    label: { x: 4.15, y: 2.9, z: 2.1 },
  },
  {
    id: 'tv',
    name: '小游戏电视',
    description: '贪吃蛇 · 配对记忆',
    anchor: { x: FURNITURE.tv.x, z: FURNITURE.tv.z - 1.3 },
    label: { x: FURNITURE.tv.x, y: 2.2, z: FURNITURE.tv.z + 0.1 },
  },
  {
    id: 'profile',
    name: 'Enon 的个人主页',
    description: '打开 enontime.github.io',
    anchor: { x: 2.4, z: 3.6 },
    label: { x: 2.4, y: 2, z: 4.75 },
  },
  {
    id: 'cube',
    name: '三阶魔方',
    description: '拿起来转一转。',
    anchor: { x: 3.1, z: 1.9 },
    label: { x: 4.4, y: 1.5, z: 1.9 },
  },
];
export const solids: Solid[] = [
  { ...FURNITURE.desk },
  {
    ...FURNITURE.cabinet,
    x: FURNITURE.cabinet.x + 0.02,
    width: FURNITURE.cabinet.width + 0.04,
  },
  { ...FURNITURE.bed, z: FURNITURE.bed.z - 0.005 },
  { x: 5.15, z: 3.4, width: 0.6, depth: 0.6 },
  { x: -4.95, z: 2.8, width: 0.85, depth: 0.85 },
  { ...FURNITURE.tv },
  { x: 4.4, z: 1.7, width: 1.15, depth: 1.8 },
];
