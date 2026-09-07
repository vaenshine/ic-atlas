import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  material,
  box,
  cylinder,
  trace,
  label,
  movable,
  pad,
  pcb,
} from './model-utils.ts';
import { createFamilyModel, FAMILY_SHAPES } from './family-models.ts';
import type { Part } from './catalog';

export type Marker = { label: string; point: THREE.Vector3; explode?: number };
export type Model = { group: THREE.Group; markers: Marker[] };
const dark = '#26282c';
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
  for (const side of [-1, 1])
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
  for (const side of [-1, 1])
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
    for (const side of [-1, 1])
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
  for (const side of [-1, 1])
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
    for (const side of [-1, 1])
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
  for (const side of [-1, 1])
    for (const end of [-1, 1])
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
  for (const side of [-1, 1])
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
  for (const side of isSensor ? [0] : [-1, 1]) {
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
  for (const side of [-1, 1])
    for (const end of [-1, 1])
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
    for (const side of [-1, 1])
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
    for (const side of [-1, 1]) {
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
function basicModel(part: Part): Model {
  const g = new THREE.Group(),
    markers: Marker[] = [];
  const silver = material('#bdc5cd', 0.87, 0.25),
    gold = material('#d8ba79', 0.78, 0.3),
    black = material('#24282d', 0.06, 0.55),
    white = material('#eee6d5', 0.05, 0.48);
  const lead = (x: number, z: number, y = 0.05, length = 1) => {
    const mesh = cylinder(g, 0.045, length, x, y, z, silver);
    mesh.userData.terminal = true;
    return mesh;
  };
  if (['diode', 'glassdiode', 'resistor'].includes(part.shape)) {
    const glass = part.shape === 'glassdiode',
      resistor = part.shape === 'resistor',
      r = glass ? 0.2 : resistor ? 0.3 : 0.28,
      len = glass ? 1.1 : 1.45;
    for (const side of [-1, 1]) {
      const l = lead(side * (len / 2 + 0.63), 0, 0.45, 1.35);
      l.rotation.z = Math.PI / 2;
    }
    const shell = movable(g, 0, 1.05);
    const bodyMat = glass
      ? new THREE.MeshPhysicalMaterial({
          color: '#d3955e',
          transparent: true,
          opacity: 0.66,
          roughness: 0.15,
          metalness: 0.05,
          transmission: 0.25,
          thickness: 0.18,
        })
      : resistor
        ? material('#c7b993', 0.04, 0.5)
        : black;
    const body = cylinder(shell, r, len, 0, 0.45, 0, bodyMat);
    body.rotation.z = Math.PI / 2;
    if (resistor) {
      ['#8d4b26', '#15171b', '#c62828', '#c0a254'].forEach((color, i) => {
        const band = cylinder(
          shell,
          r + 0.007,
          0.1,
          -0.49 + i * 0.31,
          0.45,
          0,
          material(color, 0.3, 0.42),
        );
        band.rotation.z = Math.PI / 2;
      });
      label(shell, '1 kΩ', 0, 0.77, 0, 0.65, 0.26, '#635b47');
    } else {
      const band = cylinder(
        shell,
        r + 0.008,
        0.14,
        len * 0.29,
        0.45,
        0,
        glass ? black : material('#d5d6d2'),
      );
      band.rotation.z = Math.PI / 2;
      label(shell, part.name, 0, 0.45 + r + 0.02, 0, 0.8, 0.25, '#e0e1d9');
    }
    box(
      g,
      0.4,
      0.07,
      0.13,
      0,
      0.43,
      0,
      material(resistor ? '#7c6257' : '#668a9d', 0.5, 0.3),
    );
    trace(
      g,
      [
        [-len / 2, 0.45, 0],
        [len / 2, 0.45, 0],
      ],
      '#b5b9b9',
      0.018,
    );
    markers.push(
      {
        label: resistor ? '色环：棕 黑 红 金' : 'K 阴极 · 色环端',
        point: new THREE.Vector3(resistor ? 0 : len * 0.3, 0.93, 0),
        explode: 1.05,
      },
      {
        label: resistor ? '轴向引线' : 'A 阳极',
        point: new THREE.Vector3(-1.3, 0.48, 0),
      },
    );
  } else if (part.shape === 'sma') {
    const shell = movable(g, 0, 1);
    box(shell, 1.75, 0.65, 1.15, 0, 0.43, 0, black, 0.09);
    box(shell, 0.15, 0.016, 1.01, 0.55, 0.765, 0, white, 0.006);
    label(shell, part.name, -0.1, 0.772, 0, 1.0, 0.5);
    for (const side of [-1, 1]) {
      const m = box(g, 0.43, 0.1, 0.84, side * 0.97, 0.09, 0, silver, 0.024);
      m.userData.terminal = true;
    }
    box(g, 0.5, 0.1, 0.45, 0, 0.2, 0, material('#538498', 0.6, 0.22));
    markers.push(
      {
        label: 'K 阴极标记',
        point: new THREE.Vector3(0.65, 0.85, 0.12),
        explode: 1,
      },
      { label: '表面贴装端子', point: new THREE.Vector3(-1.15, 0.15, 0) },
    );
  } else if (part.shape === 'bjt') {
    // TO-92 has a flat identification face and a curved back.
    const s = new THREE.Shape();
    s.moveTo(-0.55, -0.19);
    s.lineTo(0.55, -0.19);
    s.lineTo(0.55, 0.02);
    s.absarc(0, 0.02, 0.55, 0, Math.PI, false);
    s.lineTo(-0.55, -0.19);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 1.0,
      bevelEnabled: true,
      bevelSize: 0.035,
      bevelThickness: 0.035,
      bevelSegments: 2,
      steps: 1,
    });
    geo.rotateX(-Math.PI / 2);
    const shell = movable(g, 0.55, 1.15);
    const body = new THREE.Mesh(geo, black);
    shell.add(body);
    body.castShadow = true;
    const silk = label(shell, part.name, 0, 0.48, 0.245, 0.91, 0.57, '#c9cfcc');
    silk.rotation.set(0, 0, 0);
    for (let i = 0; i < 3; i++) lead((i - 1) * 0.3, 0.1, -0.15, 1.45);
    box(g, 0.28, 0.28, 0.12, 0, 0.95, 0.03, material('#507e90', 0.6, 0.25));
    markers.push(
      {
        label: 'TO-92 平面 · 丝印侧',
        point: new THREE.Vector3(0, 1.67, 0.42),
        explode: 1.15,
      },
      {
        label: '3 脚定义随型号核对',
        point: new THREE.Vector3(0.45, -0.35, 0.13),
      },
    );
  } else if (['led', 'rgbled'].includes(part.shape)) {
    const rgb = part.shape === 'rgbled',
      shell = movable(g, 0, 1.1);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: rgb ? '#d9e6ef' : '#b93739',
      metalness: 0.02,
      roughness: 0.13,
      transmission: 0.2,
      thickness: 0.4,
      transparent: true,
      opacity: 0.61,
      side: THREE.DoubleSide,
    });
    const _body = cylinder(shell, 0.53, 0.8, 0, 0.92, 0, domeMat);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.53, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat,
    );
    dome.position.set(0, 1.32, 0);
    shell.add(dome);
    const flangeShape = new THREE.Shape(),
      cut = 0.55,
      rad = 0.59,
      angle = Math.acos(cut / rad),
      height = Math.sqrt(rad * rad - cut * cut);
    flangeShape.moveTo(cut, -height);
    flangeShape.lineTo(cut, height);
    flangeShape.absarc(0, 0, rad, angle, Math.PI * 2 - angle, false);
    flangeShape.closePath();
    const flangeGeometry = new THREE.ExtrudeGeometry(flangeShape, {
      depth: 0.11,
      bevelEnabled: false,
      curveSegments: 32,
    });
    flangeGeometry.rotateX(-Math.PI / 2);
    const flange = new THREE.Mesh(flangeGeometry, domeMat);
    flange.position.y = 0.435;
    shell.add(flange);
    for (let i = 0; i < (rgb ? 4 : 2); i++) {
      const x = (i - ((rgb ? 4 : 2) - 1) / 2) * 0.26;
      lead(x, 0, rgb ? (i === 1 ? -0.12 : 0.02) : i === 0 ? -0.12 : 0.04, 1.35);
      box(g, 0.14, 0.59, 0.12, x, 0.49, 0, silver, 0.012);
    }
    const _cup = cylinder(g, 0.18, 0.08, 0, 0.74, 0, silver);
    const emitter = material(rgb ? '#c2defa' : '#e33a41', 0.1, 0.2);
    emitter.emissive.set(rgb ? '#7dafed' : '#ff2238');
    emitter.emissiveIntensity = 0.03;
    if (rgb) {
      ['#ff3344', '#42ef7c', '#4786ff'].forEach((color, i) => {
        const em = material(color, 0.1, 0.2);
        em.emissive.set(color);
        em.emissiveIntensity = 0.03;
        const die = box(
          g,
          0.075,
          0.05,
          0.12,
          (i - 1) * 0.09,
          0.8,
          0,
          em,
          0.009,
        );
        die.userData.emitter = true;
        die.userData.rgbChannel = i + 1;
        trace(
          g,
          [
            [(i - 1) * 0.12, 0.8, 0],
            [(i - 1) * 0.14, 0.96, 0.03],
            [(i - 1) * 0.22, 0.75, 0],
          ],
          '#d2b77d',
          0.008,
        );
      });
    } else {
      const die = box(g, 0.22, 0.05, 0.16, 0, 0.8, 0, emitter, 0.01);
      die.userData.emitter = true;
    }
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#ff2946',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 20, 12),
      glowMat,
    );
    glow.position.set(0, 1.2, 0);
    glow.userData.glow = true;
    glow.userData.rgb = rgb;
    g.add(glow);
    trace(
      g,
      [
        [-0.13, 0.75, 0],
        [-0.12, 0.95, 0],
        [0.13, 0.84, 0],
      ],
      '#c4a56b',
      0.01,
    );
    markers.push(
      {
        label: rgb ? '透明环氧透镜' : '红色环氧透镜',
        point: new THREE.Vector3(0.3, 1.8, 0.2),
        explode: 1.1,
      },
      {
        label: rgb ? '4 根引脚 · 共阴型示意' : '极性与限流电阻需一起确认',
        point: new THREE.Vector3(0, -0.35, 0.2),
      },
    );
  } else if (part.shape === 'tactile') {
    box(g, 1.65, 0.33, 1.65, 0, 0.19, 0, black, 0.06);
    const top = movable(g, 0, 1.1);
    box(top, 1.61, 0.09, 1.61, 0, 0.43, 0, silver, 0.035);
    for (const x of [-0.61, 0.61])
      for (const z of [-0.61, 0.61])
        cylinder(top, 0.082, 0.06, x, 0.5, z, black);
    const actuator = movable(top, 0, 0);
    actuator.userData.press = 0.15;
    cylinder(actuator, 0.32, 0.39, 0, 0.64, 0, black);
    cylinder(g, 0.46, 0.06, 0, 0.4, 0, gold);
    for (const side of [-1, 1])
      for (const z of [-0.52, 0.52]) {
        trace(
          g,
          [
            [side * 0.6, 0.19, z],
            [side * 0.97, 0.19, z],
            [side * 1.1, -0.17, z],
          ],
          '#b6bec7',
          0.045,
        );
        const _pin = lead(side * 1.1, z, -0.34, 0.35);
      }
    markers.push(
      {
        label: '瞬时触点 · 按压接通',
        point: new THREE.Vector3(0, 1.1, 0),
        explode: 1.1,
      },
      { label: '同组两脚常通', point: new THREE.Vector3(1.2, 0.03, 0.6) },
    );
  } else if (part.shape === 'slideswitch') {
    box(g, 2, 0.45, 0.9, 0, 0.25, 0, black, 0.04);
    const top = movable(g, 0, 1.0);
    box(top, 2.08, 0.045, 0.95, 0, 0.5, 0, silver, 0.02);
    box(top, 1.45, 0.025, 0.41, 0, 0.533, 0, black, 0.018);
    const toggle = movable(top, 0, 0);
    toggle.userData.slide = 0.47;
    box(toggle, 0.52, 0.55, 0.38, -0.47, 0.8, 0, black, 0.022);
    for (let i = 0; i < 4; i++)
      box(
        toggle,
        0.06,
        0.015,
        0.39,
        -0.65 + i * 0.12,
        1.081,
        0,
        material('#41464b'),
        0.005,
      );
    for (let i = 0; i < 3; i++) lead((i - 1) * 0.65, 0, -0.29, 0.66);
    for (let i = 0; i < 3; i++)
      box(g, 0.35, 0.04, 0.26, (i - 1) * 0.58, 0.4, 0, gold, 0.005);
    markers.push(
      {
        label: '滑柄 · 选择一侧触点',
        point: new THREE.Vector3(0, 1.23, 0),
        explode: 1,
      },
      {
        label: 'COM 公共端在中间（示意）',
        point: new THREE.Vector3(0, -0.55, 0.2),
      },
    );
  } else if (part.shape === 'usbc') {
    const top = movable(g, 0, 1);
    const metal = material('#b9c3ce', 0.93, 0.2);
    // Rounded, open-ended shell with a real cavity and central contact tongue.
    box(top, 2.1, 0.08, 0.97, 0, 0.85, 0, metal, 0.035);
    box(top, 2.1, 0.08, 0.97, 0, 0.14, 0, metal, 0.035);
    for (const side of [-1, 1])
      box(top, 0.11, 0.69, 0.97, side * 1.02, 0.49, 0, metal, 0.045);
    box(g, 1.95, 0.58, 0.12, 0, 0.49, -0.46, black, 0.01);
    box(g, 1.73, 0.14, 0.79, 0, 0.48, 0.02, black, 0.03);
    for (const side of [-1, 1])
      for (let i = 0; i < 12; i++) {
        const pin = box(
          g,
          0.075,
          0.019,
          0.53,
          (i - 5.5) * 0.136,
          0.48 + side * 0.084,
          0.095,
          gold,
          0.009,
        );
        pin.userData.terminal = true;
        box(
          g,
          0.075,
          0.05,
          0.18,
          (i - 5.5) * 0.136,
          0.18,
          side === 1 ? -0.62 : -0.89,
          gold,
          0.006,
        );
      }
    for (const side of [-1, 1])
      box(g, 0.19, 0.22, 0.25, side * 1.08, 0.02, -0.31, silver, 0.01);
    markers.push(
      {
        label: '金属屏蔽壳',
        point: new THREE.Vector3(0.85, 1.06, 0.07),
        explode: 1,
      },
      { label: '上下双面 · 24 个触点', point: new THREE.Vector3(0, 0.46, 0.6) },
    );
  } else if (['jst', 'terminal', 'header'].includes(part.shape)) {
    if (part.shape === 'header') {
      const insulator = movable(g, 0, 1.2);
      box(insulator, 1.04, 0.46, 2.68, 0, 0.28, 0, black, 0.025);
      for (const x of [-0.27, 0.27])
        for (let i = 0; i < 5; i++) {
          const pin = box(
            g,
            0.115,
            1.75,
            0.115,
            x,
            0.36,
            (i - 2) * 0.52,
            gold,
            0.016,
          );
          pin.userData.terminal = true;
        }
      markers.push(
        { label: '2 × 5 方形镀金针', point: new THREE.Vector3(0, 1.42, 0.15) },
        {
          label: '2.54 mm 间距示例',
          point: new THREE.Vector3(0.6, 0.49, 1.05),
          explode: 1.2,
        },
      );
    } else if (part.shape === 'jst') {
      const shell = movable(g, 0, 1.2);
      box(shell, 1.8, 0.13, 1.18, 0, 0.29, 0, white, 0.03);
      for (const side of [-1, 1])
        box(shell, 0.13, 1.1, 1.18, side * 0.84, 0.83, 0, white, 0.04);
      box(shell, 1.73, 1.1, 0.14, 0, 0.83, -0.51, white, 0.025);
      box(shell, 1.73, 0.46, 0.15, 0, 0.59, 0.51, white, 0.02);
      box(shell, 0.65, 0.18, 0.16, 0, 1.28, -0.38, white, 0.02);
      for (const x of [-0.37, 0.37]) {
        const pin = box(g, 0.11, 1.53, 0.11, x, 0.39, 0, silver, 0.012);
        pin.userData.terminal = true;
      }
      markers.push(
        {
          label: '有方向的塑料护墙',
          point: new THREE.Vector3(0.65, 1.68, 0),
          explode: 1.2,
        },
        {
          label: 'XH 系列 · 2.50 mm',
          point: new THREE.Vector3(-0.4, 0.03, 0.1),
        },
      );
    } else {
      const shell = movable(g, 0, 1.15),
        green = material('#2b856a', 0.04, 0.48);
      box(shell, 2.25, 0.2, 1.43, 0, 0.18, 0, green, 0.04);
      box(shell, 2.25, 1.12, 0.18, 0, 0.79, -0.62, green, 0.025);
      for (const x of [-1.04, 0, 1.04])
        box(shell, 0.14, 1.12, 1.25, x, 0.79, 0, green, 0.02);
      box(shell, 2.25, 0.22, 0.38, 0, 1.24, -0.35, green, 0.03);
      for (const x of [-0.54, 0.54]) {
        box(
          g,
          0.79,
          0.64,
          0.93,
          x,
          0.66,
          -0.02,
          material('#948d6c', 0.8, 0.31),
          0.03,
        );
        box(g, 0.51, 0.35, 0.012, x, 0.63, 0.456, black, 0.005);
        const _screw = cylinder(g, 0.25, 0.18, x, 1.11, -0.1, silver);
        box(g, 0.33, 0.014, 0.055, x, 1.209, -0.1, black, 0.003);
        lead(x, -0.05, -0.35, 0.76);
      }
      markers.push(
        { label: '螺钉与压线框', point: new THREE.Vector3(0, 1.51, 0) },
        {
          label: '接线入口',
          point: new THREE.Vector3(0.53, 0.6, 0.62),
          explode: 1.15,
        },
      );
    }
  } else if (['ceramic', 'electrolytic'].includes(part.shape)) {
    const electrolytic = part.shape === 'electrolytic',
      shell = movable(g, 0, 1.2);
    for (const side of [-1, 1]) lead(side * 0.27, 0, -0.28, 1.17);
    if (electrolytic) {
      cylinder(shell, 0.63, 1.65, 0, 1.07, 0, material('#225b89', 0.18, 0.37));
      cylinder(shell, 0.63, 0.035, 0, 1.906, 0, silver);
      cylinder(shell, 0.66, 0.08, 0, 0.28, 0, black);
      box(shell, 0.045, 1.44, 0.19, 0.622, 1.04, 0, material('#b6c9d7'), 0.012);
      trace(
        shell,
        [
          [-0.4, 1.931, 0],
          [0.4, 1.931, 0],
        ],
        '#4d5760',
        0.012,
      );
      trace(
        shell,
        [
          [0, 1.931, -0.4],
          [0, 1.931, 0.4],
        ],
        '#4d5760',
        0.012,
      );
      const print = label(
        shell,
        '100µF\n−  −',
        0,
        1.11,
        0.65,
        0.76,
        0.84,
        '#d5e3ed',
      );
      print.rotation.set(0, 0, 0);
      cylinder(g, 0.44, 1.26, 0, 0.98, 0, material('#a4a8a6', 0.78, 0.4));
      for (let i = 0; i < 12; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.4 - i * 0.014, 0.009, 4, 30),
          gold,
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 1.62;
        g.add(ring);
      }
      markers.push(
        {
          label: '顶部防爆刻痕',
          point: new THREE.Vector3(0, 2.15, 0),
          explode: 1.2,
        },
        {
          label: '负极条纹（示意）',
          point: new THREE.Vector3(0.72, 1.0, 0.1),
          explode: 1.2,
        },
      );
    } else {
      const disc = cylinder(
        shell,
        0.67,
        0.22,
        0,
        0.87,
        0,
        material('#bd8959', 0.01, 0.64),
      );
      disc.rotation.x = Math.PI / 2;
      const print = label(
        shell,
        '104\n100nF',
        0,
        0.89,
        0.121,
        1,
        0.7,
        '#342b20',
      );
      print.rotation.set(0, 0, 0);
      cylinder(g, 0.48, 0.035, 0, 0.87, 0, silver).rotation.x = Math.PI / 2;
      markers.push(
        {
          label: '104 = 100,000 pF',
          point: new THREE.Vector3(0, 1.72, 0.1),
          explode: 1.2,
        },
        { label: '陶瓷介质 · 双引脚', point: new THREE.Vector3(0.37, -0.5, 0) },
      );
    }
  }
  return { group: g, markers };
}

