export const imageFiles = (files) => [...files].filter(f => /\.(png|jpe?g|webp)$/i.test(f.name));
export const sensorFiles = (files) => [...files].filter(f => /\.csv$/i.test(f.name));
export const filePath = (file) => file.webkitRelativePath || file.name;
const stem = (file) => file.name.replace(/\.[^.]+$/, '').toLowerCase();
export function planPairs(images, sensors) {
  const sorted = [...images].sort((a, b) => filePath(a).localeCompare(filePath(b), undefined, { numeric: true }));
  return sorted.map(image => {
    const found = sensors.map((sensor, index) => ({ sensor, index })).filter(x => stem(image) === stem(x.sensor));
    return { image, sensorIndex: images.length === 1 && sensors.length === 1 ? 0 : found.length === 1 ? found[0].index : -1 };
  });
}
export function playlistPosition(position, items) {
  const durations = items.map(item => Math.max(1, Number(item.duration_ms) || 1));
  const total = durations.reduce((a, b) => a + b, 0);
  if (!total) return { index: 0, elapsed: 0 };
  let elapsed = ((position % total) + total) % total;
  for (let index = 0; index < durations.length; index++) {
    if (elapsed < durations[index]) return { index, elapsed };
    elapsed -= durations[index];
  }
  return { index: 0, elapsed: 0 };
}
