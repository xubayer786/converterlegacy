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
    // Ensure fresh connection
    if (connectedDevice.gatt?.connected) {
      console.log("Already connected, using existing connection");
    } else {
      console.log("Connecting to GATT server...");
      await connectedDevice.gatt?.connect();
    }

    const server = connectedDevice.gatt;
    if (!server || !server.connected) {
      throw new Error("Failed to connect to GATT server");
    }

    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

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

    // Wait for characteristic to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    return true;
  } catch (error) {
    console.error("Printer connection error:", error);
    printerCharacteristic = null;
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
    const maxChunkSize = 200; // Reduced for better compatibility
    
    // Split data into chunks if it exceeds max size
    if (data.length <= maxChunkSize) {
      if (printerCharacteristic.properties.writeWithoutResponse) {
        await printerCharacteristic.writeValueWithoutResponse(data);
      } else {
        await printerCharacteristic.writeValue(data);
      }
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait after each write
    } else {
      // Send in chunks with delays
      for (let offset = 0; offset < data.length; offset += maxChunkSize) {
        const chunk = data.slice(offset, offset + maxChunkSize);
        if (printerCharacteristic.properties.writeWithoutResponse) {
          await printerCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await printerCharacteristic.writeValue(chunk);
        }
        // Delay between chunks to prevent buffer overflow
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    if (description) {
      console.log(`Sent command: ${description} (${data.length} bytes)`);
    }
  } catch (error) {
    console.error(`Failed to send command ${description}:`, error);
    throw error;
  }
};

// Convert image to ESC/POS bitmap format - optimized for 57mm paper printable area
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

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;

        console.log(`Processing image: ${width}x${height}px`);

        // Convert to grayscale first
        const grayscale: number[] = new Array(width * height);
        for (let i = 0; i < width * height; i++) {
          const idx = i * 4;
          grayscale[i] = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
        }

        // Apply Floyd-Steinberg dithering for better text quality
        const threshold = 200; // Higher threshold to reduce black patterns on white areas
        const dithered = new Uint8Array(width * height);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldPixel = grayscale[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            dithered[idx] = newPixel;
            
            const error = oldPixel - newPixel;
            
            // Only apply dithering if there's significant detail (not on pure white areas)
            if (Math.abs(error) > 10) {
              // Distribute error to neighboring pixels (Floyd-Steinberg)
              if (x + 1 < width) grayscale[idx + 1] += error * 7 / 16;
              if (y + 1 < height) {
                if (x > 0) grayscale[idx + width - 1] += error * 3 / 16;
                grayscale[idx + width] += error * 5 / 16;
                if (x + 1 < width) grayscale[idx + width + 1] += error * 1 / 16;
              }
            }
          }
        }

        // Convert to monochrome bitmap
        const bitmap: number[][] = [];
        const widthBytes = width / 8;

        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x += 8) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
              const px = x + bit;
              if (px < width) {
                const idx = y * width + px;
                if (dithered[idx] === 0) {
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

      // Convert image to bitmap - optimized width to prevent cropping
      console.log("Converting image to bitmap...");
      const bitmap = await imageToEscPosBitmap(image.dataUrl, 384);
      const widthBytes = bitmap[0].length;
      const height = bitmap.length;

      console.log(`Sending bitmap: ${widthBytes} bytes wide, ${height} lines tall`);

      // Send entire bitmap using GS v 0 command (raster bit image)
      const cmd = [
        GS, 0x76, 0x30, 0x00,
        widthBytes & 0xff,
        (widthBytes >> 8) & 0xff,
        height & 0xff,
        (height >> 8) & 0xff
      ];
      
      // Add all bitmap data
      for (let y = 0; y < height; y++) {
        cmd.push(...bitmap[y]);
      }
      
      // Send the complete bitmap command
      await sendCommand(cmd, `Print bitmap ${height} lines`);
      
      if (onProgress) {
        console.log(`Image sent: ${height} lines`);
      }

      console.log(`Image sent successfully (${height} lines)`);

      // Feed paper and cut (3 line feeds = ~3/4 inch gap)
      await sendCommand([0x0a, 0x0a, 0x0a], "Feed paper");
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
