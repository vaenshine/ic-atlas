import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function material(color: string, metalness = 0, roughness = 0.6) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
export function box(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: THREE.Material,
  r = 0.02,
) {
  const geometry =
    r > 0
      ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3))
      : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
export function cylinder(
  g: THREE.Group,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  m: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
export function trace(
  g: THREE.Group,
  points: number[][],
  color: string | number = '#638658',
  width = 0.012,
) {
  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < points.length; i++)
    curve.add(
      new THREE.LineCurve3(
        new THREE.Vector3(...(points[i - 1] as [number, number, number])),
        new THREE.Vector3(...(points[i] as [number, number, number])),
      ),
    );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      curve,
      Math.max(points.length * 2, 8),
      width,
      4,
      false,
    ),
    material(String(color), 0.55, 0.48),
  );
  g.add(mesh);
  return mesh;
}
export function label(
  g: THREE.Group,
  text: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  color = '#c4c8c3',
  bg?: string,
  rotation = 0,
) {
  const c = document.createElement('canvas');
  c.width = w < 0.7 ? 128 : w < 1.5 ? 256 : 512;
  c.height = c.width / 2;
  const ctx = c.getContext('2d')!;
  ctx.scale(c.width / 768, c.height / 384);
  ctx.clearRect(0, 0, 768, 384);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 384);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const fs = Math.min(
    80,
    (650 / Math.max(...lines.map((l) => l.length))) * 1.55,
  );
  ctx.font = `500 ${fs}px "Courier New",monospace`;
  lines.forEach((s, i) =>
    ctx.fillText(s, 384, 192 + (i - (lines.length - 1) / 2) * (fs * 1.45)),
  );
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  mesh.rotation.set(-Math.PI / 2, 0, rotation);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
export function movable(parent: THREE.Group, y: number, amount: number) {
  const g = new THREE.Group();
  g.position.y = y;
  g.userData.explode = amount;
  g.userData.baseY = y;
  parent.add(g);
  return g;
}
export function pad(
  g: THREE.Group,
  x: number,
  z: number,
  y: number,
  gold: THREE.Material,
  r = 0.1,
) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 7, 18), gold);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
export function pcb(
  g: THREE.Group,
  w: number,
  d: number,
  m: THREE.Material,
  holes: number[][] = [],
) {
  const r = 0.13,
    s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  s.lineTo(w / 2, d / 2 - r);
  s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  s.lineTo(-w / 2 + r, d / 2);
  s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  s.lineTo(-w / 2, -d / 2 + r);
  s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  holes.forEach(([x, z, radius]) => {
    const hole = new THREE.Path();
    hole.absarc(x, -z, radius, 0, Math.PI * 2, true);
    s.holes.push(hole);
  });
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.13,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, m);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  g.add(mesh);
}
