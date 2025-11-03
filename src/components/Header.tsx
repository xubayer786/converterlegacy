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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-strong">
      <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg">
              LC
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold tracking-tight">Legacy Converter</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">by Legacy Dhaka</p>
            </div>
            <h1 className="sm:hidden text-sm font-bold tracking-tight">Legacy</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant={isConnected ? "default" : "outline"}
            size="sm"
            onClick={handleConnect}
            className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
          >
            <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isConnected ? "Printer Connected" : "Connect Printer"}</span>
            <span className="sm:hidden">{isConnected ? "Connected" : "Connect"}</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
