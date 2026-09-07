import * as THREE from 'three';
import { material, box, cylinder, trace, movable } from './model-utils.ts';
import type { Part } from './catalog';
import type { Model } from './models';
export const SPECIAL_SHAPES = new Set([
  'smdrgb',
  'ambientlight',
  'irreceiver',
  'reflective',
  'phototransistor',
  'irled',
  'axialinductor',
  'radialmlcc',
  'ceramicresonator',
  'solderterminal',
  'faston',
  'pluggable',
]);
export function createSpecialModel(part: Part): Model {
  const g = new THREE.Group(),
    shell = movable(g, 0, 1.1),
    silver = material('#b7c6cd', 0.84, 0.26),
    gold = material('#c6a86b', 0.8, 0.27),
    black = material('#21252e', 0.08, 0.45),
    cream = material('#e1d9bf', 0.03, 0.54);
  const shape = part.shape,
    markers: Model['markers'] = [];
  const marker = (
    label: string,
    x: number,
    y: number,
    z: number,
    explode = 0,
  ) => markers.push({ label, point: new THREE.Vector3(x, y, z), explode });
  const terminal = (
    x: number,
    y: number,
    z: number,
    w = 0.08,
    h = 0.9,
    d = 0.08,
  ) => {
    const p = box(g, w, h, d, x, y, z, silver, 0.01);
    p.userData.terminal = true;
    return p;
  };
  if (shape === 'smdrgb' || shape === 'ambientlight') {
    const rgb = shape === 'smdrgb';
    box(g, 1.85, 0.1, 1.85, 0, 0.1, 0, rgb ? cream : black, 0.07);
    for (let i = 0; i < part.pins; i++) {
      const half = Math.ceil(part.pins / 2);
      terminal(
        (((i % half) - (half - 1) / 2) * 1.35) / Math.max(half - 1, 1),
        0.03,
        i < half ? -0.8 : 0.8,
        0.24,
        0.07,
        0.38,
      );
    }
    if (rgb) {
      for (const side of [-1, 1]) {
        box(shell, 1.85, 0.45, 0.24, 0, 0.39, side * 0.81, cream, 0.07);
        box(shell, 0.24, 0.45, 1.4, side * 0.81, 0.39, 0, cream, 0.07);
      }
      const _reflector = cylinder(g, 0.7, 0.04, 0, 0.19, 0, silver);
      const lens = new THREE.MeshPhysicalMaterial({
        color: '#e6ece9',
        transparent: true,
        opacity: 0.24,
        roughness: 0.12,
      });
      cylinder(shell, 0.71, 0.065, 0, 0.56, 0, lens);
      ['#ff3344', '#42ef7c', '#4786ff'].forEach((color, i) => {
        const emitter = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.03,
        });
        const die = box(
          g,
          0.26,
          0.055,
          0.28,
          (i - 1) * 0.38,
          0.25,
          -0.15,
          emitter,
          0.015,
        );
        die.userData.emitter = true;
        die.userData.rgbChannel = i + 1;
        trace(
          g,
          [
            [(i - 1) * 0.38, 0.27, -0.15],
            [(i - 1) * 0.42, 0.41, 0.09],
            [(i - 1) * 0.48, 0.22, 0.51],
          ],
          '#ccb276',
          0.014,
        );
      });
      box(g, 0.53, 0.05, 0.24, 0, 0.25, 0.38, black, 0.01);
      marker('Integrated LED controller', 0, 0.75, 0.4);
      marker('RGB emitter dies', 0, 0.62, -0.38);
    } else {
      box(shell, 1.83, 0.43, 1.83, 0, 0.36, 0, black, 0.04);
      const _lens = cylinder(
        shell,
        0.48,
        0.03,
        0,
        0.589,
        0,
        new THREE.MeshPhysicalMaterial({
          color: '#576878',
          metalness: 0.15,
          roughness: 0.08,
          transparent: true,
          opacity: 0.7,
        }),
      );
      box(
        g,
        0.83,
        0.04,
        0.85,
        0,
        0.24,
        0,
        material('#655781', 0.5, 0.22),
        0.015,
      );
      marker('Optical sensing window', 0, 0.85, 0, 1.1);
      marker('Photodetector and conversion circuit', 0, 0.28, 0.6);
    }
  } else if (
    ['irreceiver', 'reflective', 'phototransistor', 'irled'].includes(shape)
  ) {
    const reflector = shape === 'reflective',
      receiver = shape === 'irreceiver',
      n = reflector ? 2 : 1;
    box(shell, reflector ? 2.0 : 1.2, 0.2, 1.13, 0, 0.2, 0, black, 0.07);
    for (let i = 0; i < n; i++) {
      const x = reflector ? (i - 0.5) * 0.94 : 0;
      if (receiver) {
        box(shell, 1.15, 1.38, 0.77, x, 1.0, -0.07, black, 0.09);
        const lens = new THREE.Mesh(
          new THREE.SphereGeometry(0.47, 22, 16),
          new THREE.MeshPhysicalMaterial({
            color: '#352b43',
            roughness: 0.13,
            metalness: 0.05,
          }),
        );
        lens.scale.set(1, 1, 0.55);
        lens.position.set(x, 1.09, 0.32);
        shell.add(lens);
      } else {
        const glass = new THREE.MeshPhysicalMaterial({
          color:
            shape === 'irled'
              ? '#62537a'
              : reflector && i === 1
                ? '#30283e'
                : '#c6e0de',
          roughness: 0.12,
          transparent: true,
          opacity: reflector && i === 1 ? 0.85 : 0.4,
          transmission: 0.15,
        });
        cylinder(shell, 0.42, 0.83, x, 0.75, 0, glass);
        const lens = new THREE.Mesh(
          new THREE.SphereGeometry(
            0.42,
            22,
            14,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          glass,
        );
        lens.position.set(x, 1.16, 0);
        shell.add(lens);
      }
      box(
        g,
        0.37,
        0.04,
        0.37,
        x,
        0.59,
        0,
        material(i === 0 && reflector ? '#82374a' : '#525180', 0.5, 0.25),
        0.02,
      );
      trace(
        g,
        [
          [x, 0.61, 0],
          [x + 0.21, 0.78, 0],
          [x + 0.31, 0.37, 0],
        ],
        '#cbb276',
        0.016,
      );
    }
    for (let i = 0; i < part.pins; i++)
      terminal((i - (part.pins - 1) / 2) * (reflector ? 0.4 : 0.34), -0.27, 0);
    marker(
      reflector
        ? 'Adjacent emitter and detector'
        : receiver
          ? 'Filtered infrared receiver'
          : shape === 'irled'
            ? 'Infrared emitting junction'
            : 'Light-controlled transistor',
      0,
      1.89,
      0,
      1.1,
    );
    marker('Device-specific lead assignment', 0.6, -0.5, 0.2);
  } else if (shape === 'axialinductor') {
    const body = cylinder(
      shell,
      0.39,
      1.75,
      0,
      0.51,
      0,
      material('#638663', 0.03, 0.5),
    );
    body.rotation.z = Math.PI / 2;
    for (const [x, color] of [
      [-0.5, '#92603d'],
      [-0.2, '#20252c'],
      [0.1, '#af5744'],
      [0.5, '#c2a967'],
    ] as const) {
      const band = cylinder(
        shell,
        0.397,
        0.13,
        x,
        0.51,
        0,
        material(color, 0.1, 0.5),
      );
      band.rotation.z = Math.PI / 2;
    }
    const core = cylinder(g, 0.14, 1.5, 0, 0.51, 0, black);
    core.rotation.z = Math.PI / 2;
    const points = [];
    for (let i = 0; i <= 360; i++) {
      const t = i / 360,
        a = t * 24 * Math.PI;
      points.push(
        new THREE.Vector3(
          -0.69 + t * 1.38,
          0.51 + Math.cos(a) * 0.25,
          Math.sin(a) * 0.25,
        ),
      );
    }
    g.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          360,
          0.022,
          5,
          false,
        ),
        gold,
      ),
    );
    for (const side of [-1, 1])
      terminal(side * 1.43, 0.51, 0, 0.85, 0.055, 0.055);
    marker('Axial copper winding', 0, 0.86, 0.2);
    marker('Inductance color bands', 0, 1.08, 0, 1.1);
  } else if (shape === 'radialmlcc' || shape === 'ceramicresonator') {
    const res = shape === 'ceramicresonator';
    box(
      shell,
      res ? 1.8 : 1.55,
      res ? 0.97 : 1.2,
      0.58,
      0,
      0.93,
      0,
      material(res ? '#b9814b' : '#c5a95a', 0.04, 0.49),
      0.17,
    );
    for (let i = 0; i < part.pins; i++)
      terminal((i - (part.pins - 1) / 2) * 0.54, -0.02, 0, 0.07, 1.1, 0.07);
    if (res) {
      box(g, 0.91, 0.035, 0.39, 0, 0.86, 0, material('#d0c7bc'), 0.01);
      for (const x of [-0.48, 0.48])
        box(g, 0.28, 0.07, 0.27, x, 0.58, 0, cream, 0.025);
      marker('Ceramic resonator element', 0, 1.14, 0.27);
      marker('Resonator coating', 0, 1.63, 0, 1.1);
    } else {
      for (let i = 0; i < 10; i++)
        box(
          g,
          1.03,
          0.02,
          0.39,
          i % 2 ? 0.04 : -0.04,
          0.6 + i * 0.045,
          0,
          i % 2 ? silver : cream,
          0.005,
        );
      marker('Multilayer ceramic stack', 0, 1.14, 0.27);
      marker('Radial protective coating', 0, 1.77, 0, 1.1);
    }
  } else if (shape === 'solderterminal' || shape === 'faston') {
    if (shape === 'solderterminal') {
      const form = new THREE.Shape();
      form.moveTo(-0.55, 0);
      form.lineTo(0.55, 0);
      form.lineTo(0.55, 1.15);
      form.quadraticCurveTo(0, 1.72, -0.55, 1.15);
      form.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, 0.93, 0.25, 0, Math.PI * 2, true);
      form.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(form, {
        depth: 0.12,
        bevelEnabled: false,
        curveSegments: 16,
      });
      const plate = new THREE.Mesh(geo, silver);
      plate.position.set(0, 0.16, -0.06);
      shell.add(plate);
      for (let i = 0; i < part.pins; i++)
        terminal((i - (part.pins - 1) / 2) * 0.5, -0.2, 0, 0.14, 0.72, 0.12);
      marker('Solder eyelet', 0, 1.4, 0, 1.1);
    } else {
      box(shell, 0.64, 1.53, 0.07, -0.65, 0.93, 0, silver, 0.035);
      box(shell, 0.66, 0.08, 0.74, 0.65, 0.65, 0, silver, 0.04);
      for (const side of [-1, 1])
        box(shell, 0.08, 0.36, 0.74, 0.65 + side * 0.29, 0.81, 0, silver, 0.02);
      for (let i = 0; i < part.pins; i++)
        terminal((i - (part.pins - 1) / 2) * 1.3, -0.16, 0, 0.18, 0.71, 0.09);
      marker('Blade and spring receptacle', 0, 1.87, 0, 1.1);
    }
  } else if (shape === 'pluggable') {
    const n = part.pins,
      w = n * 0.84,
      green = material('#39816b');
    box(g, w, 0.25, 1.25, 0, 0.2, 0, green, 0.05);
    box(shell, w, 0.8, 1.15, 0, 0.92, 0, green, 0.045);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.84;
      terminal(x, -0.23, 0, 0.11, 0.68, 0.11);
      box(g, 0.13, 0.63, 0.13, x, 0.56, 0, gold, 0.02);
      box(shell, 0.5, 0.37, 0.04, x, 0.95, 0.59, black, 0.04);
      cylinder(shell, 0.21, 0.04, x, 1.337, -0.15, silver);
      box(shell, 0.29, 0.015, 0.05, x, 1.363, -0.15, black, 0.007);
    }
    marker('Removable wire plug', 0, 1.7, 0, 1.1);
    marker('PCB mating header', 0, 0.35, 0.67);
  }
  if (markers.length === 0) marker('Surface-mount contacts', 0.85, 0.11, 0.6);
  return { group: g, markers };
}
