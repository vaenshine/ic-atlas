import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parts, packageInfo } from '../app/catalog.ts';
import { createModel, disposeGroup, optimizeExhibit } from '../app/models.ts';
// Model geometry can be checked independently of WebGL. A minimal canvas shim
// supports text textures; this check makes no assertions about rendered pixels.
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      scale() {},
      clearRect() {},
      fillRect() {},
      fillText() {},
    }),
  }),
};
assert.equal(parts.length, 100);
assert.equal(new Set(parts.map((p) => p.id)).size, parts.length);
for (const shape of Object.keys(packageInfo))
  assert(
    parts.some((p) => p.shape === shape),
    shape,
  );
for (const id of [
  'ne555',
  'stm32',
  'rp2040',
  'am3358',
  'wroom',
  'esp32dev',
  'mpu6050',
  'lm358',
  'mcp3008',
  'drv8833',
])
  assert(parts.some((p) => p.id === id));
const results = [];
for (const part of parts) {
  const model = createModel(part);
  model.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model.group);
  assert(!bounds.isEmpty(), part.id);
  assert(
    bounds.min.toArray().every(Number.isFinite) &&
      bounds.max.toArray().every(Number.isFinite),
    part.id,
  );
  let pins = 0,
    terminals = 0,
    meshes = 0;
  model.group.traverse((o) => {
    if (o.userData.pin !== undefined) pins++;
    if (o.userData.terminal) terminals++;
    if (o instanceof THREE.Mesh) {
      meshes++;
      const a = o.geometry.attributes.position;
      for (let i = 0; i < a.array.length; i++)
        assert(Number.isFinite(a.array[i]), `${part.id}: invalid vertex`);
    }
  });
  if (
    ['dip', 'soic', 'tssop', 'qfp', 'qfn', 'sot23', 'sot236'].includes(
      part.shape,
    )
  )
    assert.equal(pins, part.pins, `${part.id}: incorrect lead count`);
  if (
    part.kind === 'basic' ||
    ['to263', 'to2205', 'bjt', 'to220'].includes(part.shape)
  )
    assert.equal(terminals, part.pins, `${part.id}: terminal count`);
  for (const field of [
    'id',
    'name',
    'subtitle',
    'family',
    'package',
    'description',
    'tip',
    'source',
  ])
    assert(
      typeof part[field] === 'string' && part[field].length > 0,
      `${part.id}: missing ${field}`,
    );
  assert.equal(part.specs.length, 4, `${part.id}: specs`);
  assert.equal(part.steps.length, 3, `${part.id}: application steps`);
  model.group.traverse((o) => {
    if (o.userData.explode !== undefined)
      o.position.y = o.userData.baseY + o.userData.explode;
  });
  assert(
    new THREE.Box3().setFromObject(model.group).max.y > bounds.max.y,
    `${part.id}: explosion`,
  );
  disposeGroup(model.group);
  const exhibit = createModel(part);
  optimizeExhibit(exhibit.group);
  let optimized = 0;
  exhibit.group.traverse((o) => {
    if (o instanceof THREE.Mesh) optimized++;
  });
  results.push({ id: part.id, meshes, optimized });
  disposeGroup(exhibit.group);
}
console.log(
  JSON.stringify(
    {
      parts: parts.length,
      packages: Object.keys(packageInfo).length,
      geometry: 'finite',
      pinCounts: 'verified',
      explodedViews: 'verified',
      originalMeshes: results.reduce((s, r) => s + r.meshes, 0),
      galleryMeshes: results.reduce((s, r) => s + r.optimized, 0),
    },
    null,
    2,
  ),
);
