import * as THREE from 'three';
import { SPECIAL_SHAPES, createSpecialModel } from './special-models.ts';
import {
  material,
  box,
  cylinder,
  trace,
  label,
  movable,
  pcb,
} from './model-utils.ts';
import type { Part } from './catalog';
import type { Model, Marker } from './models';
export const FAMILY_SHAPES = new Set([
  'chipresistor',
  'mlcc',
  'tantalum',
  'smdcan',
  'powerinductor',
  'chipinductor',
  'bead',
  'ptcfuse',
  'fuse',
  'crystal',
  'oscillator',
  'relay',
  'signalrelay',
  'bridge',
  'mov',
  'ntc',
  'potentiometer',
  'transformer',
  'commonchoke',
  'rj45',
  'ffc',
  'idc',
  'housing',
  'crimp',
  'coax',
  'dsub',
  'powerjack',
  'femaleheader',
  'automotive',
  'fuseholder',
  'bladefuse',
  'sevenseg',
  'dipswitch',
  'buzzer',
  'slotopto',
  'photodiode',
  'antenna',
  'modulebox',
  'film',
  'safetycap',
  'thermistor',
  'gasdischarge',
  'resistorarray',
  'shunt',
  'feedthrough',
  'sensorcan',
  'powermodule',
  'tss',
  'balun',
  'rf_filter',
  ...SPECIAL_SHAPES,
]);
function coil(
  g: THREE.Group,
  r: number,
  height: number,
  turns: number,
  x: number,
  y: number,
  z: number,
  color = '#bc7937',
  axis = 'y',
) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= turns * 24; i++) {
    const t = i / (turns * 24),
      a = t * turns * Math.PI * 2;
    points.push(
      axis === 'y'
        ? new THREE.Vector3(
            x + Math.cos(a) * r,
            y + t * height,
            z + Math.sin(a) * r,
          )
        : new THREE.Vector3(
            x + t * height,
            y + Math.cos(a) * r,
            z + Math.sin(a) * r,
          ),
    );
  }
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      turns * 30,
      0.025,
      5,
      false,
    ),
    material(color, 0.8, 0.31),
  );
  g.add(mesh);
  return mesh;
}
function openHousing(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  m: THREE.Material,
) {
  box(g, w, 0.12, d, 0, 0.08, 0, m, 0.025);
  box(g, w, h, 0.12, 0, h / 2, -d / 2, m, 0.025);
  for (const side of [-1, 1])
    box(g, 0.12, h, d, (side * w) / 2, h / 2, 0, m, 0.025);
  box(g, w, 0.13, d * 0.38, 0, h - 0.03, -d * 0.32, m, 0.02);
}
function mark(
  label: string,
  x: number,
  y: number,
  z: number,
  explode = 0,
): Marker {
  return { label, point: new THREE.Vector3(x, y, z), explode };
}
export function createFamilyModel(part: Part): Model {
  if (SPECIAL_SHAPES.has(part.shape)) return createSpecialModel(part);
  const g = new THREE.Group(),
    markers: Marker[] = [];
  const shape = part.shape;
  const silver = material('#bbc6d0', 0.85, 0.28),
    gold = material('#ccb075', 0.8, 0.26),
    black = material('#252b32', 0.08, 0.5),
    cream = material('#dfd8ba', 0.05, 0.61),
    blue = material('#316f9e', 0.05, 0.43);
  const shell = movable(g, 0, 1.1);
  const pin = (x: number, z: number, y = -0.15, h = 0.6, w = 0.07) => {
    const m = box(g, w, h, w, x, y, z, silver, 0.01);
    m.userData.terminal = true;
    return m;
  };
  const twoSidedPins = (n: number, w: number, d: number) => {
    const left = Math.ceil(n / 2),
      right = Math.floor(n / 2);
    for (let i = 0; i < left; i++)
      pin(-w / 2, ((i - (left - 1) / 2) * d) / Math.max(left, 1));
    for (let i = 0; i < right; i++)
      pin(w / 2, ((i - (right - 1) / 2) * d) / Math.max(right, 1));
  };
  if (
    [
      'chipresistor',
      'mlcc',
      'bead',
      'chipinductor',
      'shunt',
      'resistorarray',
      'rf_filter',
      'balun',
      'tss',
    ].includes(shape)
  ) {
    const array = shape === 'resistorarray',
      filter = shape === 'rf_filter' || shape === 'balun',
      w = array ? 2.4 : 2.0,
      d = array ? 1.1 : 1.04;
    box(
      shell,
      w,
      0.44,
      d,
      0,
      0.36,
      0,
      shape === 'mlcc' ? cream : shape === 'chipinductor' ? blue : black,
      0.045,
    );
    if (array || filter) {
      const n = part.pins;
      for (let i = 0; i < n; i++) {
        const half = Math.ceil(n / 2),
          side = i < half ? -1 : 1;
        const m = box(
          g,
          0.13,
          0.1,
          0.26,
          (((i % half) - (half - 1) / 2) * w) / half,
          0.14,
          (side * d) / 2,
          silver,
          0.016,
        );
        m.userData.terminal = true;
      }
    } else
      for (const side of [-1, 1]) {
        const m = box(
          g,
          0.27,
          0.43,
          d + 0.02,
          side * (w / 2 - 0.08),
          0.3,
          0,
          silver,
          0.025,
        );
        m.userData.terminal = true;
      }
    if (shape === 'mlcc') {
      for (let i = 0; i < 12; i++) {
        box(
          g,
          1.4,
          0.018,
          0.81,
          i % 2 ? 0.04 : -0.04,
          0.15 + i * 0.022,
          0,
          material(i % 2 ? '#b6bfbd' : '#f0e7cd', i % 2 ? 0.6 : 0.04, 0.43),
          0,
        );
      }
      markers.push(
        mark('Alternating electrodes', 0, 0.8, -0.3),
        mark('Ceramic dielectric', 0.5, 0.8, 0.4, 1.1),
      );
    } else if (['bead', 'chipinductor', 'balun'].includes(shape)) {
      box(g, 1.15, 0.23, 0.65, 0, 0.29, 0, material('#53605b'), 0.02);
      coil(g, 0.18, 0.7, 8, -0.35, 0.31, 0, '#b68e54', 'x');
      if (shape === 'balun')
        coil(g, 0.22, 0.7, 8, -0.35, 0.31, 0, '#d1bd87', 'x');
      markers.push(
        mark(
          shape === 'bead' ? 'Lossy ferrite body' : 'Embedded winding',
          0,
          0.88,
          0,
          1.1,
        ),
      );
    } else {
      box(
        g,
        1.3,
        0.018,
        0.64,
        0,
        0.3,
        0,
        material(shape === 'shunt' ? '#9aabaf' : '#765b4e', 0.6, 0.37),
        0.005,
      );
      label(
        shell,
        shape === 'chipresistor'
          ? '1001'
          : shape === 'shunt'
            ? 'R010'
            : shape === 'resistorarray'
              ? 'RES NETWORK'
              : shape === 'rf_filter'
                ? 'RF FILTER'
                : shape === 'tss'
                  ? 'TSS'
                  : '',
        0,
        0.588,
        0,
        w * 0.8,
        0.6,
      );
      markers.push(
        mark(
          shape === 'shunt'
            ? 'Low-resistance metal element'
            : 'Functional element',
          0,
          0.9,
          0.1,
          1.1,
        ),
      );
    }
    markers.push(mark('Solder terminations', -1.1, 0.24, 0.2));
  } else if (['powerinductor', 'commonchoke', 'transformer'].includes(shape)) {
    const trans = shape === 'transformer',
      common = shape === 'commonchoke';
    box(g, 2.2, 0.18, 1.9, 0, 0.1, 0, black, 0.04);
    box(shell, 2.12, 0.15, 1.86, 0, 1.38, 0, black, 0.04);
    for (const side of [-1, 1])
      box(shell, 0.25, 1.2, 1.86, side * 0.94, 0.76, 0, black, 0.035);
    if (trans) {
      box(g, 1.3, 1.1, 1.15, 0, 0.76, 0, material('#343d41'), 0.03);
      coil(g, 0.58, 0.54, 11, -0.55, 0.8, 0, '#d39845', 'x');
      coil(g, 0.58, 0.54, 11, 0.03, 0.8, 0, '#b6752c', 'x');
    } else if (common) {
      for (const x of [-0.45, 0.45]) {
        cylinder(g, 0.27, 0.95, x, 0.73, 0, black);
        coil(g, 0.32, 0.82, 13, x, 0.28, 0, x < 0 ? '#bd7936' : '#dfaa59');
      }
    } else {
      cylinder(g, 0.45, 1.05, 0, 0.72, 0, black);
      coil(g, 0.6, 0.77, 14, 0, 0.33, 0);
    }
    twoSidedPins(part.pins, 1.8, 1.7);
    label(
      shell,
      common ? 'CM CHOKE' : trans ? 'TRANSFORMER' : 'INDUCTOR',
      0,
      1.462,
      0,
      1.8,
      0.75,
    );
    markers.push(
      mark(common ? 'Two coupled windings' : 'Copper winding', 0, 1.1, 0.6),
      mark('Ferrite core', 0.75, 1.7, 0, 1.1),
    );
  } else if (
    [
      'ptcfuse',
      'mov',
      'ntc',
      'thermistor',
      'film',
      'safetycap',
      'tantalum',
    ].includes(shape)
  ) {
    const flat = ['film', 'safetycap'].includes(shape),
      tan = shape === 'tantalum',
      color =
        shape === 'ptcfuse'
          ? '#cdab38'
          : shape === 'mov'
            ? '#327dc2'
            : shape === 'ntc'
              ? '#283937'
              : shape === 'safetycap'
                ? '#d9b852'
                : shape === 'tantalum'
                  ? '#cea05a'
                  : '#79604b';
    if (flat || tan) {
      box(
        shell,
        tan ? 1.6 : 2.15,
        tan ? 0.8 : 1.55,
        tan ? 0.92 : 0.65,
        0,
        tan ? 0.55 : 0.9,
        0,
        material(color, 0.03, 0.5),
        0.12,
      );
      const _silk = label(
        shell,
        tan ? 'TA +' : shape === 'safetycap' ? 'X / Y RATED' : 'FILM',
        0,
        tan ? 0.966 : 1.7,
        0,
        tan ? 1.2 : 1.9,
        0.55,
        '#4e432f',
      );
      if (tan) {
        box(shell, 0.15, 0.012, 0.75, -0.57, 0.956, 0, black, 0.008);
        for (const side of [-1, 1]) {
          const m = box(g, 0.3, 0.08, 0.61, side * 0.8, 0.14, 0, silver, 0.01);
          m.userData.terminal = true;
        }
      }
    } else {
      const disc = cylinder(
        shell,
        0.72,
        0.32,
        0,
        1.03,
        0,
        material(color, 0.04, 0.5),
      );
      disc.rotation.x = Math.PI / 2;
      const silk = label(
        shell,
        shape === 'mov'
          ? 'MOV'
          : shape === 'ntc'
            ? 'NTC'
            : shape === 'ptcfuse'
              ? 'PPTC'
              : 'PTC',
        0,
        1.0,
        0.172,
        0.9,
        0.7,
        '#d9e2cf',
      );
      silk.rotation.set(0, 0, 0);
    }
    if (!tan)
      for (let i = 0; i < part.pins; i++)
        pin((i - (part.pins - 1) / 2) * 0.5, 0, -0.03, 1.3);
    box(g, 1.05, 0.025, 0.42, 0, 0.6, 0, material('#a7a49e', 0.75, 0.3));
    markers.push(
      mark(
        tan
          ? 'Positive polarity band'
          : shape === 'ntc'
            ? 'Temperature-sensitive body'
            : shape === 'mov'
              ? 'Voltage-dependent material'
              : 'Functional material',
        0,
        1.88,
        0.1,
        1.1,
      ),
      mark(tan ? 'Surface-mount terminals' : 'Radial leads', -0.5, -0.43, 0.05),
    );
  } else if (['fuse', 'gasdischarge', 'feedthrough'].includes(shape)) {
    const glass = shape === 'fuse' || part.id === 'cat-171';
    const bodymat = new THREE.MeshPhysicalMaterial({
      color: glass ? '#c8dce4' : '#ddd4b4',
      roughness: 0.14,
      metalness: 0.05,
      transparent: glass,
      opacity: glass ? 0.36 : 1,
      transmission: glass ? 0.35 : 0,
      thickness: 0.2,
    });
    const tube = cylinder(shell, 0.34, 1.9, 0, 0.49, 0, bodymat);
    tube.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cap = cylinder(g, 0.35, 0.33, side * 0.97, 0.49, 0, silver);
      cap.rotation.z = Math.PI / 2;
      const p = pin(side * 1.55, 0, 0.49, 1.0);
      p.rotation.z = Math.PI / 2;
    }
    if (shape === 'fuse')
      trace(
        g,
        [
          [-0.9, 0.49, 0],
          [-0.3, 0.49, 0.08],
          [0.1, 0.53, -0.05],
          [0.8, 0.49, 0],
        ],
        '#b5a891',
        0.017,
      );
    else {
      for (const side of [-1, 1])
        box(g, 0.61, 0.19, 0.19, side * 0.5, 0.49, 0, silver, 0.02);
    }
    if (part.pins > 2) {
      const ring = cylinder(shell, 0.56, 0.3, 0, 0.49, 0, silver);
      ring.rotation.z = Math.PI / 2;
      const _extra = pin(0, 0, -0.13, 0.45);
    }
    markers.push(
      mark(
        shape === 'fuse'
          ? 'Fusible link'
          : shape === 'feedthrough'
            ? 'Grounded filter body'
            : 'Electrode gap',
        0,
        0.97,
        0,
        1.1,
      ),
      mark('Axial terminal', 1.45, 0.55, 0.15),
    );
  } else if (['crystal', 'oscillator'].includes(shape)) {
    const active = shape === 'oscillator';
    box(g, 2.05, 0.13, active ? 1.3 : 0.72, 0, 0.13, 0, black, 0.035);
    box(
      shell,
      1.96,
      active ? 0.43 : 1.33,
      active ? 1.24 : 0.65,
      0,
      active ? 0.41 : 0.86,
      0,
      silver,
      0.17,
    );
    label(
      shell,
      active ? 'OSC / CLK' : 'QUARTZ',
      0,
      active ? 0.644 : 1.53,
      0,
      1.65,
      0.5,
      '#43515d',
    );
    if (active) {
      for (let i = 0; i < part.pins; i++) {
        const side = i < part.pins / 2 ? -1 : 1,
          half = Math.ceil(part.pins / 2);
        const m = box(
          g,
          0.24,
          0.04,
          0.3,
          ((i % half) - (half - 1) / 2) * 1.3,
          0.07,
          side * 0.53,
          gold,
          0.008,
        );
        m.userData.terminal = true;
      }
      box(g, 0.68, 0.09, 0.48, 0, 0.27, 0, black, 0.01);
    } else
      for (let i = 0; i < part.pins; i++)
        pin((i - (part.pins - 1) / 2) * 1.0, 0, -0.22, 0.69);
    box(g, 1.12, 0.035, 0.42, 0, 0.3, 0, material('#c9dae0', 0.4, 0.16));
    markers.push(
      mark(
        active ? 'Powered clock circuit' : 'Quartz resonator',
        0,
        1.9,
        0,
        1.1,
      ),
      mark(
        active ? 'Supply, ground and output' : 'Resonator connections',
        0.7,
        -0.23,
        0,
      ),
    );
  } else if (
    [
      'smdcan',
      'modulebox',
      'powermodule',
      'relay',
      'signalrelay',
      'bridge',
      'sensorcan',
      'buzzer',
    ].includes(shape)
  ) {
    const relay = shape === 'relay' || shape === 'signalrelay',
      isModule = shape === 'modulebox' || shape === 'powermodule';
    if (shape === 'smdcan') {
      cylinder(shell, 0.69, 1.23, 0, 0.85, 0, silver);
      cylinder(shell, 0.69, 0.027, 0, 1.48, 0, silver);
      box(g, 1.5, 0.18, 1.55, 0, 0.15, 0, black, 0.05);
      box(shell, 0.21, 0.018, 0.6, -0.47, 1.504, 0, black, 0.015);
      for (const side of [-1, 1]) {
        const m = box(g, 0.56, 0.06, 0.34, side * 0.63, 0.035, 0, silver, 0.01);
        m.userData.terminal = true;
      }
      coil(g, 0.45, 0.73, 13, 0, 0.36, 0, '#a7b2bb');
    } else if (shape === 'sensorcan' || shape === 'buzzer') {
      const buzz = shape === 'buzzer';
      cylinder(shell, 0.78, 1.15, 0, 0.79, 0, buzz ? black : silver);
      cylinder(shell, 0.23, 0.015, 0, 1.376, 0, black);
      cylinder(g, 0.56, 0.055, 0, 0.42, 0, gold);
      for (let i = 0; i < part.pins; i++) {
        const a = (i / part.pins) * Math.PI * 2;
        pin(Math.cos(a) * 0.45, Math.sin(a) * 0.45, -0.2, 0.58);
      }
    } else if (shape === 'bridge') {
      box(shell, 2.0, 0.73, 1.73, 0, 0.48, 0, black, 0.07);
      label(shell, '+    ~\n~    −', 0, 0.853, 0, 1.75, 1.4);
      for (let i = 0; i < part.pins; i++)
        pin(
          ((i % 2) - 0.5) * 1.55,
          (Math.floor(i / 2) - 0.5) * 1.4,
          -0.18,
          0.7,
        );
      for (const x of [-0.4, 0.4])
        for (const z of [-0.4, 0.4])
          box(g, 0.3, 0.1, 0.3, x, 0.31, z, material('#4b728b'), 0.015);
    } else {
      const w = isModule ? 2.6 : 2.1,
        d = isModule ? 2.05 : 1.6,
        h = isModule ? 1.03 : 1.55;
      box(g, w, 0.17, d, 0, 0.11, 0, black, 0.03);
      box(
        shell,
        w,
        h,
        d,
        0,
        h / 2 + 0.23,
        0,
        relay
          ? material(
              shape === 'signalrelay' ? '#d8cba9' : '#287099',
              0.05,
              0.47,
            )
          : black,
        0.07,
      );
      label(
        shell,
        relay
          ? 'COIL / CONTACTS'
          : shape === 'powermodule'
            ? 'POWER MODULE'
            : 'ISOLATED MODULE',
        0,
        h + 0.237,
        0,
        w * 0.9,
        d * 0.65,
      );
      twoSidedPins(part.pins, w * 0.77, d * 0.83);
      if (relay) {
        const bobbin = cylinder(g, 0.33, 1.1, -0.3, 0.7, 0, black);
        bobbin.rotation.z = Math.PI / 2;
        coil(g, 0.38, 0.9, 14, -0.75, 0.7, 0, '#b78043', 'x');
        const arm = movable(g, 0, 0);
        arm.userData.press = 0.12;
        box(arm, 0.07, 0.04, 1.0, 0.7, 0.87, 0, silver, 0.007);
        cylinder(g, 0.11, 0.06, 0.7, 0.71, 0.38, silver);
      } else {
        box(g, 1.0, 0.62, 0.96, -0.47, 0.51, 0, material('#333e42'), 0.05);
        coil(g, 0.35, 0.51, 10, -0.75, 0.65, 0, '#be884a', 'x');
        box(g, 0.59, 0.12, 0.7, 0.76, 0.3, 0, black, 0.02);
      }
    }
    markers.push(
      mark(
        relay
          ? 'Coil and moving contact'
          : shape === 'buzzer'
            ? 'Piezoelectric sound element'
            : shape === 'sensorcan'
              ? 'Sensing element'
              : shape === 'smdcan'
                ? 'Rolled electrode structure'
                : 'Internal functional blocks',
        0,
        1.1,
        0.55,
      ),
      mark('Protective housing', 0.6, 1.87, 0, 1.1),
    );
  } else if (
    [
      'ffc',
      'idc',
      'femaleheader',
      'housing',
      'automotive',
      'rj45',
      'powerjack',
      'dsub',
      'coax',
      'crimp',
    ].includes(shape)
  ) {
    if (shape === 'ffc') {
      const n = part.pins,
        w = Math.max(2.1, n * 0.105);
      openHousing(shell, w, 0.47, 0.74, cream);
      box(shell, w, 0.12, 0.29, 0, 0.56, 0.29, black, 0.028);
      for (let i = 0; i < n; i++) {
        const p = box(
          g,
          0.045,
          0.035,
          1.0,
          ((i - (n - 1) / 2) * w) / (n + 1),
          0.19,
          0,
          gold,
          0.005,
        );
        p.userData.terminal = true;
      }
      markers.push(
        mark('Flip-lock latch', 0, 0.92, 0.2, 1.1),
        mark('Fine-pitch contacts', 0, 0.23, 0.55),
      );
    } else if (shape === 'femaleheader' || shape === 'idc') {
      const n = part.pins,
        rows = 2,
        cols = Math.ceil(n / rows),
        d = Math.max(1.3, cols * 0.36),
        w = 1.12;
      box(shell, w, 0.22, d, 0, 0.15, 0, black, 0.03);
      for (let i = 0; i < n; i++) {
        const x = ((i % 2) - 0.5) * 0.5,
          z = (Math.floor(i / 2) - (cols - 1) / 2) * 0.36;
        pin(x, z, -0.24, 0.55);
        for (const side of [-1, 1])
          box(
            shell,
            0.043,
            0.47,
            0.25,
            x + side * 0.116,
            0.49,
            z,
            black,
            0.005,
          );
        for (const side of [-1, 1])
          box(shell, 0.27, 0.47, 0.04, x, 0.49, z + side * 0.116, black, 0.005);
        box(g, 0.023, 0.4, 0.16, x - 0.07, 0.42, z, gold, 0.003);
      }
      if (shape === 'idc') {
        for (const side of [-1, 1])
          box(shell, 0.12, 0.89, d + 0.32, side * 0.71, 0.51, 0, black, 0.025);
        box(shell, 1.53, 0.89, 0.12, 0, 0.51, -d / 2 - 0.11, black, 0.025);
        box(shell, 1.53, 0.89, 0.12, 0, 0.51, d / 2 + 0.11, black, 0.025);
      }
      markers.push(
        mark(
          shape === 'idc' ? 'Polarized shroud' : 'Recessed female contacts',
          0,
          1.23,
          0,
          1.1,
        ),
        mark('Contact rows', 0.75, -0.3, 0.25),
      );
    } else if (shape === 'rj45') {
      openHousing(shell, 2.3, 1.85, 2.25, black);
      box(shell, 2.3, 0.17, 2.25, 0, 1.8, 0, black, 0.06);
      for (let i = 0; i < part.pins; i++) {
        const x =
          ((i - (part.pins - 1) / 2) * 1.67) / Math.max(part.pins - 1, 1);
        trace(
          g,
          [
            [x, 0.46, 0.86],
            [x, 1.18, 0.25],
            [x, 1.15, -0.72],
          ],
          '#cbb379',
          0.035,
        );
        pin(x, -0.75, -0.13, 0.46);
      }
      for (const side of [-1, 1])
        box(
          shell,
          0.29,
          0.15,
          0.18,
          side * 0.83,
          1.75,
          1.16,
          material(side < 0 ? '#68b879' : '#c9ac57'),
          0.028,
        );
      markers.push(
        mark('Spring signal contacts', 0, 1.1, 0.96),
        mark('Plug latch recess', 0, 1.83, 1.16, 1.1),
      );
    } else if (shape === 'housing' || shape === 'automotive') {
      const auto = shape === 'automotive',
        cols = Math.max(1, Math.min(4, Math.ceil(part.pins / 2))),
        rows = Math.max(1, Math.ceil(part.pins / cols)),
        w = Math.max(1.6, cols * 0.48),
        h = Math.max(1.0, rows * 0.48);
      openHousing(
        shell,
        w,
        h,
        1.45,
        material(auto ? '#515a60' : '#dcd9c9', 0.05, 0.5),
      );
      box(shell, w, 0.18, 1.4, 0, h, 0, auto ? black : cream, 0.04);
      box(shell, 0.52, 0.17, 0.42, 0, h + 0.16, -0.25, black, 0.02);
      for (let i = 0; i < part.pins; i++) {
        const x = ((i % cols) - (cols - 1) / 2) * 0.4,
          y = 0.35 + Math.floor(i / cols) * 0.38;
        const p = pin(x, 0, y, 0.83);
        p.rotation.x = Math.PI / 2;
      }
      if (auto)
        for (const side of [-1, 1])
          box(
            shell,
            0.1,
            h,
            0.16,
            side * (w / 2 + 0.07),
            h / 2,
            -0.5,
            material('#bd714a'),
            0.015,
          );
      markers.push(
        mark(
          auto ? 'Seal and locking tab' : 'Keyed insulating housing',
          0,
          h + 0.57,
          0,
          1.1,
        ),
        mark('Mating contact cavities', 0, 0.45, 0.84),
      );
    } else if (shape === 'coax' || shape === 'powerjack') {
      const rf = shape === 'coax',
        outer = rf ? gold : black;
      const tube = cylinder(shell, 0.67, 1.4, 0, 0.76, 0, outer);
      tube.rotation.x = Math.PI / 2;
      const front = cylinder(shell, 0.5, 0.015, 0, 0.76, 0.711, black);
      front.rotation.x = Math.PI / 2;
      const insulator = cylinder(g, 0.33, 0.04, 0, 0.76, 0.699, cream);
      insulator.rotation.x = Math.PI / 2;
      const center = cylinder(g, 0.08, 0.22, 0, 0.76, 0.75, rf ? gold : silver);
      center.rotation.x = Math.PI / 2;
      box(g, 1.6, 0.12, 1.1, 0, 0.09, 0, outer, 0.035);
      for (let i = 0; i < part.pins; i++)
        pin(
          ((i - (part.pins - 1) / 2) * 1.15) / Math.max(part.pins - 1, 1),
          -0.28,
          -0.24,
          0.58,
        );
      if (rf) {
        const nut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.79, 0.79, 0.2, 6),
          gold,
        );
        nut.rotation.x = Math.PI / 2;
        nut.position.set(0, 0.76, -0.34);
        shell.add(nut);
      }
      markers.push(
        mark(
          rf ? 'Coaxial signal and shield' : 'Barrel power contact',
          0,
          0.9,
          0.9,
        ),
        mark('Mechanical body', 0.7, 1.56, 0, 1.1),
      );
    } else if (shape === 'dsub') {
      const n = part.pins,
        cols = n >= 15 ? 5 : Math.ceil(n / 2),
        _rows = Math.ceil(n / cols);
      box(shell, 3.2, 1.3, 0.16, 0, 0.83, -0.24, silver, 0.12);
      box(shell, 2.37, 0.93, 0.6, 0, 0.83, 0.12, blue, 0.19);
      for (let i = 0; i < n; i++) {
        const x = ((i % cols) - (cols - 1) / 2) * 0.37,
          y = 0.55 + Math.floor(i / cols) * 0.27;
        const p = pin(x, 0.48, y, 0.39);
        p.rotation.x = Math.PI / 2;
      }
      for (const side of [-1, 1]) {
        const nut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.35, 6),
          silver,
        );
        nut.rotation.x = Math.PI / 2;
        nut.position.set(side * 1.37, 0.83, 0.05);
        shell.add(nut);
      }
      markers.push(
        mark('Multiple contact rows', 0, 1.25, 0.84),
        mark('Retention screw posts', 1.45, 1.04, 0.2, 1.1),
      );
    } else {
      box(g, 1.7, 0.055, 0.58, 0, 0.18, 0, gold, 0.02);
      for (const side of [-1, 1]) {
        const wing = box(
          shell,
          0.66,
          0.055,
          0.62,
          side * 0.43,
          0.46,
          0,
          gold,
          0.02,
        );
        wing.rotation.z = side * 0.87;
      }
      const socket = cylinder(shell, 0.23, 0.75, 0.8, 0.38, 0, gold);
      socket.rotation.z = Math.PI / 2;
      for (let i = 0; i < part.pins; i++) {
        const p = pin(-0.85, 0, 0.2, 0.25);
        p.rotation.z = Math.PI / 2;
      }
      markers.push(
        mark('Conductor and insulation crimps', 0, 0.88, 0, 1.1),
        mark('Mating contact', 0.96, 0.43, 0.2),
      );
    }
  } else if (['fuseholder', 'bladefuse'].includes(shape)) {
    if (shape === 'bladefuse') {
      const clear = new THREE.MeshPhysicalMaterial({
        color: '#59a3bc',
        transparent: true,
        opacity: 0.61,
        roughness: 0.2,
        transmission: 0.18,
      });
      box(shell, 1.7, 1.27, 0.54, 0, 0.87, 0, clear, 0.08);
      for (const side of [-1, 1]) {
        const p = box(g, 0.37, 1.19, 0.09, side * 0.45, 0.04, 0, silver, 0.025);
        p.userData.terminal = true;
      }
      trace(
        g,
        [
          [-0.45, 0.43, 0],
          [-0.25, 0.75, 0],
          [0.25, 0.75, 0],
          [0.45, 0.43, 0],
        ],
        '#b9ab8b',
        0.022,
      );
    } else {
      box(shell, 2.9, 0.39, 1.17, 0, 0.24, 0, black, 0.06);
      for (const side of [-1, 1]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.055, 7, 22, Math.PI * 1.7),
          silver,
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set(side * 0.95, 0.53, 0);
        g.add(ring);
        pin(side * 0.94, 0, -0.25, 0.59);
      }
    }
    markers.push(
      mark(
        shape === 'bladefuse'
          ? 'Fusible metal element'
          : 'Replaceable fuse contacts',
        0,
        1.42,
        0,
        1.1,
      ),
      mark('Power terminals', 0.65, -0.45, 0),
    );
  } else if (
    [
      'sevenseg',
      'dipswitch',
      'slotopto',
      'photodiode',
      'potentiometer',
      'antenna',
    ].includes(shape)
  ) {
    if (shape === 'sevenseg') {
      box(shell, 1.63, 0.26, 2.25, 0, 0.3, 0, cream, 0.045);
      box(shell, 1.53, 0.04, 2.14, 0, 0.454, 0, black, 0.02);
      const red = new THREE.MeshStandardMaterial({
        color: '#b33139',
        emissive: '#ff3448',
        emissiveIntensity: 0.03,
      });
      for (const z of [-0.76, 0, 0.76])
        box(shell, 0.71, 0.02, 0.1, -0.1, 0.48, z, red, 0.04);
      for (const x of [-0.54, 0.35])
        for (const z of [-0.39, 0.39])
          box(shell, 0.1, 0.02, 0.6, x, 0.48, z, red, 0.04);
      cylinder(shell, 0.075, 0.018, 0.56, 0.486, 0.78, red);
      twoSidedPins(part.pins, 1.33, 1.97);
    } else if (shape === 'dipswitch') {
      const n = Math.floor(part.pins / 2),
        w = Math.max(1.5, n * 0.43);
      box(shell, w, 0.61, 1.29, 0, 0.46, 0, material('#b44243'), 0.035);
      for (let i = 0; i < n; i++) {
        box(
          shell,
          0.28,
          0.025,
          0.72,
          ((i - (n - 1) / 2) * w) / n,
          0.78,
          0,
          black,
          0.02,
        );
        box(
          shell,
          0.22,
          0.14,
          0.29,
          ((i - (n - 1) / 2) * w) / n,
          0.86,
          i % 2 ? 0.2 : -0.2,
          cream,
          0.02,
        );
        label(
          shell,
          String(i + 1),
          ((i - (n - 1) / 2) * w) / n,
          0.782,
          0.52,
          0.24,
          0.14,
        );
      }
      for (let i = 0; i < part.pins; i++)
        pin(
          (((i % n) - (n - 1) / 2) * w) / n,
          i < n ? -0.55 : 0.55,
          -0.14,
          0.6,
        );
    } else if (shape === 'slotopto') {
      box(shell, 2.1, 0.24, 1.21, 0, 0.18, 0, black, 0.045);
      for (const side of [-1, 1]) {
        box(shell, 0.51, 1.37, 1.21, side * 0.78, 0.86, 0, black, 0.04);
        const lens = cylinder(
          g,
          0.15,
          0.055,
          side * 0.5,
          0.93,
          0,
          material(side < 0 ? '#742d46' : '#222333', 0.1, 0.2),
        );
        lens.rotation.z = Math.PI / 2;
      }
      twoSidedPins(part.pins, 1.6, 0.88);
    } else if (shape === 'photodiode') {
      box(shell, 1.3, 0.37, 1.45, 0, 0.33, 0, black, 0.06);
      box(
        shell,
        1.0,
        0.04,
        1.12,
        0,
        0.541,
        0,
        new THREE.MeshPhysicalMaterial({
          color: '#4d4764',
          metalness: 0.15,
          roughness: 0.1,
          transparent: true,
          opacity: 0.55,
        }),
        0.03,
      );
      box(
        g,
        0.85,
        0.02,
        0.95,
        0,
        0.39,
        0,
        material('#724f72', 0.45, 0.24),
        0.015,
      );
      twoSidedPins(part.pins, 1.12, 1.11);
    } else if (shape === 'potentiometer') {
      box(shell, 1.58, 0.78, 1.47, 0, 0.51, 0, blue, 0.08);
      cylinder(shell, 0.4, 0.19, 0, 0.999, 0, cream);
      box(shell, 0.61, 0.025, 0.085, 0, 1.104, 0, black, 0.01);
      for (let i = 0; i < part.pins; i++)
        pin((i - (part.pins - 1) / 2) * 0.53, 0, -0.29, 0.68);
      const track = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.042, 6, 28, Math.PI * 1.65),
        material('#5e4c40'),
      );
      track.rotation.x = Math.PI / 2;
      track.position.y = 0.29;
      g.add(track);
    } else {
      pcb(shell, 1.3, 3.1, material('#355947', 0.1, 0.55));
      const path: number[][] = [];
      for (let i = 0; i < 10; i++) {
        path.push([i % 2 ? 0.44 : -0.44, 0.145, -1.25 + i * 0.24]);
        path.push([i % 2 ? -0.44 : 0.44, 0.145, -1.25 + i * 0.24]);
      }
      trace(shell, path, '#c7aa66', 0.033);
      for (let i = 0; i < part.pins; i++)
        pin((i - (part.pins - 1) / 2) * 0.34, 1.34, -0.16, 0.49);
    }
    markers.push(
      mark(
        shape === 'photodiode'
          ? 'Photosensitive junction'
          : shape === 'slotopto'
            ? 'Emitter / receiver gap'
            : shape === 'potentiometer'
              ? 'Adjustable wiper'
              : shape === 'antenna'
                ? 'Radiating conductor'
                : 'User-visible functional surface',
        0,
        1.57,
        0.16,
        1.1,
      ),
      mark('Electrical connections', 0.75, -0.21, 0.5),
    );
  }
  if (markers.length === 0)
    markers.push(mark('Family construction example', 0, 1.4, 0, 1.1));
  return { group: g, markers };
}
