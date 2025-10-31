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
  customerName?: string;
}

const extractCustomerName = (text: string): string => {
  // Remove common invoice terms
  const cleanText = text
    .replace(/invoice|receipt|bill|order|date|total|amount|qty|price|description|legacy|dhaka/gi, "")
    .trim();
  
  // Get first meaningful line (usually customer name)
  const lines = cleanText.split(/[\n\r]+/).filter(line => line.trim().length > 3);
  const name = lines[0]?.trim().slice(0, 50) || "";
  
  // Clean filename (remove invalid characters)
  return name.replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
};

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

  // Ultra-high quality rendering for crystal-clear output
  const DPI = 300; // Professional print quality DPI
  const MM_TO_INCH = 0.0393701;
  const targetWidthPx = targetWidthMm * MM_TO_INCH * DPI;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });

    // Calculate scale to match target width
    const scale = targetWidthPx / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // Render to canvas with optimized settings for maximum sharpness
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { 
      alpha: false,
      willReadFrequently: false,
      desynchronized: false
    })!;
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // White background
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render with high quality settings
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
      intent: 'print', // Use print intent for maximum quality
      renderInteractiveForms: false,
      annotationMode: 0,
    } as any).promise;

    // Extract text for filename
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    
    // Try to extract customer name (first meaningful text line)
    const customerName = extractCustomerName(pageText);

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

    // Apply sharpening and contrast enhancement for crystal-clear text
    croppedContext.filter = "contrast(1.2) brightness(0.98) saturate(0)";
    croppedContext.drawImage(croppedCanvas, 0, 0);
    croppedContext.filter = "none";

    // Convert to high-quality JPEG with maximum quality
    const dataUrl = croppedCanvas.toDataURL("image/jpeg", 1.0);
    
    // Generate filename with customer name
    const baseFilename = customerName || file.name.replace(/\.pdf$/i, "");
    const filename = numPages > 1 
      ? `${baseFilename}_page${pageNum}.jpg`
      : `${baseFilename}.jpg`;

    images.push({
      id: `${file.name}-page-${pageNum}`,
      dataUrl,
      filename,
      pageNumber: pageNum,
      width: croppedCanvas.width,
      height: croppedCanvas.height,
      customerName,
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
