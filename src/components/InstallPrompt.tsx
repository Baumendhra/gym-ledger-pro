import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:right-6 md:left-auto md:w-80 bg-card text-card-foreground shadow-lg border rounded-lg p-4 z-50 flex items-start gap-3">
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">Install Vijay Fitness</h3>
        <p className="text-xs text-muted-foreground mb-3">Install our app on your home screen for quick and easy access, even offline.</p>
        <button
          onClick={handleInstallClick}
          className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium transition-colors w-full"
        >
          <Download className="w-4 h-4" />
          Add to Home Screen
        </button>
      </div>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
