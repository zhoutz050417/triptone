import { PRESETS, applyFilter, analyzeBrightness, fitDimensions } from './filters.js';

const $ = id => document.getElementById(id);
const originalCanvas = $('original-canvas');
const resultCanvas = $('result-canvas');
const originalContext = originalCanvas.getContext('2d', { willReadFrequently: true });
const resultContext = resultCanvas.getContext('2d');
const state = { image: null, pixels: null, brightness: 128, preset: 'film', amount: 0.75, autoLight: true, compare: true, filename: 'triptone-demo', loadId: 0, exporting: false };
let toastTimer;
let renderFrame;
let dragDepth = 0;

function notify(message, error = false) {
  clearTimeout(toastTimer);
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  $('status').hidden = false;
  toastTimer = setTimeout(() => { $('status').hidden = true; }, error ? 6500 : 3500);
}

for (const preset of PRESETS) {
  const button = document.createElement('button');
  button.className = 'preset';
  button.dataset.preset = preset.id;
  button.setAttribute('aria-pressed', String(preset.id === state.preset));
  button.innerHTML = `<canvas aria-hidden="true"></canvas><span class="preset-name">${preset.name}</span><span class="preset-description">${preset.description}</span>`;
  button.addEventListener('click', () => {
    state.preset = preset.id;
    for (const item of $('preset-list').children) item.setAttribute('aria-pressed', String(item === button));
    $('result-label').textContent = preset.name;
    scheduleRender();
  });
  $('preset-list').append(button);
}

function render() {
  if (!state.pixels) return;
  const data = applyFilter(state.pixels.data, originalCanvas.width, originalCanvas.height, state.preset, state.amount, state.autoLight, state.brightness);
  resultContext.putImageData(new ImageData(data, originalCanvas.width, originalCanvas.height), 0, 0);
}

function scheduleRender() {
  cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(render);
}

function renderThumbnails() {
  if (!state.image) return;
  const dimensions = fitDimensions(state.image.naturalWidth, state.image.naturalHeight, 320);
  const buffer = document.createElement('canvas');
  buffer.width = dimensions.width;
  buffer.height = dimensions.height;
  const context = buffer.getContext('2d', { willReadFrequently: true });
  context.drawImage(state.image, 0, 0, buffer.width, buffer.height);
  const source = context.getImageData(0, 0, buffer.width, buffer.height);
  for (const button of $('preset-list').children) {
    const canvas = button.querySelector('canvas');
    canvas.width = buffer.width;
    canvas.height = buffer.height;
    const data = applyFilter(source.data, buffer.width, buffer.height, button.dataset.preset, 0.75, state.autoLight, state.brightness);
    canvas.getContext('2d').putImageData(new ImageData(data, buffer.width, buffer.height), 0, 0);
  }
}

async function loadImage(url, filename, isDemo = false) {
  const loadId = ++state.loadId;
  $('download-button').disabled = true;
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (loadId !== state.loadId) return;
    if (image.naturalWidth * image.naturalHeight > 50000000) throw new Error('图片像素过大，请先缩小到 5000 万像素以内。');
    const dimensions = fitDimensions(image.naturalWidth, image.naturalHeight, 1400);
    originalCanvas.width = resultCanvas.width = dimensions.width;
    originalCanvas.height = resultCanvas.height = dimensions.height;
    originalContext.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    state.image = image;
    state.pixels = originalContext.getImageData(0, 0, dimensions.width, dimensions.height);
    state.brightness = analyzeBrightness(state.pixels.data);
    state.filename = filename.replace(/\.[^.]+$/, '') || 'triptone';
    $('image-frame').style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
    $('image-frame').style.maxWidth = `${520 * dimensions.width / dimensions.height}px`;
    $('image-frame').hidden = false;
    $('empty-state').hidden = true;
    $('image-info').textContent = `${isDemo ? '示例照片' : filename} · ${image.naturalWidth} × ${image.naturalHeight}`;
    const exported = fitDimensions(image.naturalWidth, image.naturalHeight, 4096);
    const resized = exported.width !== image.naturalWidth || exported.height !== image.naturalHeight;
    $('resize-note').hidden = !resized;
    $('resize-note').textContent = `大图将导出为 ${exported.width} × ${exported.height} 像素（最长边 4096），以保证浏览器处理稳定。`;
    renderThumbnails();
    render();
    if (!isDemo) notify('照片已准备好，选一种喜欢的感觉。');
  } catch (error) {
    if (loadId !== state.loadId) return;
    notify(error.message.includes('5000') ? error.message : '这张图片无法读取，请换一张 JPG、PNG 或 WEBP 图片。', true);
    if (!state.image) {
      $('image-frame').hidden = true;
      $('empty-state').hidden = false;
      $('image-info').textContent = '上传一张照片开始';
    }
  } finally {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    if (loadId === state.loadId) $('download-button').disabled = !state.image || state.exporting;
  }
}

function openFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    notify('请选择 JPG、PNG 或 WEBP。HEIC 照片请先转换为 JPG。', true);
    return;
  }
  if (file.size > 30 * 1024 * 1024) {
    notify('图片超过 30 MB，请压缩后再上传。', true);
    return;
  }
  loadImage(URL.createObjectURL(file), file.name);
}

$('file-input').addEventListener('change', event => {
  openFile(event.target.files[0]);
  event.target.value = '';
});
$('demo-button').addEventListener('click', () => loadImage('assets/demo.jpg', 'triptone-demo', true));
$('intensity').addEventListener('input', event => {
  const value = Number(event.target.value);
  state.amount = value / 100;
  $('intensity-value').textContent = `${value}%`;
  event.target.style.background = `linear-gradient(to right, #526d45 ${value}%, #dfe4d4 ${value}%)`;
  scheduleRender();
});
$('auto-light').addEventListener('change', event => {
  state.autoLight = event.target.checked;
  renderThumbnails();
  scheduleRender();
});

function updateComparison() {
  const value = $('compare-slider').value;
  resultCanvas.style.clipPath = state.compare ? `inset(0 0 0 ${value}%)` : 'none';
  $('compare-line').style.left = `${value}%`;
  $('compare-line').hidden = !state.compare;
  $('compare-slider').hidden = !state.compare;
  document.querySelector('.original-label').hidden = !state.compare;
  $('compare-button').textContent = state.compare ? '关闭对比' : '对比原图';
  $('compare-button').setAttribute('aria-pressed', String(state.compare));
}
$('compare-slider').addEventListener('input', updateComparison);
$('compare-button').addEventListener('click', () => { state.compare = !state.compare; updateComparison(); });

// Keep files dropped outside the editor from navigating away from the app.
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());
$('drop-zone').addEventListener('dragenter', event => {
  event.preventDefault();
  dragDepth++;
  $('drop-overlay').hidden = false;
});
$('drop-zone').addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $('drop-overlay').hidden = true;
});
$('drop-zone').addEventListener('drop', event => {
  event.preventDefault();
  dragDepth = 0;
  $('drop-overlay').hidden = true;
  openFile(event.dataTransfer.files[0]);
});

$('download-button').addEventListener('click', async () => {
  if (!state.image || state.exporting) return;
  // Snapshot settings so an export stays consistent if controls change.
  const settings = { ...state, format: $('export-format').value };
  state.exporting = true;
  $('download-button').disabled = true;
  $('download-button').firstElementChild.textContent = '正在准备照片…';
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  let canvas;
  try {
    const dimensions = fitDimensions(settings.image.naturalWidth, settings.image.naturalHeight, 4096);
    canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(settings.image, 0, 0, canvas.width, canvas.height);
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = applyFilter(source.data, canvas.width, canvas.height, settings.preset, settings.amount, settings.autoLight, settings.brightness);
    context.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
    if (settings.format === 'jpeg') {
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, `image/${settings.format}`, 0.95));
    if (!blob) throw new Error('Export failed');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${settings.filename}-${settings.preset}-${Math.round(settings.amount * 100)}.${settings.format === 'jpeg' ? 'jpg' : 'png'}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    notify('照片已生成。若未自动保存，请查看浏览器下载提示。');
  } catch {
    notify('保存失败，可能是图片过大或浏览器内存不足。请缩小图片后重试。', true);
  } finally {
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    state.exporting = false;
    $('download-button').disabled = !state.image;
    $('download-button').firstElementChild.textContent = '保存这份感觉';
  }
});

$('about-button').addEventListener('click', () => $('about-dialog').showModal());
$('close-about').addEventListener('click', () => $('about-dialog').close());
loadImage('assets/demo.jpg', 'triptone-demo', true);
