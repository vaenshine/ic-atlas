import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parts } from '../app/catalog.ts';
import { createModel, disposeGroup, optimizeExhibit } from '../app/models.ts';
import {
  categoryIn,
  profiles as saved,
  translations as savedTranslations,
  searchText,
  normalizeSearch,
  originalIn,
} from '../app/atlas.ts';
import { domains, markerText } from '../app/i18n.ts';
import { FAMILY_SHAPES } from '../app/family-models.ts';
const profiles = saved;
const translations = savedTranslations;
const requested = JSON.parse(
  readFileSync(
    new URL('./fixtures/requested-categories.json', import.meta.url),
    'utf8',
  ),
);
globalThis.document = {
  // eslint-disable-next-line typescript/no-deprecated -- Canvas shim for geometry checks.
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
const failures = [];
let meshes = 0,
  galleryMeshes = 0;
const terminals = [];
function checkText(t, id, pinCount = 3) {
  for (const f of ['name', 'subtitle', 'description', 'tip'])
    assert(typeof t[f] === 'string' && t[f].trim().length > 0, `${id}: ${f}`);
  for (const field of ['specs', 'pinNotes'])
    for (const pair of t[field]) {
      assert.equal(pair.length, 2);
      assert(pair.every((v) => typeof v === 'string' && v.length > 0));
    }
  for (const field of ['uses', 'steps'])
    assert(t[field].every((v) => typeof v === 'string' && v.length > 0));
  for (const [f, n] of [
    ['specs', 4],
    ['uses', 3],
    ['pinNotes', pinCount],
    ['steps', 3],
  ])
    assert.equal(t[f].length, n, `${id}: ${f}`);
}
assert.equal(profiles.length, 200);
assert.equal(new Set(profiles.map((p) => p.id)).size, 200);
profiles.forEach((p, i) => {
  assert.equal(p.id, `cat-${String(i + 1).padStart(3, '0')}`);
  assert.equal(p.index, i + 1);
  assert.equal(p.zh, requested[i]);
  assert(searchText(p.id).includes(normalizeSearch(p.en)));
  assert(searchText(p.id).includes(normalizeSearch(p.zh)));
});
assert(searchText('cat-010').includes(normalizeSearch('DC‑DC')));
assert.equal(Object.keys(translations).length, 100);
for (const part of parts) {
  assert(translations[part.id], `${part.id}: missing English`);
  checkText(translations[part.id], part.id, part.pinNotes.length);
  for (const field of ['family', 'package'])
    assert(
      typeof translations[part.id][field] === 'string' &&
        translations[part.id][field].length > 0,
    );
  for (let i = 0; i < part.specs.length; i++) {
    const expected = part.specs[i][1].match(/\d+(?:\.\d+)?/g) || [];
    const actual =
      translations[part.id].specs[i][1].match(/\d+(?:\.\d+)?/g) || [];
    assert.deepEqual(
      actual,
      expected,
      `${part.id}: numeric specification ${i}`,
    );
  }
  const model = createModel(originalIn(part, 'en'));
  for (const marker of model.markers)
    assert(
      !/[\u4e00-\u9fff]/.test(markerText(marker.label, 'en')),
      `${part.id}: untranslated marker ${marker.label}`,
    );
  disposeGroup(model.group);

  assert(
    !/[\u4e00-\u9fff]/.test(JSON.stringify(translations[part.id])),
    `${part.id}: Chinese in English translation`,
  );
}
for (const p of profiles) {
  try {
    assert(domains[p.group], `${p.id}: unknown domain`);
    assert(p.source.startsWith('https://'));
    assert.equal(p.enText.name, p.en);
    assert.equal(p.zhText.name, p.zh);
    checkText(p.enText, p.id + ' en');
    checkText(p.zhText, p.id + ' zh');
    assert(
      !/[\u4e00-\u9fff]/.test(JSON.stringify(p.enText)),
      `${p.id}: Chinese in English`,
    );
    for (const id of p.existingIds)
      assert(
        parts.some((x) => x.id === id),
        `${p.id}: unknown example ${id}`,
      );
    const model = createModel(categoryIn(p, 'en'));
    const bounds = new THREE.Box3().setFromObject(model.group);
    assert(!bounds.isEmpty(), `${p.id}: empty geometry`);
    assert(
      [...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite),
      `${p.id}: bounds`,
    );
    let pins = 0,
      count = 0,
      balls = 0;
    model.group.traverse((o) => {
      if (o.userData.balls) balls += o.userData.balls;
      if (o.userData.pin !== undefined) pins++;
      if (o.userData.terminal) count++;
      if (o instanceof THREE.Mesh) {
        meshes++;
        assert(
          o.geometry.attributes.position.array.every(Number.isFinite),
          `${p.id}: vertex`,
        );
      }
    });
    if (
      ['dip', 'soic', 'tssop', 'qfp', 'qfn', 'sot23', 'sot236'].includes(
        p.shape,
      )
    )
      assert.equal(pins, p.pins, `${p.id} ${p.shape}: leads`);
    if (p.shape === 'bga')
      assert.equal(balls, p.pins, `${p.id}: BGA ball count`);
    if (
      FAMILY_SHAPES.has(p.shape) ||
      [
        'diode',
        'glassdiode',
        'sma',
        'bjt',
        'mosfet',
        'to220',
        'resistor',
        'ceramic',
        'electrolytic',
        'led',
        'rgbled',
        'tactile',
        'slideswitch',
        'usbc',
        'jst',
        'header',
        'terminal',
      ].includes(p.shape)
    )
      assert.equal(count, p.pins, `${p.id} ${p.shape}: terminals`);
    terminals.push({
      id: p.id,
      shape: p.shape,
      requested: p.pins,
      count,
      pins,
    });
    for (const m of model.markers) {
      assert(m.point.toArray().every(Number.isFinite));
      assert(
        !/[\u4e00-\u9fff]/.test(markerText(m.label, 'en')),
        `${p.id}: untranslated label ${m.label}`,
      );
    }
    model.group.traverse((o) => {
      if (o.userData.explode !== undefined)
        o.position.y = o.userData.baseY + o.userData.explode;
    });
    assert(
      new THREE.Box3().setFromObject(model.group).max.y > bounds.max.y,
      `${p.id} ${p.shape}: explosion`,
    );
    disposeGroup(model.group);
    const exhibit = createModel(categoryIn(p, 'en'));
    optimizeExhibit(exhibit.group);
    exhibit.group.traverse((o) => {
      if (o instanceof THREE.Mesh) galleryMeshes++;
    });
    disposeGroup(exhibit.group);
  } catch (error) {
    failures.push(error.message);
  }
}
console.log(
  JSON.stringify(
    {
      categories: profiles.length,
      englishDevices: Object.keys(translations).length,
      shapes: new Set(profiles.map((p) => p.shape)).size,
      meshes,
      galleryMeshes,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
