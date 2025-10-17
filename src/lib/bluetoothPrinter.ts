import { ConvertedImage } from "./pdfConverter";

// Type declarations for Web Bluetooth API
type BluetoothDevice = any;
type BluetoothRemoteGATTCharacteristic = any;

let connectedDevice: BluetoothDevice | null = null;
let printerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;

const commands = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  LINE_FEED: [0x0a],
  CUT_PAPER: [GS, 0x56, 0x00],
  PRINT_MODE_EMPHASIZED: [ESC, 0x45, 0x01], // Bold on
  PRINT_MODE_NORMAL: [ESC, 0x45, 0x00], // Bold off
};

export const setConnectedDevice = (device: BluetoothDevice | null) => {
  connectedDevice = device;
  printerCharacteristic = null;
};

export const getConnectedDevice = () => connectedDevice;

const connectToPrinter = async (): Promise<boolean> => {
  if (!connectedDevice) {
    throw new Error("No printer connected");
  }

  try {
    if (!connectedDevice.gatt?.connected) {
      await connectedDevice.gatt?.connect();
    }

    const server = await connectedDevice.gatt?.connect();
    if (!server) throw new Error("Failed to connect to GATT server");

    // Try common printer service UUIDs
    const serviceUUIDs = [
      "000018f0-0000-1000-8000-00805f9b34fb", // Common thermal printer service
      "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Another common service
    ];

    let service = null;
    for (const uuid of serviceUUIDs) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) break;
      } catch (e) {
        continue;
      }
    }

    // If specific services fail, try to get any available service
    if (!service) {
      const services = await server.getPrimaryServices();
      service = services[0];
    }

    if (!service) throw new Error("No printer service found");

    // Try to get write characteristic
    const characteristicUUIDs = [
      "00002af1-0000-1000-8000-00805f9b34fb",
      "49535343-8841-43f4-a8d4-ecbe34729bb3",
    ];

    for (const uuid of characteristicUUIDs) {
      try {
        printerCharacteristic = await service.getCharacteristic(uuid);
        if (printerCharacteristic) break;
      } catch (e) {
        continue;
      }
    }

    if (!printerCharacteristic) {
      const characteristics = await service.getCharacteristics();
      printerCharacteristic =
        characteristics.find((c) => c.properties.write || c.properties.writeWithoutResponse) ||
        characteristics[0];
    }

    if (!printerCharacteristic) {
      throw new Error("No writable characteristic found");
    }

    return true;
  } catch (error) {
    console.error("Printer connection error:", error);
    throw error;
  }
};

const sendCommand = async (command: number[]) => {
  if (!printerCharacteristic) {
    await connectToPrinter();
  }

  if (!printerCharacteristic) {
    throw new Error("Printer not connected");
  }

  const data = new Uint8Array(command);
  await printerCharacteristic.writeValue(data);
};

const imageToEscPos = async (dataUrl: string, maxWidth: number = 384): Promise<Uint8Array[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Ensure width is divisible by 8 for ESC/POS
      width = Math.floor(width / 8) * 8;

      canvas.width = width;
      canvas.height = height;

      // Draw image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const chunks: Uint8Array[] = [];

      // Convert to 1-bit monochrome using Floyd-Steinberg dithering
      const pixels = imageData.data;
      const width8 = Math.floor(width / 8);

      for (let y = 0; y < height; y++) {
        const line: number[] = [ESC, 0x2a, 33, width8 & 0xff, (width8 >> 8) & 0xff];

        for (let x = 0; x < width; x += 8) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const px = x + bit;
            if (px < width) {
              const idx = (y * width + px) * 4;
              const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;

              // Apply Floyd-Steinberg dithering
              const oldPixel = gray;
              const newPixel = oldPixel < 128 ? 0 : 255;
              const error = oldPixel - newPixel;

              if (newPixel === 0) {
                byte |= 1 << (7 - bit);
              }

              // Distribute error to neighboring pixels
              if (px + 1 < width) {
                const idx1 = (y * width + px + 1) * 4;
                pixels[idx1] += error * 7 / 16;
                pixels[idx1 + 1] += error * 7 / 16;
                pixels[idx1 + 2] += error * 7 / 16;
              }
              if (y + 1 < height && px > 0) {
                const idx2 = ((y + 1) * width + px - 1) * 4;
                pixels[idx2] += error * 3 / 16;
                pixels[idx2 + 1] += error * 3 / 16;
                pixels[idx2 + 2] += error * 3 / 16;
              }
              if (y + 1 < height) {
                const idx3 = ((y + 1) * width + px) * 4;
                pixels[idx3] += error * 5 / 16;
                pixels[idx3 + 1] += error * 5 / 16;
                pixels[idx3 + 2] += error * 5 / 16;
              }
              if (y + 1 < height && px + 1 < width) {
                const idx4 = ((y + 1) * width + px + 1) * 4;
                pixels[idx4] += error * 1 / 16;
                pixels[idx4 + 1] += error * 1 / 16;
                pixels[idx4 + 2] += error * 1 / 16;
              }
            }
          }
          line.push(byte);
        }
        line.push(0x0a); // Line feed
        chunks.push(new Uint8Array(line));
      }

      resolve(chunks);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
};

export const printImages = async (
  images: ConvertedImage[],
  onProgress?: (current: number, total: number) => void
) => {
  if (!connectedDevice) {
    throw new Error("No printer connected. Please connect a printer first.");
  }

  try {
    await connectToPrinter();

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      // Initialize printer
      await sendCommand(commands.INIT);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Set print density/darkness
      await sendCommand([GS, 0x7c, 0x00]); // Set print density

      // Convert image to ESC/POS
      const imageChunks = await imageToEscPos(image.dataUrl, 576); // 576px = 58mm at 200dpi

      // Send image data in chunks
      for (const chunk of imageChunks) {
        await printerCharacteristic?.writeValue(chunk);
        // Small delay between chunks for stability
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Feed some paper and cut
      await sendCommand([...commands.LINE_FEED, ...commands.LINE_FEED, ...commands.LINE_FEED]);
      await sendCommand(commands.CUT_PAPER);

      if (onProgress) {
        onProgress(i + 1, images.length);
      }

      // Delay between prints
      if (i < images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error("Print error:", error);
    throw new Error(`Failed to print: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
