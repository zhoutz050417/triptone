import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, applyFilter, fitDimensions, analyzeBrightness } from '../dist/filters.js';

const pixels = new Uint8ClampedArray([60, 100, 140, 255, 200, 160, 120, 128, 0, 0, 0, 0, 255, 255, 255, 255]);

test('zero intensity returns the exact original, including transparency', () => {
  for (const preset of PRESETS) assert.deepEqual(applyFilter(pixels, 2, 2, preset.id, 0), pixels);
});
test('all four styles change color, preserve alpha, and leave source intact', () => {
  const original = new Uint8ClampedArray(pixels);
  const outputs = PRESETS.map(preset => applyFilter(pixels, 2, 2, preset.id, 1));
  for (const output of outputs) {
    assert.notDeepEqual(output, original);
    for (let i = 3; i < output.length; i += 4) assert.equal(output[i], original[i]);
  }
  assert.equal(new Set(outputs.map(output => output.join(','))).size, 4);
  assert.deepEqual(pixels, original);
});
test('repeated renders are deterministic', () => {
  assert.deepEqual(applyFilter(pixels, 2, 2, 'film'), applyFilter(pixels, 2, 2, 'film'));
});
test('resizing preserves ratio and never upscales', () => {
  assert.deepEqual(fitDimensions(6000, 4000, 4096), { width: 4096, height: 2731 });
  assert.deepEqual(fitDimensions(4000, 6000, 4096), { width: 2731, height: 4096 });
  assert.deepEqual(fitDimensions(800, 600, 4096), { width: 800, height: 600 });
});
test('automatic exposure lifts dark images and can be disabled', () => {
  const dark = new Uint8ClampedArray([40, 40, 40, 255]);
  const automatic = applyFilter(dark, 1, 1, 'coast', 1, true);
  const manual = applyFilter(dark, 1, 1, 'coast', 1, false);
  assert.ok(automatic[0] > manual[0]);
});
test('transparent pixels do not darken exposure analysis', () => {
  const source = new Uint8ClampedArray(68);
  source.set([0, 0, 0, 0], 0);
  source.set([180, 180, 180, 255], 64);
  assert.equal(Math.round(analyzeBrightness(source)), 180);
  assert.equal(analyzeBrightness(new Uint8ClampedArray(4)), 128);
});
test('invalid presets and inconsistent dimensions are rejected', () => {
  assert.throws(() => applyFilter(pixels, 2, 2, 'missing'));
  assert.throws(() => applyFilter(pixels, 5, 5, 'film'));
});

test('reference mood lowers brightness and chroma without crushing midtone detail', () => {
  const source = new Uint8ClampedArray([160, 120, 80, 255, 80, 80, 80, 255, 160, 160, 160, 255]);
  const result = applyFilter(source, 3, 1, 'city', 1, false);
  const luminance = data => data[0] * 0.2126 + data[1] * 0.7152 + data[2] * 0.0722;
  assert.ok(luminance(result) < luminance(source));
  assert.ok(Math.max(...result.slice(0, 3)) - Math.min(...result.slice(0, 3)) < 40);
  assert.ok(result[4] > 30 && result[8] > result[4] + 35);
});

test('auto light keeps the mood dark and zero intensity still gives the original', () => {
  const source = new Uint8ClampedArray([60, 60, 60, 255]);
  const manual = applyFilter(source, 1, 1, 'city', 1, false);
  const automatic = applyFilter(source, 1, 1, 'city', 1, true);
  assert.ok(automatic[0] < source[0]);
  assert.ok(automatic[0] - manual[0] <= 5);
  assert.deepEqual(applyFilter(source, 1, 1, 'city', 0, true), source);
});
