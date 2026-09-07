import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Part } from './catalog';

export type Marker = { label: string; point: THREE.Vector3; explode?: number };
export type Model = { group: THREE.Group; markers: Marker[] };
const dark = '#26282c';
function material(color: string, metalness = 0, roughness = 0.6) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
function box(
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
function cylinder(
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
function trace(
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
function label(
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
function movable(parent: THREE.Group, y: number, amount: number) {
  const g = new THREE.Group();
  g.position.y = y;
  g.userData.explode = amount;
  g.userData.baseY = y;
  parent.add(g);
  return g;
}
function pad(
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
function pcb(
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
function smd(
  g: THREE.Group,
  x: number,
  z: number,
  rotation = 0,
  type = 'resistor',
) {
  const small = new THREE.Group();
  small.position.set(x, 0.13, z);
  small.rotation.y = rotation;
  g.add(small);
  const solder = material('#bfc7c9', 0.85, 0.23);
  box(
    small,
    0.11,
    0.065,
    0.24,
    0,
    0.04,
    0,
    material(type === 'capacitor' ? '#b4a079' : '#232429'),
    0.008,
  );
  box(small, 0.12, 0.07, 0.055, 0, 0.04, -0.098, solder, 0.006);
  box(small, 0.12, 0.07, 0.055, 0, 0.04, 0.098, solder, 0.006);
  return small;
}
function tinyChip(
  g: THREE.Group,
  x: number,
  z: number,
  w = 0.5,
  d = 0.7,
  pins = 8,
) {
  const t = new THREE.Group();
  t.position.set(x, 0.14, z);
  g.add(t);
  const silver = material('#abb3b8', 0.8, 0.3);
  box(t, w, 0.11, d, 0, 0.12, 0, material('#232528'), 0.02);
  for (let side of [-1, 1])
    for (let i = 0; i < pins / 2; i++)
      box(
        t,
        0.16,
        0.045,
        0.065,
        side * (w / 2 + 0.035),
        0.025,
        (i - (pins / 2 - 1) / 2) * (d / (pins / 2)),
        silver,
        0.005,
      );
  cylinder(t, 0.022, 0.008, -w * 0.32, 0.18, -d * 0.3, material('#7a8586'));
  return t;
}
function usb(g: THREE.Group, x: number, z: number, large = false) {
  const u = movable(g, 0, 0.25);
  u.position.x = x;
  u.position.z = z;
  const w = large ? 0.95 : 0.82,
    h = large ? 0.55 : 0.32,
    d = large ? 0.85 : 0.53,
    silver = material('#b9c1c7', 0.88, 0.24);
  box(u, w, 0.055, d, 0, 0.2, 0, silver);
  box(u, w, 0.055, d, 0, 0.2 + h, 0, silver);
  box(u, 0.05, h, d, -w / 2, 0.2 + h / 2, 0, silver);
  box(u, 0.05, h, d, w / 2, 0.2 + h / 2, 0, silver);
  box(
    u,
    w - 0.04,
    h - 0.04,
    0.06,
    0,
    0.2 + h / 2,
    -d / 2 + 0.03,
    material('#15181d'),
  );
  box(
    u,
    w * 0.72,
    0.06,
    d * 0.75,
    0,
    0.2 + h * 0.45,
    0.03,
    material('#303339'),
  );
  for (let i = 0; i < 5; i++)
    box(
      u,
      0.045,
      0.012,
      0.24,
      (i - 2) * 0.105,
      0.24 + h * 0.45,
      0.075,
      material('#d3b86c', 0.8, 0.28),
      0,
    );
  for (let side of [-1, 1])
    box(u, 0.11, 0.05, 0.18, (side * w) / 2, 0.16, -0.08, silver);
  return u;
}
function shieldModule(g: THREE.Group, z = 0) {
  const mod = movable(g, 0.15, 0.58);
  mod.position.z = z;
  const gold = material('#d1b575', 0.8, 0.3);
  pcb(mod, 1.93, 2.95, material('#26352b', 0.28, 0.65));
  for (let i = 0; i < 10; i++)
    box(mod, 0.1, 0.028, 0.085, (i - 4.5) * 0.17, 0.145, 1.46, gold, 0.009);
  for (let i = 0; i < 14; i++)
    for (let side of [-1, 1])
      box(
        mod,
        0.09,
        0.028,
        0.105,
        side * 0.95,
        0.145,
        (i - 6.5) * 0.155 + 0.23,
        gold,
        0.009,
      );
  // Printed inverted-F antenna, kept outside the shield's footprint.
  trace(
    mod,
    [
      [-0.72, 0.147, -1.27],
      [-0.72, 0.147, -0.93],
      [-0.44, 0.147, -0.93],
      [-0.44, 0.147, -1.28],
      [-0.14, 0.147, -1.28],
      [-0.14, 0.147, -0.93],
      [0.14, 0.147, -0.93],
      [0.14, 0.147, -1.28],
      [0.46, 0.147, -1.28],
      [0.46, 0.147, -0.87],
      [0.72, 0.147, -0.87],
      [0.72, 0.147, -1.31],
    ],
    '#c6b073',
    0.032,
  );
  trace(
    mod,
    [
      [-0.72, 0.147, -0.93],
      [-0.72, 0.147, -0.68],
      [-0.12, 0.147, -0.68],
      [-0.12, 0.147, -0.48],
    ],
    '#c6b073',
    0.019,
  );
  tinyChip(mod, 0, 0.26, 0.86, 0.94, 24);
  for (let i = 0; i < 8; i++)
    smd(
      mod,
      (i % 2 === 0 ? -1 : 1) * 0.63,
      0.55 - Math.floor(i / 2) * 0.28,
      0,
      i % 2 ? 'capacitor' : 'resistor',
    );
  box(mod, 0.29, 0.1, 0.46, 0.53, 0.22, 1.03, material('#c2c3b9', 0.75, 0.35));
  const lid = movable(mod, 0, 1.7);
  const silver = material('#a5aeb3', 0.86, 0.28);
  box(lid, 1.8, 0.045, 2.05, 0, 0.42, 0.32, silver, 0.03);
  for (let side of [-1, 1])
    box(lid, 0.035, 0.28, 2.05, side * 0.883, 0.28, 0.32, silver, 0.01);
  box(lid, 1.8, 0.28, 0.035, 0, 0.28, 1.33, silver, 0.01);
  box(lid, 1.8, 0.28, 0.035, 0, 0.28, -0.69, silver, 0.01);
  label(
    lid,
    'ESPRESSIF\nESP32-WROOM-32E\nWi-Fi  +  BT',
    0,
    0.446,
    0.19,
    1.57,
    0.85,
    '#4e565c',
  );
  label(lid, 'FCC   CE   RoHS', 0, 0.447, 0.95, 1.2, 0.3, '#687179');
  return mod;
}
function board(part: Part): Model {
  const g = new THREE.Group(),
    markers: Marker[] = [];
  const gold = material('#d8b77b', 0.82, 0.28),
    plastic = material('#202329', 0.1, 0.46);
  const isUno = part.shape === 'uno',
    isPico = part.shape === 'pico',
    isSensor = part.shape === 'sensor',
    isRadio = part.shape === 'radio';
  const w = isUno ? 4.2 : isPico ? 2 : isSensor ? 2.3 : isRadio ? 2 : 3.12,
    d = isUno ? 5.5 : isSensor ? 2.8 : isRadio ? 3.8 : 5.85;
  const pinCount = isSensor ? 8 : isRadio ? 4 : isPico ? 20 : 19;
  const rowPitch = isPico ? 0.265 : isSensor ? 0.48 : isRadio ? 0.35 : 0.285;
  const holes: number[][] = [];
  if (!isUno && !isSensor && !isRadio)
    for (let side of [-1, 1])
      for (let i = 0; i < pinCount; i++)
        holes.push([
          side * (w / 2 - 0.2),
          (i - (pinCount - 1) / 2) * rowPitch,
          0.053,
        ]);
  if (isSensor)
    for (let i = 0; i < 8; i++) holes.push([(i - 3.5) * 0.25, 1.15, 0.053]);
  if (isRadio)
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 4; i++)
        holes.push([(i - 1.5) * 0.35, 1.28 + row * 0.3, 0.053]);
  for (let side of [-1, 1])
    for (let end of [-1, 1])
      if (!isPico)
        holes.push([side * (w / 2 - 0.36), end * (d / 2 - 0.24), 0.1]);
  pcb(
    g,
    w,
    d,
    material(
      isUno ? '#086e84' : isPico ? '#217d59' : isSensor ? '#1966a3' : '#1e3632',
      0.2,
      0.5,
    ),
    holes,
  );
  // Routing is an illustrative learning layer; each trace has discrete chamfered turns.
  for (let side of [-1, 1])
    for (let i = 0; i < (isSensor ? 6 : 16); i++) {
      const zz = (i - 7.5) * 0.28,
        xx = side * (w / 2 - 0.23);
      if (Math.abs(zz) > d / 2 - 0.2) continue;
      trace(
        g,
        [
          [xx, 0.143, zz],
          [side * (w / 2 - 0.49), 0.143, zz],
          [side * (w / 2 - 0.66), 0.143, zz + 0.12],
          [side * (0.27 + (i % 3) * 0.14), 0.143, zz + 0.12],
          [side * (0.27 + (i % 3) * 0.14), 0.143, zz + (i % 2 ? 0.28 : -0.14)],
        ],
        isUno ? '#479896' : isSensor ? '#3988b0' : '#4b7262',
        0.009,
      );
    }
  for (let side of isSensor ? [0] : [-1, 1]) {
    const header = movable(g, 0, -0.65);
    const count = isUno ? 14 : pinCount;
    for (let i = 0; i < count; i++) {
      const z = isSensor
          ? 1.15
          : isRadio
            ? 1.28 + (side === 1 ? 0.3 : 0)
            : (i - (count - 1) / 2) * (isUno ? 0.31 : rowPitch),
        x = isSensor
          ? (i - 3.5) * 0.25
          : isRadio
            ? (i - 1.5) * 0.35
            : side * (w / 2 - 0.2);
      if (isUno) {
        box(header, 0.25, 0.37, 0.27, x, 0.3, z, plastic);
        box(header, 0.1, 0.012, 0.1, x, 0.491, z, material('#080a0c'), 0);
      } else {
        pad(g, x, z, 0.14, gold, 0.084);
        box(header, 0.18, 0.17, 0.19, x, -0.12, z, plastic, 0.012);
        box(header, 0.043, 0.64, 0.043, x, -0.28, z, gold, 0.008);
        box(header, 0.05, 0.17, 0.05, x, 0.21, z, gold, 0.005);
      }
      if (i % 2 === 0 && !isUno && !isSensor && !isRadio)
        label(
          g,
          isPico
            ? String(side === -1 ? i + 1 : 40 - i)
            : [
                '3V3',
                'EN',
                'VP',
                'VN',
                '34',
                '35',
                '32',
                '33',
                '25',
                '26',
                '27',
                '14',
                '12',
                'GND',
                '13',
                'D2',
                'D3',
                'CMD',
                '5V',
              ][i] || 'IO',
          side * (w / 2 - 0.42),
          0.148,
          z,
          0.2,
          0.1,
          '#c0cdc0',
          side === 1 ? undefined : undefined,
          side === 1 ? Math.PI / 2 : -Math.PI / 2,
        );
    }
  }
  for (let side of [-1, 1])
    for (let end of [-1, 1])
      if (!isPico)
        pad(g, side * (w / 2 - 0.36), end * (d / 2 - 0.24), 0.144, gold, 0.13);
  if (isSensor) {
    const sensorCore = movable(g, 0, 1);
    box(sensorCore, 0.75, 0.18, 0.75, 0, 0.25, -0.25, plastic, 0.03);
    label(sensorCore, 'MPU\n6050', 0, 0.346, -0.25, 0.65, 0.55);
    for (let i = 0; i < 9; i++)
      smd(
        g,
        ((i % 3) - 1) * 0.55,
        0.55 + Math.floor(i / 3) * 0.29,
        Math.PI / 2,
        i % 2 ? 'capacitor' : 'resistor',
      );
    label(g, 'GY-521', 0, 0.15, -1.04, 1.3, 0.35, '#e3ebf3');
    markers.push(
      {
        label: '六轴惯性传感器',
        point: new THREE.Vector3(0, 0.55, -0.5),
        explode: 1,
      },
      { label: 'I²C 接口排针', point: new THREE.Vector3(-1, 0.1, 0.8) },
    );
  } else if (isPico) {
    const chip = movable(g, 0, 1.2);
    box(chip, 0.75, 0.12, 0.75, 0, 0.24, -0.15, plastic, 0.022);
    label(chip, 'RP2\n2040', 0, 0.309, -0.15, 0.66, 0.6);
    usb(g, 0, -2.66).rotation.y = Math.PI;
    for (let i = 0; i < 17; i++)
      smd(
        g,
        ((i % 2) * 2 - 1) * 0.52,
        1.9 - Math.floor(i / 2) * 0.43,
        Math.PI / 2,
        i % 3 ? 'capacitor' : 'resistor',
      );
    tinyChip(g, 0, 0.85, 0.4, 0.48, 8);
    label(g, 'Raspberry Pi\nPico', 0, 0.15, 1.78, 1.05, 0.62, '#e6f4e6');
    box(g, 0.36, 0.18, 0.3, 0.37, 0.23, -1.78, material('#e0dfd1'));
    markers.push(
      {
        label: 'RP2040 主控',
        point: new THREE.Vector3(0, 0.75, -0.15),
        explode: 1.2,
      },
      { label: 'USB 接口', point: new THREE.Vector3(0, 0.5, -2.7) },
      { label: '板边半孔焊盘', point: new THREE.Vector3(0.92, 0.15, 1.65) },
    );
  } else if (isUno) {
    const main = movable(g, 0, 1.1);
    box(main, 0.72, 0.27, 2.6, 0.7, 0.33, 0.5, plastic, 0.06);
    for (let side of [-1, 1])
      for (let i = 0; i < 14; i++)
        box(
          main,
          0.23,
          0.05,
          0.1,
          0.7 + side * 0.42,
          0.18,
          0.5 + (i - 6.5) * 0.175,
          gold,
          0.01,
        );
    label(
      main,
      'ATMEL\nATMEGA328P',
      0.7,
      0.47,
      0.5,
      0.66,
      1.8,
      '#b2bcb9',
      undefined,
      Math.PI / 2,
    );
    usb(g, -1.08, -2.5, true).rotation.y = Math.PI;
    const jack = cylinder(g, 0.25, 0.9, 1.2, 0.41, -2.34, plastic);
    jack.rotation.x = Math.PI / 2;
    box(g, 0.64, 0.4, 0.8, 1.2, 0.35, -2.16, plastic);
    for (let i = 0; i < 2; i++)
      cylinder(
        g,
        0.18,
        0.5,
        -0.4 + i * 0.46,
        0.4,
        -1.68,
        material('#abb4b9', 0.6, 0.3),
      );
    for (let i = 0; i < 13; i++)
      smd(
        g,
        -0.8 + (i % 2) * 0.4,
        1.3 - Math.floor(i / 2) * 0.43,
        Math.PI / 2,
        i % 3 ? 'capacitor' : 'resistor',
      );
    label(g, 'ARDUINO\nUNO', -1, 0.15, 0.2, 1, 0.9, '#e1edeb');
    tinyChip(g, -1, -1.1, 0.56, 0.65, 16);
    markers.push(
      {
        label: 'ATmega328P',
        point: new THREE.Vector3(0.7, 0.85, 0.5),
        explode: 1.1,
      },
      { label: 'USB Type-B', point: new THREE.Vector3(-1.08, 0.8, -2.5) },
      { label: '数字 / 模拟接口', point: new THREE.Vector3(1.92, 0.7, 0.3) },
    );
  } else if (isRadio) {
    const radioCore = tinyChip(g, 0, 0.55, 0.65, 0.7, 20);
    radioCore.userData.baseY = 0.14;
    radioCore.userData.explode = 1;
    for (let i = 0; i < 6; i++)
      smd(
        g,
        ((i % 2) - 0.5) * 0.9,
        -0.1 - Math.floor(i / 2) * 0.3,
        0,
        'capacitor',
      );
    trace(
      g,
      [
        [-0.72, 0.15, -0.93],
        [-0.72, 0.15, -1.59],
        [-0.43, 0.15, -1.59],
        [-0.43, 0.15, -1.11],
        [-0.13, 0.15, -1.11],
        [-0.13, 0.15, -1.59],
        [0.2, 0.15, -1.59],
        [0.2, 0.15, -1.11],
        [0.58, 0.15, -1.11],
        [0.58, 0.15, -1.62],
      ],
      '#d0b269',
      0.03,
    );
    label(g, 'nRF24L01+', 0, 0.15, 1.05, 1.1, 0.3);
    markers.push(
      { label: '2.4 GHz 印制天线', point: new THREE.Vector3(0, 0.4, -1.4) },
      {
        label: '无线收发芯片',
        point: new THREE.Vector3(0, 0.55, 0.55),
        explode: 1,
      },
    );
  } else {
    shieldModule(g, -1.05);
    usb(g, 0, 2.75);
    tinyChip(g, 0, 1.23, 0.6, 0.8, 16);
    tinyChip(g, -0.82, 0.72, 0.28, 0.45, 6);
    for (let i = 0; i < 16; i++)
      smd(
        g,
        ((i % 2) * 2 - 1) * (0.47 + (i % 4 > 1 ? 0.24 : 0)),
        0.9 + Math.floor(i / 2) * 0.19,
        Math.PI / 2,
        i % 3 ? 'capacitor' : 'resistor',
      );
    for (let side of [-1, 1]) {
      box(
        g,
        0.4,
        0.1,
        0.46,
        side * 0.9,
        0.23,
        2.36,
        material('#bcc1bf', 0.7, 0.35),
      );
      cylinder(g, 0.12, 0.12, side * 0.9, 0.33, 2.36, plastic);
      label(
        g,
        side < 0 ? 'EN' : 'BOOT',
        side * 0.88,
        0.148,
        1.99,
        0.4,
        0.22,
        '#c6d7cc',
      );
    }
    const led = material('#aaf47c', 0.1, 0.2);
    led.emissive = new THREE.Color('#82da4c');
    led.emissiveIntensity = 0.8;
    box(g, 0.1, 0.08, 0.16, -0.67, 0.2, 1.85, led);
    label(g, 'ESP32 DevKitC', 0, 0.149, 0.65, 1.5, 0.23, '#c1d2c7');
    markers.push(
      {
        label: 'PCB 印制天线',
        point: new THREE.Vector3(0, 0.58, -2.75),
        explode: 0.58,
      },
      {
        label: 'ESP32 无线模组',
        point: new THREE.Vector3(0.93, 0.95, -0.5),
        explode: 1.8,
      },
      { label: 'Micro USB', point: new THREE.Vector3(0, 0.45, 2.95) },
    );
  }
  // Small copper vias, silkscreen component designators, and a back-side board label.
  for (let i = 0; i < 16; i++) {
    const x = Math.sin(i * 7.3) * (w / 2 - 0.48),
      z = Math.cos(i * 4.7) * (d / 2 - 0.35);
    pad(g, x, z, 0.142, gold, 0.027);
  }
  label(
    g,
    isPico
      ? '© Raspberry Pi'
      : isUno
        ? 'UNO REV3'
        : isSensor
          ? 'SCL   SDA   XDA   XCL'
          : 'OPEN HARDWARE',
    0,
    0.151,
    d / 2 - 0.47,
    w * 0.57,
    0.18,
    '#9eaFA4',
  );
  return { group: g, markers };
}
export function createModel(part: Part): Model {
  if (['devkit', 'uno', 'pico', 'sensor', 'radio'].includes(part.shape))
    return board(part);
  const g = new THREE.Group(),
    markers: Marker[] = [];
  const silver = material('#b7bfc7', 0.88, 0.28),
    gold = material('#d8b56c', 0.8, 0.28),
    plastic = material(dark, 0.04, 0.62);
  if (part.shape === 'wroom') {
    shieldModule(g, 0);
    return {
      group: g,
      markers: [
        {
          label: 'PCB 天线',
          point: new THREE.Vector3(0, 0.6, -1.3),
          explode: 0.58,
        },
        {
          label: '金属屏蔽罩',
          point: new THREE.Vector3(0.5, 0.8, 0.45),
          explode: 2.28,
        },
        {
          label: '模组焊接触点',
          point: new THREE.Vector3(-1.04, 0.2, 0.6),
          explode: 0.58,
        },
      ],
    };
  }
  if (part.shape === 'to220') {
    const shape = new THREE.Shape();
    shape.moveTo(-0.85, -1.05);
    shape.lineTo(0.85, -1.05);
    shape.lineTo(0.85, 1.5);
    shape.lineTo(-0.85, 1.5);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 1.04, 0.21, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.07,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    const tab = new THREE.Mesh(geo, silver);
    g.add(tab);
    tab.castShadow = true;
    const shell = movable(g, 0, 1.3);
    box(shell, 1.82, 0.55, 1.7, 0, 0.34, 0.28, plastic, 0.06);
    label(shell, part.name + '\nST  5V', 0, 0.62, 0.3, 1.45, 0.98);
    for (let i = 0; i < 3; i++)
      box(g, 0.17, 0.1, 1.7, (i - 1) * 0.55, 0.1, 1.9, silver, 0.012);
    box(g, 0.5, 0.06, 0.5, 0, 0.09, 0.15, material('#577f96', 0.7, 0.15));
    markers.push(
      { label: '散热片与安装孔', point: new THREE.Vector3(0, 0.1, -1.3) },
      { label: '3 个连接引脚', point: new THREE.Vector3(0.65, 0.2, 2.45) },
    );
    return { group: g, markers };
  }
  const dip = part.shape === 'dip',
    sop = ['soic', 'tssop', 'sot23'].includes(part.shape),
    qfn = part.shape === 'qfn',
    bga = part.shape === 'bga',
    sot = part.shape === 'sot223';
  const rows = dip || sop ? Math.ceil(part.pins / 2) : part.pins / 4;
  const pitch = dip ? 0.28 : part.shape === 'tssop' ? 0.16 : 0.21;
  const w = dip
    ? 1.05
    : sop
      ? part.id === 'ds3231' || part.id === 'w25q'
        ? 1.25
        : 1.12
      : sot
        ? 1.8
        : bga
          ? 2.45
          : Math.max(1.6, rows * 0.15 + 0.2);
  const d =
    dip || sop ? Math.max(1.12, (rows - 1) * pitch + 0.42) : sot ? 1.15 : w;
  const h = dip ? 0.53 : 0.3;
  const baseY = dip ? 0.15 : 0.12;
  box(g, w, 0.07, d, 0, baseY, 0, plastic, 0.035);
  const cap = movable(g, 0, 1.3);
  box(cap, w, h, d, 0, baseY + h / 2 + 0.035, 0, plastic, 0.045);
  label(
    cap,
    part.name +
      '\n' +
      (dip
        ? 'THAILAND  26W'
        : bga
          ? 'BGA  ·  TOP'
          : part.kind === 'mcu'
            ? '2609   ARM'
            : '2609  LOT A'),
    0,
    baseY + h + 0.038,
    0,
    w * 0.84,
    d * 0.65,
    '#a6adb0',
  );
  cylinder(
    cap,
    0.065,
    0.008,
    -w / 2 + 0.18,
    baseY + h + 0.041,
    -d / 2 + 0.18,
    material('#b7b8a9', 0.2, 0.7),
  );
  if (dip) {
    // Semicircular orientation notch, embossed on the top-facing end.
    const notch = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.16,
        0.16,
        0.01,
        24,
        1,
        false,
        Math.PI / 2,
        Math.PI,
      ),
      material('#0e1116'),
    );
    notch.position.set(0, baseY + h + 0.041, -d / 2 + 0.016);
    cap.add(notch);
  }
  const pinTip = (x: number, z: number, n: number, side: number) => {
    const lead = new THREE.Group();
    lead.position.set(x, 0, z);
    lead.rotation.y = side;
    g.add(lead);
    if (dip) {
      box(lead, 0.28, 0.07, 0.11, 0.1, 0.3, 0, silver, 0.012);
      box(lead, 0.075, 0.62, 0.1, 0.245, 0.015, 0, silver, 0.01);
    } else if (qfn) {
      box(lead, 0.18, 0.085, 0.085, -0.05, 0.08, 0, silver, 0.006);
    } else {
      box(lead, 0.17, 0.048, 0.085, 0.067, 0.23, 0, silver, 0.008);
      const slant = box(lead, 0.19, 0.04, 0.085, 0.2, 0.15, 0, silver, 0.007);
      slant.rotation.z = -0.7;
      box(lead, 0.17, 0.045, 0.085, 0.32, 0.083, 0, silver, 0.008);
    }
    lead.userData.pin = n;
  };
  if (bga) {
    const ball = new THREE.SphereGeometry(0.059, 10, 8);
    const balls = new THREE.InstancedMesh(ball, silver, 324),
      matrix = new THREE.Matrix4();
    for (let i = 0; i < 18; i++)
      for (let j = 0; j < 18; j++) {
        matrix.makeTranslation((i - 8.5) * 0.127, 0.018, (j - 8.5) * 0.127);
        balls.setMatrixAt(i * 18 + j, matrix);
      }
    balls.instanceMatrix.needsUpdate = true;
    balls.userData.balls = 324;
    g.add(balls);
    box(
      g,
      w * 0.97,
      0.09,
      d * 0.97,
      0,
      0.09,
      0,
      material('#2b6954', 0.1, 0.65),
    );
  } else if (sot) {
    for (let i = 0; i < 3; i++)
      box(g, 0.22, 0.07, 0.59, (i - 1) * 0.62, 0.08, 0.8, silver, 0.01);
    box(g, 1, 0.08, 0.69, 0, 0.08, -0.8, silver, 0.01);
  } else if (dip || sop) {
    for (let i = 0; i < rows; i++) {
      const z = (i - (rows - 1) / 2) * pitch;
      pinTip(-w / 2, z, i + 1, Math.PI);
      if (i < Math.floor(part.pins / 2)) {
        const rz =
          part.pins % 2
            ? i === 0
              ? (-(rows - 1) / 2) * pitch
              : ((rows - 1) / 2) * pitch
            : z;
        pinTip(w / 2, rz, part.pins - i, 0);
      }
    }
  } else {
    for (let i = 0; i < rows; i++) {
      const a = (i - (rows - 1) / 2) * (w / (rows + 1));
      pinTip(-w / 2, a, i + 1, Math.PI);
      pinTip(a, d / 2, rows + i + 1, -Math.PI / 2);
      pinTip(w / 2, -a, 2 * rows + i + 1, 0);
      pinTip(-a, -d / 2, 3 * rows + i + 1, Math.PI / 2);
    }
    if (qfn) box(g, w * 0.57, 0.06, d * 0.57, 0, 0.04, 0, silver, 0.008);
  }
  if (part.id === 'drv8833')
    box(g, w * 0.57, 0.06, d * 0.57, 0, 0.04, 0, silver, 0.008);
  if (part.id === 'pc817') {
    const optical = movable(g, 0, 0.35);
    box(
      optical,
      0.28,
      0.1,
      0.32,
      -0.27,
      baseY + 0.13,
      0,
      material('#bb5353'),
      0.02,
    );
    box(
      optical,
      0.28,
      0.1,
      0.32,
      0.27,
      baseY + 0.13,
      0,
      material('#435d89'),
      0.02,
    );
    trace(
      optical,
      [
        [-0.12, baseY + 0.18, 0],
        [0.12, baseY + 0.18, 0],
      ],
      '#c4f582',
      0.012,
    );
    return {
      group: g,
      markers: [
        {
          label: '输入 LED',
          point: new THREE.Vector3(-0.5, 0.6, -0.2),
          explode: 0.35,
        },
        {
          label: '输出光电晶体管',
          point: new THREE.Vector3(0.5, 0.6, 0.2),
          explode: 0.35,
        },
      ],
    };
  }
  const die = movable(g, 0, 0.36);
  const dieW = Math.min(w * 0.52, 0.9),
    dieD = Math.min(d * 0.4, 0.95);
  box(
    die,
    dieW,
    0.025,
    dieD,
    0,
    baseY + 0.08,
    0,
    material('#4c8195', 0.77, 0.19),
    0.008,
  );
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 5; j++)
      box(
        die,
        dieW / 9,
        0.008,
        dieD / 7,
        ((i - 3) * dieW) / 8,
        baseY + 0.096,
        ((j - 2) * dieD) / 6,
        material((i + j) % 2 ? '#6b9aab' : '#9285a2', 0.68, 0.32),
        0,
      );
  for (let side of [-1, 1])
    for (let i = 0; i < Math.min(rows, 10); i++) {
      const zz =
        (i - (Math.min(rows, 10) - 1) / 2) *
        Math.min(0.1, dieD / Math.min(rows, 10));
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * dieW * 0.47, baseY + 0.09, zz),
        new THREE.Vector3(side * w * 0.43, baseY + 0.36, zz * 1.6),
        new THREE.Vector3(side * w * 0.47, baseY + 0.045, zz * 2),
      );
      die.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 12, 0.007, 4, false),
          gold,
        ),
      );
    }
  markers.push(
    {
      label: dip ? '1 脚定位缺口' : '1 脚定位圆点',
      point: new THREE.Vector3(-w / 2 + 0.18, baseY + h + 0.18, -d / 2 + 0.18),
      explode: 1.3,
    },
    {
      label: bga
        ? '底面焊球阵列'
        : qfn
          ? '底面焊盘'
          : sot
            ? '散热端子'
            : dip
              ? '直插引脚'
              : '海鸥翼引脚',
      point: new THREE.Vector3(w / 2 + 0.4, 0.1, d / 3),
    },
  );
  return { group: g, markers };
}
export function disposeGroup(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  group.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        materials.add(m);
        Object.values(m).forEach((v) => {
          if (v instanceof THREE.Texture) textures.add(v);
        });
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}

