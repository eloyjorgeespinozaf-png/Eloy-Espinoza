/**
 * Utility to eliminate fake checkerboard transparency or neutral background
 * from uploaded PNG/JPEG images using flood-fill and saturation/luminance analysis.
 */

export async function removeCheckerboardBackground(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          return resolve(imageSrc);
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const w = canvas.width;
        const h = canvas.height;

        // Determine if a pixel matches the grayscale checkerboard pattern
        const isCheckerboardPixel = (idx: number): boolean => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a < 15) return true;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max - min;

          // Neutral gray/white checkerboard: low saturation (< 26), and lightness > 75
          return saturation < 26 && min > 75;
        };

        const visited = new Uint8Array(w * h);
        const queue: number[] = [];

        // Seed with all border pixels
        for (let x = 0; x < w; x++) {
          queue.push(x, 0);
          queue.push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          queue.push(0, y);
          queue.push(w - 1, y);
        }

        let head = 0;
        while (head < queue.length) {
          const x = queue[head++];
          const y = queue[head++];
          const pos = y * w + x;
          if (visited[pos]) continue;
          visited[pos] = 1;

          const idx = pos * 4;
          if (isCheckerboardPixel(idx)) {
            // Make transparent
            data[idx + 3] = 0;

            // Enqueue 4-connected neighbors
            if (x > 0 && !visited[pos - 1]) queue.push(x - 1, y);
            if (x < w - 1 && !visited[pos + 1]) queue.push(x + 1, y);
            if (y > 0 && !visited[pos - w]) queue.push(x, y - 1);
            if (y < h - 1 && !visited[pos + w]) queue.push(x, y + 1);
          }
        }

        // Apply a gentle 1px alpha feather to borders for smooth anti-aliased contour
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const pos = y * w + x;
            const idx = pos * 4;
            if (data[idx + 3] > 0) {
              const leftAlpha = data[(pos - 1) * 4 + 3];
              const rightAlpha = data[(pos + 1) * 4 + 3];
              const upAlpha = data[(pos - w) * 4 + 3];
              const downAlpha = data[(pos + w) * 4 + 3];
              if (leftAlpha === 0 || rightAlpha === 0 || upAlpha === 0 || downAlpha === 0) {
                // If it's a boundary pixel with low saturation, soften alpha
                const max = Math.max(data[idx], data[idx + 1], data[idx + 2]);
                const min = Math.min(data[idx], data[idx + 1], data[idx + 2]);
                if (max - min < 28) {
                  data[idx + 3] = Math.floor(data[idx + 3] * 0.5);
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas background removal fallback:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}
