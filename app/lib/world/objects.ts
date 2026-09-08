export type ObjectId =
  | 'terminal'
  | 'notes'
  | 'light'
  | 'tv'
  | 'profile'
  | 'cube';
export const ROOM = { halfWidth: 6, halfDepth: 5 };
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
    anchor: { x: -1.5, z: -2.05 },
    label: { x: -1.45, y: 2.3, z: -2.8 },
  },
  {
    id: 'notes',
    name: '随手记',
    description: '给此刻的想法留个位置。',
    anchor: { x: -4.2, z: 0.4 },
    label: { x: -4.15, y: 1.85, z: 0.25 },
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
    anchor: { x: -3.1, z: 3.25 },
    label: { x: -3.1, y: 2.2, z: 4.65 },
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
  { x: -1.6, z: -3.9, width: 3.5, depth: 1.25 },
  { x: -5.25, z: -0.8, width: 1.24, depth: 3.82 },
  { x: 3.8, z: -2.6, width: 2.48, depth: 3.95 },
  { x: 5.15, z: 3.4, width: 0.6, depth: 0.6 },
  { x: -4.95, z: 2.8, width: 0.85, depth: 0.85 },
  { x: -3.1, z: 4.55, width: 2.9, depth: 0.65 },
  { x: 4.4, z: 1.7, width: 1.15, depth: 1.8 },
];