// Flatten static exhibition geometry by material to keep the multi-model scene responsive.
export function optimizeExhibit(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const batches = new Map<
    string,
    {
      geometry: THREE.BufferGeometry[];
      material: THREE.Material;
      meshes: THREE.Mesh[];
    }
  >();
  group.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    const m = object.material;
    if (!(m instanceof THREE.MeshStandardMaterial) || m.map) return;
    const key = [
      m.color.getHexString(),
      m.metalness,
      m.roughness,
      m.emissive.getHexString(),
      m.emissiveIntensity,
      m.side,
    ].join(':');
    if (!batches.has(key))
      batches.set(key, { geometry: [], material: m, meshes: [] });
    const batch = batches.get(key)!;
    const geo = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    geo.applyMatrix4(object.matrixWorld);
    batch.geometry.push(geo);
    batch.meshes.push(object);
  });
  batches.forEach((batch) => {
    const merged = mergeGeometries(batch.geometry);
    batch.geometry.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, batch.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const retained = new Set<THREE.Material>([batch.material]);
    batch.meshes.forEach((m) => {
      m.removeFromParent();
      m.geometry.dispose();
      if (!retained.has(m.material as THREE.Material)) {
        (m.material as THREE.Material).dispose();
        retained.add(m.material as THREE.Material);
      }
    });
    group.add(mesh);
  });
}
