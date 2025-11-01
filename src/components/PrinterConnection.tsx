import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bluetooth, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { setConnectedDevice } from "@/lib/bluetoothPrinter";

interface PrinterConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export const PrinterConnection = ({
  isOpen,
  onClose,
  onConnected,
}: PrinterConnectionProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const connectPrinter = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error("Web Bluetooth is not supported on this device");
      setConnectionStatus("error");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("idle");

    try {
      // Request access to all common thermal printer services
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "000018f0-0000-1000-8000-00805f9b34fb", // Common printer service
          "49535343-fe7d-4ae5-8fa9-9fafd205e455", // Another common service
          "0000fff0-0000-1000-8000-00805f9b34fb", // Generic printer service
          "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Alternative service
          "battery_service",
        ],
      });

      if (device) {
        setConnectedDevice(device);
        setConnectionStatus("success");
        toast.success(`Connected to ${device.name || "Bluetooth Printer"}`);
        onConnected();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      setConnectionStatus("error");
      toast.error("Failed to connect to printer");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Bluetooth Printer</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="relative">
            {connectionStatus === "idle" && (
              <div className="p-6 rounded-full bg-primary/10">
                <Bluetooth className="h-12 w-12 text-primary" />
              </div>
            )}
            {connectionStatus === "success" && (
              <div className="p-6 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
            )}
            {connectionStatus === "error" && (
              <div className="p-6 rounded-full bg-destructive/10">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            )}
          </div>

          {connectionStatus === "idle" && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Make sure your thermal printer is turned on and in pairing mode
              </p>
            </div>
          )}

          {connectionStatus === "success" && (
            <p className="text-sm font-medium text-green-500">
              Printer connected successfully!
            </p>
          )}

          {connectionStatus === "error" && (
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-destructive">
                Connection failed
              </p>
              <p className="text-xs text-muted-foreground">
                Please try again or check your device settings
              </p>
            </div>
          )}

          {connectionStatus !== "success" && (
            <Button
              onClick={connectPrinter}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching for devices...
                </>
              ) : (
                <>
                  <Bluetooth className="mr-2 h-4 w-4" />
                  Connect Printer
                </>
              )}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Works with Android and supported iOS browsers</p>
          <p>• Requires Bluetooth permissions</p>
          <p>• Default print width: 58mm</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
