import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

interface HeaderProps {
  onConnectPrinter: () => void;
  isConnected: boolean;
}

export const Header = ({ onConnectPrinter, isConnected }: HeaderProps) => {
  const handleConnect = () => {
    if (isConnected) {
      toast.success("Printer already connected");
      return;
    }
    onConnectPrinter();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
              LC
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Legacy Converter</h1>
              <p className="text-xs text-muted-foreground">by Legacy Dhaka</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isConnected ? "default" : "outline"}
            size="sm"
            onClick={handleConnect}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {isConnected ? "Printer Connected" : "Connect Printer"}
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
