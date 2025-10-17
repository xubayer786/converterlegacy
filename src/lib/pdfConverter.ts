import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker - use local worker for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ConvertedImage {
  id: string;
  dataUrl: string;
  filename: string;
  pageNumber: number;
  width: number;
  height: number;
}

interface CropBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const detectBorders = (
  imageData: ImageData,
  threshold: number = 245
): CropBounds => {
  const { data, width, height } = imageData;
  let top = 0,
    bottom = height - 1,
    left = 0,
    right = width - 1;

  // Detect top border
  for (let y = 0; y < height; y++) {
    let hasContent = false;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < threshold || g < threshold || b < threshold) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      top = y;
      break;
    }
  }

  // Detect bottom border
  for (let y = height - 1; y >= top; y--) {
    let hasContent = false;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < threshold || g < threshold || b < threshold) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      bottom = y;
      break;
    }
  }

  // Detect left border
  for (let x = 0; x < width; x++) {
    let hasContent = false;
    for (let y = top; y <= bottom; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < threshold || g < threshold || b < threshold) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      left = x;
      break;
    }
  }

  // Detect right border
  for (let x = width - 1; x >= left; x--) {
    let hasContent = false;
    for (let y = top; y <= bottom; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < threshold || g < threshold || b < threshold) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      right = x;
      break;
    }
  }

  return { left, top, right, bottom };
};

export const convertPdfToJpg = async (
  file: File,
  targetWidthMm: number = 58,
  onProgress?: (progress: number) => void
): Promise<ConvertedImage[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const images: ConvertedImage[] = [];

  // Convert mm to pixels (assuming 96 DPI for screen, 4x for quality)
  const DPI = 96;
  const MM_TO_INCH = 0.0393701;
  const SCALE_FACTOR = 4; // Render at 4x for quality
  const targetWidthPx = targetWidthMm * MM_TO_INCH * DPI * SCALE_FACTOR;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });

    // Calculate scale to match target width
    const scale = targetWidthPx / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // Render to high-res canvas
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false })!;
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // White background
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    } as any).promise;

    // Detect and crop borders
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const bounds = detectBorders(imageData);

    // Create cropped canvas
    const croppedWidth = bounds.right - bounds.left + 1;
    const croppedHeight = bounds.bottom - bounds.top + 1;
    const croppedCanvas = document.createElement("canvas");
    const croppedContext = croppedCanvas.getContext("2d", { alpha: false })!;
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;

    croppedContext.putImageData(
      context.getImageData(bounds.left, bounds.top, croppedWidth, croppedHeight),
      0,
      0
    );

    // Enhance contrast and sharpness
    croppedContext.filter = "contrast(1.1) brightness(0.98)";
    croppedContext.drawImage(croppedCanvas, 0, 0);

    // Downscale to final size for crisp output
    const finalCanvas = document.createElement("canvas");
    const finalContext = finalCanvas.getContext("2d", {
      alpha: false,
    })!;
    finalCanvas.width = croppedWidth / SCALE_FACTOR;
    finalCanvas.height = croppedHeight / SCALE_FACTOR;

    // Use high-quality downscaling
    finalContext.imageSmoothingEnabled = true;
    finalContext.imageSmoothingQuality = "high";
    finalContext.drawImage(
      croppedCanvas,
      0,
      0,
      croppedWidth,
      croppedHeight,
      0,
      0,
      finalCanvas.width,
      finalCanvas.height
    );

    const dataUrl = finalCanvas.toDataURL("image/jpeg", 0.95);
    const baseName = file.name.replace(/\.pdf$/i, "");
    const filename =
      numPages > 1 ? `${baseName}_page${pageNum}.jpg` : `${baseName}.jpg`;

    images.push({
      id: `${file.name}-page-${pageNum}`,
      dataUrl,
      filename,
      pageNumber: pageNum,
      width: finalCanvas.width,
      height: finalCanvas.height,
    });

    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 100));
    }
  }

  return images;
  } catch (error) {
    console.error("PDF conversion error:", error);
    throw new Error(`Failed to convert PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
