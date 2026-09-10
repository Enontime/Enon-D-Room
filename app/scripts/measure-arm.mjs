// Numerical projection report only: no browser, project test runner or build.
// Uses the same pose solver as the rendered arm.
import * as THREE from 'three';
import { createArmMotion } from '../lib/player/arm-motion.ts';
import { ARM_CONFIG } from '../lib/player/arm-config.ts';
import { pathToFileURL } from 'node:url';

const round = (n, digits = 3) => Number(n.toFixed(digits));
function area(points) {
  return Math.abs(points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - p.y * q.x;
  }, 0)) / 2;
}
function clipToViewport(points) {
  for (const [axis, boundary, sign] of [['x', 0, 1], ['x', 1, -1], ['y', 0, 1], ['y', 1, -1]]) {
    const output = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i], q = points[(i + 1) % points.length];
      const insideP = (p[axis] - boundary) * sign >= 0;
      const insideQ = (q[axis] - boundary) * sign >= 0;
      if (insideP) output.push(p);
      if (insideP !== insideQ) {
        const t = (boundary - p[axis]) / (q[axis] - p[axis]);
        output.push({ x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y) });
      }
    }
    points = output;
  }
  return points;
}

export function report(width, height) {
  const camera = new THREE.PerspectiveCamera(72, width / height, 0.05, 40);
  const motion = createArmMotion(camera);
  const vertex = new THREE.Vector3();
  const endpoint = (p, f, translation = true) => vertex.copy(p)
    .applyQuaternion(f.rotation).add(translation ? f.pivot : motion.idlePivot).clone();
  const tipCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) =>
    motion.handEnd.clone().add(new THREE.Vector3(
      x * ARM_CONFIG.view.thickness.width * ARM_CONFIG.scale / 2, 0,
      z * ARM_CONFIG.view.thickness.depth * ARM_CONFIG.scale / 2,
    )));
  function snapshot(t) {
    const f = motion.sample(t);
    const center = endpoint(motion.handCenter, f);
    const p0 = motion.project(endpoint(motion.baseCenter, f));
    const p1 = motion.project(center);
    const dx = (p1.x - p0.x) * width, dy = (p1.y - p0.y) * height;
    const tipRim = clipToViewport(tipCorners.map(p => motion.project(endpoint(p, f))));
    return {
      hand: p1,
      tipCenter: motion.project(endpoint(motion.handEnd, f)),
      tipUpper: tipRim.reduce((top, p) => !top || p.y < top.y ? p : top, null),
      pivot: motion.project(f.pivot),
      rotationOnly: motion.project(endpoint(motion.handCenter, f, false)),
      directedAngle: Math.atan2(-dy, dx) * 180 / Math.PI,
      acuteAngle: Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI,
      capFacing: new THREE.Vector3(0, 1, 0).applyQuaternion(f.rotation)
        .dot(endpoint(motion.handEnd, f)),
      base: [0, 1, 3, 2].map(i => motion.project(endpoint(motion.baseCorners[i], f))),
      sweep: f.sweepDegrees,
      twist: f.twistDegrees,
    };
  }
  function surfaces(t) {
    const f = motion.sample(t);
    const center = motion.baseCenter.clone().lerp(motion.handEnd, 0.5);
    const half = [ARM_CONFIG.view.thickness.width * ARM_CONFIG.scale / 2,
      (motion.handEnd.y - motion.baseCenter.y) / 2,
      ARM_CONFIG.view.thickness.depth * ARM_CONFIG.scale / 2];
    const faceAreas = [0, 0, 0];
    const boundary = [];
    const visible = new Set();
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
      const normal = new THREE.Vector3().setComponent(axis, sign).applyQuaternion(f.rotation);
      const localCenter = center.clone().setComponent(axis, center.getComponent(axis) + sign * half[axis]);
      if (normal.dot(endpoint(localCenter, f)) >= 0) continue;
      visible.add(`${axis}:${sign}`);
      const others = [0, 1, 2].filter(i => i !== axis);
      const polygon = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(signs => {
        const p = localCenter.clone();
        others.forEach((a, i) => p.setComponent(a,
          p.getComponent(a) + signs[i] * half[a]));
        return motion.project(endpoint(p, f));
      });
      const clipped = clipToViewport(polygon);
      faceAreas[axis] += area(clipped);
      boundary.push(...clipped);
    }
    const edges = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      if (!visible.has(`0:${x}`) && !visible.has(`2:${z}`)) continue;
      const a = motion.project(endpoint(motion.baseCenter.clone().add(new THREE.Vector3(x * half[0], 0, z * half[2])), f));
      const b = motion.project(endpoint(motion.handEnd.clone().add(new THREE.Vector3(x * half[0], 0, z * half[2])), f));
      edges.push(round(Math.atan2(Math.abs((b.y - a.y) * height), Math.abs((b.x - a.x) * width)) * 180 / Math.PI));
    }
    // Thickness is measured perpendicular to the arm, halfway along its visible
    // length. A diagonal arm's horizontal bounding box is not its thickness.
    const base = motion.project(endpoint(motion.baseCenter, f));
    const tip = motion.project(endpoint(motion.handEnd, f));
    const dx = (tip.x - base.x) * width, dy = (tip.y - base.y) * height;
    const axisLength = Math.hypot(dx, dy);
    const alongX = dx / axisLength, alongY = dy / axisLength;
    const crossSection = boundary.map(p => ({
      u: p.x * width * alongX + p.y * height * alongY,
      v: -p.x * width * alongY + p.y * height * alongX,
    }));
    const middleU = (Math.min(...crossSection.map(p => p.u)) +
      Math.max(...crossSection.map(p => p.u))) / 2;
    // Intersect chords across the convex, viewport-clipped silhouette.
    const crossHits = [];
    for (let i = 0; i < crossSection.length; i++) {
      for (let j = i + 1; j < crossSection.length; j++) {
        const a = crossSection[i], b = crossSection[j];
        if (Math.abs(a.u - b.u) < 1e-9 || (a.u - middleU) * (b.u - middleU) > 0) continue;
        crossHits.push(a.v + (b.v - a.v) * (middleU - a.u) / (b.u - a.u));
      }
    }
    // All chords stay inside the convex silhouette; the extremes lie on its edges.
    const normalWidth = crossHits.length ? Math.max(...crossHits) - Math.min(...crossHits) : 0;
    return {
      visibleAreaPercent: round(faceAreas.reduce((sum, value) => sum + value, 0) * 100),
      midVisibleWidthPercentHeight: round(normalWidth / height * 100),
      midVisibleWidthPercentWidth: round(normalWidth / width * 100),
      sidePercent: round(faceAreas[0] / (faceAreas[0] + faceAreas[2]) * 100),
      capAreaPx: round(faceAreas[1] * width * height),
      visibleLongEdgeAngles: edges.sort((a, b) => a - b),
    };
  }
  const idle = snapshot(0), middle = snapshot(1 / 36), peak = snapshot(0.25), returning = snapshot(0.5);
  let maxBaseArea = 0, minCapFacing = Infinity, arcDeviation = 0;
  let highestTip = { ...idle.tipUpper, progress: 0 };
  const chord = { x: (peak.hand.x - idle.hand.x) * width,
    y: (peak.hand.y - idle.hand.y) * height };
  for (let i = 0; i <= 1000; i++) {
    const s = snapshot(i / 1000);
    if (s.tipUpper && s.tipUpper.y < highestTip.y) highestTip = { ...s.tipUpper, progress: i / 1000 };
    maxBaseArea = Math.max(maxBaseArea, area(clipToViewport(s.base)));
    minCapFacing = Math.min(minCapFacing, s.capFacing);
    if (i <= 250) {
      const x = (s.hand.x - idle.hand.x) * width, y = (s.hand.y - idle.hand.y) * height;
      arcDeviation = Math.max(arcDeviation,
        Math.abs(x * chord.y - y * chord.x) / Math.hypot(chord.x, chord.y));
    }
  }
  const percent = p => ({ x: round(p.x * 100), y: round(p.y * 100) });
  const pixels = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
  return {
    viewport: `${width}x${height}`,
    idleAngle: round(idle.acuteAngle), middleAngle: round(middle.acuteAngle),
    peakAngle: round(peak.acuteAngle), returningAngle: round(returning.acuteAngle),
    idleHandPercent: percent(idle.hand), middleHandPercent: percent(middle.hand), peakHandPercent: percent(peak.hand),
    idleTipCenterPercent: percent(idle.tipCenter), peakTipCenterPercent: percent(peak.tipCenter),
    idleTipUpperPercent: idle.tipUpper && percent(idle.tipUpper),
    middleTipUpperPercent: middle.tipUpper && percent(middle.tipUpper),
    peakTipUpperPercent: peak.tipUpper && percent(peak.tipUpper),
    highestTipDuringSwing: { ...percent(highestTip), progress: highestTip.progress },
    idlePivotPercent: percent(idle.pivot), peakPivotPercent: percent(peak.pivot),
    sweepRotationDegrees: round(peak.sweep),
    rotationDisplacementPx: round(pixels(idle.hand, peak.rotationOnly)),
    translationDisplacementPx: round(pixels(peak.rotationOnly, peak.hand)),
    arcDeviationPx: round(arcDeviation),
    idleSurfaces: surfaces(0), middleSurfaces: surfaces(1 / 36), peakSurfaces: surfaces(.25),
    maxVisibleBaseAreaPx: round(maxBaseArea * width * height, 6),
    minTopCapFacing: round(minCapFacing, 6),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify([
    report(1280, 960), report(1440, 900), report(1600, 900), report(2100, 900),
  ], null, 2));
}