export function createModel(part: Part): Model {
  if (FAMILY_SHAPES.has(part.shape)) return createFamilyModel(part);
  if (
    [
      'diode',
      'glassdiode',
      'sma',
      'bjt',
      'led',
      'rgbled',
      'tactile',
      'slideswitch',
      'usbc',
      'jst',
      'header',
      'terminal',
      'resistor',
      'ceramic',
      'electrolytic',
    ].includes(part.shape)
  )
    return basicModel(part);
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
  if (['to220', 'mosfet', 'to2205', 'to263'].includes(part.shape)) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.85, -1.05);
    shape.lineTo(0.85, -1.05);
    shape.lineTo(0.85, 1.5);
    shape.lineTo(-0.85, 1.5);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 1.04, 0.21, 0, Math.PI * 2, true);
    if (part.shape !== 'to263') shape.holes.push(hole);
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
    label(
      shell,
      part.name +
        '\n' +
        (part.shape === 'mosfet'
          ? 'MOSFET'
          : part.shape === 'to263'
            ? 'D2PAK'
            : ''),
      0,
      0.62,
      0.3,
      1.45,
      0.98,
    );
    for (let i = 0; i < part.pins; i++) {
      const pin = box(
        g,
        0.13,
        0.1,
        part.shape === 'to263' ? 0.62 : 1.7,
        (i - (part.pins - 1) / 2) * (part.pins === 5 ? 0.33 : 0.55),
        0.1,
        part.shape === 'to263' ? 1.3 : 1.9,
        silver,
        0.012,
      );
      pin.userData.terminal = true;
    }
    box(g, 0.5, 0.06, 0.5, 0, 0.09, 0.15, material('#577f96', 0.7, 0.15));
    markers.push(
      {
        label: part.shape === 'to263' ? '金属散热焊盘' : '散热片与安装孔',
        point: new THREE.Vector3(0, 0.1, -1.3),
      },
      {
        label: part.pins + ' 个连接引脚',
        point: new THREE.Vector3(0.65, 0.2, 2.45),
      },
    );
    return { group: g, markers };
  }
  const dip = part.shape === 'dip',
    sop = ['soic', 'tssop', 'sot23', 'sot236'].includes(part.shape),
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
            ? '2609   MCU'
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
    const balls = new THREE.InstancedMesh(ball, silver, part.pins),
      matrix = new THREE.Matrix4();
    let ballRows = Math.floor(Math.sqrt(part.pins));
    while (part.pins % ballRows !== 0) ballRows--;
    const ballCols = part.pins / ballRows;
    const ballPitch = 2.16 / Math.max(ballRows - 1, ballCols - 1, 1);
    for (let i = 0; i < part.pins; i++) {
      matrix.makeTranslation(
        ((i % ballCols) - (ballCols - 1) / 2) * ballPitch,
        0.018,
        (Math.floor(i / ballCols) - (ballRows - 1) / 2) * ballPitch,
      );
      balls.setMatrixAt(i, matrix);
    }
    balls.instanceMatrix.needsUpdate = true;
    balls.userData.balls = part.pins;
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
  if (
    part.id === 'drv8833' ||
    (!qfn && /裸露|PowerPAD|ESOP/.test(part.package))
  )
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
  for (const side of [-1, 1])
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
