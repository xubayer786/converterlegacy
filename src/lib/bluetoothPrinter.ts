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
  SET_LINE_SPACING: [ESC, 0x33, 0x00], // Set line spacing to 0
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

    // Get all available services
    const services = await server.getPrimaryServices();
    console.log(`Found ${services.length} services`);

    if (services.length === 0) {
      throw new Error("No services found in device. Make sure it's a Bluetooth printer.");
    }

    // Try common printer service UUIDs first
    const commonServiceUUIDs = [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
      "0000fff0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    ];

    let service = null;
    for (const uuid of commonServiceUUIDs) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) {
          console.log(`Connected using service: ${uuid}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // If no common service found, try first available service
    if (!service && services.length > 0) {
      service = services[0];
      console.log(`Using first available service: ${service.uuid}`);
    }

    if (!service) throw new Error("No compatible printer service found");

    // Get all characteristics
    const characteristics = await service.getCharacteristics();
    console.log(`Found ${characteristics.length} characteristics`);

    // Try common characteristic UUIDs
    const commonCharUUIDs = [
      "00002af1-0000-1000-8000-00805f9b34fb",
      "49535343-8841-43f4-a8d4-ecbe34729bb3",
      "0000fff1-0000-1000-8000-00805f9b34fb",
      "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
    ];

    for (const uuid of commonCharUUIDs) {
      try {
        printerCharacteristic = await service.getCharacteristic(uuid);
        if (printerCharacteristic) {
          console.log(`Using characteristic: ${uuid}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // If no common characteristic, find any writable one
    if (!printerCharacteristic) {
      printerCharacteristic = characteristics.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse
      );
      if (printerCharacteristic) {
        console.log(`Using writable characteristic: ${printerCharacteristic.uuid}`);
      }
    }

    if (!printerCharacteristic) {
      throw new Error("No writable characteristic found. Device may not be a printer.");
    }

    return true;
  } catch (error) {
    console.error("Printer connection error:", error);
    throw error;
  }
};

const sendCommand = async (command: number[], description?: string) => {
  if (!printerCharacteristic) {
    await connectToPrinter();
  }

  if (!printerCharacteristic) {
    throw new Error("Printer not connected");
  }

  try {
    const data = new Uint8Array(command);
    if (printerCharacteristic.properties.writeWithoutResponse) {
      await printerCharacteristic.writeValueWithoutResponse(data);
    } else {
      await printerCharacteristic.writeValue(data);
    }
    if (description) {
      console.log(`Sent command: ${description}`);
    }
  } catch (error) {
    console.error(`Failed to send command ${description}:`, error);
    throw error;
  }
};

// Convert image to ESC/POS bitmap format (more reliable than raster)
const imageToEscPosBitmap = async (dataUrl: string, maxWidth: number = 384): Promise<number[][]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { 
          alpha: false,
          willReadFrequently: true 
        })!;

        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.floor((height * maxWidth) / width);
          width = maxWidth;
        }

        // Ensure width is divisible by 8 for ESC/POS
        width = Math.floor(width / 8) * 8;
        if (width === 0) width = 8;

        canvas.width = width;
        canvas.height = height;

        // Fill white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        console.log(`Processing image: ${width}x${height}px`);

        // Convert to monochrome bitmap with dithering
        const bitmap: number[][] = [];
        const widthBytes = width / 8;

        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x += 8) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
              const px = x + bit;
              if (px < width) {
                const idx = (y * width + px) * 4;
                const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
                
                // Threshold with slight adjustment for better contrast
                if (gray < 140) {
                  byte |= 1 << (7 - bit);
                }
              }
            }
            row.push(byte);
          }
          bitmap.push(row);
        }

        console.log(`Bitmap generated: ${bitmap.length} lines, ${widthBytes} bytes per line`);
        resolve(bitmap);
      } catch (error) {
        console.error("Image processing error:", error);
        reject(error);
      }
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
    console.log("Printer connected, starting print job...");

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Printing image ${i + 1}/${images.length}: ${image.filename}`);

      // Initialize printer
      await sendCommand(commands.INIT, "Initialize");
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Set print density to maximum
      await sendCommand([GS, 0x7c, 0x00, 0x32, 0x32], "Set density");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Set line spacing to 0 for bitmap printing
      await sendCommand([ESC, 0x33, 0x00], "Set line spacing");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Convert image to bitmap
      console.log("Converting image to bitmap...");
      const bitmap = await imageToEscPosBitmap(image.dataUrl, 576); // 576px = 72mm at 203dpi
      const widthBytes = bitmap[0].length;
      const height = bitmap.length;

      console.log(`Sending bitmap: ${widthBytes} bytes wide, ${height} lines tall`);

      // Send bitmap data using ESC * command (more compatible)
      let linesSent = 0;
      for (let y = 0; y < height; y++) {
        const line = bitmap[y];
        
        // ESC * m nL nH d1...dk - Print raster bit image
        // m = 33 (24-dot double-density)
        const cmd = [
          ESC, 0x2a, 33, 
          widthBytes & 0xff, 
          (widthBytes >> 8) & 0xff,
          ...line,
          0x0a // Line feed after each line
        ];

        await sendCommand(cmd);
        
        // Progress feedback every 10 lines
        if (y % 10 === 0) {
          linesSent = y;
          console.log(`Sent ${linesSent}/${height} lines`);
        }
        
        // Small delay for stability (adjust based on printer)
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      console.log(`Image sent successfully (${height} lines)`);

      // Feed paper and cut
      await sendCommand([0x0a, 0x0a, 0x0a, 0x0a], "Feed paper");
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      await sendCommand([GS, 0x56, 0x00], "Cut paper");
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (onProgress) {
        onProgress(i + 1, images.length);
      }

      // Delay between prints
      if (i < images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("Print job completed successfully!");
  } catch (error) {
    console.error("Print error:", error);
    throw new Error(`Failed to print: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
