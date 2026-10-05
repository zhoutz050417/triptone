// Pure pixel operations, shared by browser rendering and Node tests.
export const PRESETS = [
  { id: 'film', name: '暖调胶片', english: 'GOLDEN DAYS', description: '暖阳 / 颗粒 / 旧时光', contrast: 0.96, saturation: 0.86, gamma: 0.96, lift: 7, tint: [10, 3, -9], shadows: [3, 2, 1], grain: 2.4, vignette: 0.09 },
  { id: 'coast', name: '清透海边', english: 'COASTAL AIR', description: '清透 / 蓝绿 / 自由感', contrast: 1.05, saturation: 1.13, gamma: 0.92, lift: 1, tint: [-5, 4, 10], shadows: [-2, 4, 7], grain: 0, vignette: 0 },
  // Inspired by the user's reference: lower exposure, desaturation and partial monochrome.
  { id: 'city', name: '情绪冷灰', english: 'IN MY FEELINGS', description: '暗调 / 低饱和 / 情绪感', contrast: 1.03, saturation: 0.44, gamma: 1.10, lift: 0, tint: [-2, 0, 3], shadows: [0, 0, 1], grain: 0, vignette: 0, exposure: -0.28, brightness: -4, autoExposureScale: 0.25 },
  { id: 'dusk', name: '柔和暮色', english: 'AFTER THE SUN', description: '柔粉 / 低对比 / 梦境感', contrast: 0.89, saturation: 0.86, gamma: 0.94, lift: 4, tint: [10, -4, 6], shadows: [5, -2, 5], grain: 1.2, vignette: 0.05 },
];

export function fitDimensions(width, height, maxSide) {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export function analyzeBrightness(data) {
  let brightness = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i += 64) {
    const alpha = data[i + 3] / 255;
    brightness += (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) * alpha;
    weight += alpha;
  }
  return weight ? brightness / weight : 128;
}

export function applyFilter(source, width, height, presetId, amount = 0.75, autoLight = true, brightness) {
  const preset = PRESETS.find(item => item.id === presetId);
  if (!preset) throw new Error('Unknown preset');
  if (source.length !== width * height * 4) throw new Error('Image dimensions do not match pixels');
  const output = new Uint8ClampedArray(source);
  const strength = Math.max(0, Math.min(1, amount));
  if (!strength) return output;
  const mean = brightness ?? analyzeBrightness(source);
  // Conservative correction: preserve intentional dark and bright scenes.
  const exposure = autoLight ? Math.max(-0.10, Math.min(0.16, (122 - mean) / 400)) * (preset.autoExposureScale ?? 1) : 0;
  const lookup = [new Float32Array(256), new Float32Array(256), new Float32Array(256)];
  for (let channel = 0; channel < 3; channel++) {
    for (let value = 0; value < 256; value++) {
      const corrected = Math.min(255, value * (1 + exposure) * Math.pow(2, preset.exposure ?? 0));
      const tone = (Math.pow(corrected / 255, preset.gamma) * 255 - 128) * preset.contrast + 128;
      lookup[channel][value] = tone + (preset.brightness ?? 0) + preset.lift * (1 - corrected / 255) + preset.tint[channel] + preset.shadows[channel] * Math.pow(1 - corrected / 255, 2);
    }
  }
  for (let i = 0; i < source.length; i += 4) {
    const red = lookup[0][source[i]];
    const green = lookup[1][source[i + 1]];
    const blue = lookup[2][source[i + 2]];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const pixel = i / 4;
    const x = (pixel % width) / Math.max(1, width - 1) * 2 - 1;
    const y = Math.floor(pixel / width) / Math.max(1, height - 1) * 2 - 1;
    const vignette = 1 - preset.vignette * (x * x + y * y) / 2;
    // Deterministic texture: changing strength doesn't produce flickering grain.
    const grain = (((Math.imul(pixel + 1, 2654435761) >>> 16) & 255) / 255 - 0.5) * preset.grain;
    for (let channel = 0; channel < 3; channel++) {
      const color = channel === 0 ? red : channel === 1 ? green : blue;
      const filtered = Math.max(0, Math.min(255, (luminance + (color - luminance) * preset.saturation) * vignette + grain));
      output[i + channel] = source[i + channel] * (1 - strength) + filtered * strength;
    }
  }
  return output;
}
