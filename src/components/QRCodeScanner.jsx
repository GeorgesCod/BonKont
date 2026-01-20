import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scan, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function QRCodeScanner({ isOpen, onClose, onScanSuccess }) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const qrReaderRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const isStoppingRef = useRef(false); // Pour éviter les appels multiples à stop()

  // Nettoyer le scanner quand le dialog se ferme
  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser l'état quand le dialog se ferme
      setError(null);
      isStoppingRef.current = false;
      
      // Nettoyer le scanner si il existe
      const cleanup = async () => {
        if (html5QrCodeRef.current) {
          try {
            // Essayer d'arrêter seulement si on pense qu'il est en cours d'exécution
            if (isScanning) {
              try {
                await html5QrCodeRef.current.stop();
              } catch (stopErr) {
                // Ignorer l'erreur si le scanner n'est pas en cours d'exécution
                console.log('[QRCodeScanner] Scanner already stopped (non-critical)');
              }
            }
            // Toujours essayer de nettoyer
            try {
              await html5QrCodeRef.current.clear();
            } catch (clearErr) {
              console.log('[QRCodeScanner] Error clearing scanner (non-critical)');
            }
          } catch (err) {
            // Ignorer toutes les erreurs de nettoyage
            console.log('[QRCodeScanner] Cleanup error (non-critical)');
          } finally {
            html5QrCodeRef.current = null;
            setIsScanning(false);
          }
        } else {
          setIsScanning(false);
        }
      };
      
      cleanup();
    } else {
      // Réinitialiser le flag quand le dialog s'ouvre
      isStoppingRef.current = false;
    }
  }, [isOpen]);

  const startScanning = async () => {
    try {
      // Vérifier que l'élément existe dans le DOM
      const qrReaderElement = document.getElementById("qr-reader");
      if (!qrReaderElement) {
        console.error('[QRCodeScanner] QR reader element not found in DOM');
        setError('Erreur : élément de scan introuvable. Veuillez réessayer.');
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible d'initialiser le scanner. Veuillez réessayer."
        });
        return;
      }

      // Initialiser le scanner seulement quand on démarre le scan
      if (!html5QrCodeRef.current) {
        console.log('[QRCodeScanner] Initializing scanner');
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      console.log('[QRCodeScanner] Starting camera...');
      setError(null);
      setIsScanning(true);

      await html5QrCodeRef.current.start(
        { facingMode: "environment" }, // Utiliser la caméra arrière
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText, decodedResult) => {
          console.log('[QRCodeScanner] QR Code detected:', decodedText);
          
          // Arrêter le scanner de manière sécurisée
          const handleScanSuccess = async () => {
            // Éviter les appels multiples
            if (isStoppingRef.current) {
              return;
            }
            
            isStoppingRef.current = true;
            
            try {
              if (html5QrCodeRef.current) {
                try {
                  await html5QrCodeRef.current.stop();
                } catch (stopErr) {
                  // Scanner peut déjà être arrêté, ce n'est pas grave
                  console.log('[QRCodeScanner] Scanner already stopped (non-critical)');
                }
              }
              setIsScanning(false);
              
              // Extraire le code de l'URL si c'est une URL
              let eventCode = decodedText.trim();
              console.log('[QRCodeScanner] Raw decoded text:', eventCode);
              
              // Pattern 1: URL complète avec #/join/CODE
              let match = eventCode.match(/#\/join\/([A-Z0-9]+)/i);
              if (match) {
                eventCode = match[1].toUpperCase();
                console.log('[QRCodeScanner] Extracted from #/join/ pattern:', eventCode);
              } else {
                // Pattern 2: URL avec /join/CODE (sans #)
                match = eventCode.match(/\/join\/([A-Z0-9]+)/i);
                if (match) {
                  eventCode = match[1].toUpperCase();
                  console.log('[QRCodeScanner] Extracted from /join/ pattern:', eventCode);
                } else {
                  // Pattern 3: Code seul (8 caractères)
                  const codeOnly = eventCode.replace(/[^A-Z0-9]/g, '').toUpperCase();
                  if (codeOnly.length >= 8) {
                    eventCode = codeOnly.substring(0, 8);
                    console.log('[QRCodeScanner] Extracted code only:', eventCode);
                  } else {
                    eventCode = eventCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    console.log('[QRCodeScanner] Cleaned code:', eventCode);
                  }
                }
              }
              
              console.log('[QRCodeScanner] Final event code:', eventCode);

              toast({
                title: "Code QR scanné !",
                description: `Code événement détecté: ${eventCode}`
              });

              if (onScanSuccess) {
                onScanSuccess(eventCode);
              }
              
              onClose();
            } catch (err) {
              console.error('[QRCodeScanner] Error in scan success handler:', err);
              setIsScanning(false);
              // Appeler quand même le callback
              if (onScanSuccess) {
                let eventCode = decodedText.trim();
                console.log('[QRCodeScanner] Error handler - Raw decoded text:', eventCode);
                
                // Pattern 1: URL complète avec #/join/CODE
                let match = eventCode.match(/#\/join\/([A-Z0-9]+)/i);
                if (match) {
                  eventCode = match[1].toUpperCase();
                } else {
                  // Pattern 2: URL avec /join/CODE
                  match = eventCode.match(/\/join\/([A-Z0-9]+)/i);
                  if (match) {
                    eventCode = match[1].toUpperCase();
                  } else {
                    // Pattern 3: Code seul
                    const codeOnly = eventCode.replace(/[^A-Z0-9]/g, '').toUpperCase();
                    eventCode = codeOnly.length >= 8 ? codeOnly.substring(0, 8) : codeOnly;
                  }
                }
                
                console.log('[QRCodeScanner] Error handler - Final event code:', eventCode);
                onScanSuccess(eventCode);
              }
              onClose();
            } finally {
              isStoppingRef.current = false;
            }
          };
          
          handleScanSuccess();
        },
        (errorMessage) => {
          // Erreur ignorée pendant le scan (normal)
        }
      );
    } catch (err) {
      console.error('[QRCodeScanner] Error starting scanner:', err);
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setIsScanning(false);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'accéder à la caméra. Vérifiez les permissions."
      });
    }
  };

  const stopScanning = async () => {
    // Éviter les appels multiples
    if (isStoppingRef.current) {
      console.log('[QRCodeScanner] Already stopping, ignoring duplicate call');
      return;
    }

    if (!html5QrCodeRef.current) {
      setIsScanning(false);
      return;
    }

    isStoppingRef.current = true;

    try {
      console.log('[QRCodeScanner] Stopping scanner, current state:', isScanning);
      
      // Vérifier l'état du scanner avant d'essayer de l'arrêter
      try {
        // Essayer d'arrêter seulement si on pense qu'il est en cours d'exécution
        if (isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (stopErr) {
        // Si l'arrêt échoue (scanner déjà arrêté), ce n'est pas grave
        console.log('[QRCodeScanner] Scanner already stopped or not running (non-critical)');
      }
      
      // Toujours essayer de nettoyer
      try {
        await html5QrCodeRef.current.clear();
      } catch (clearErr) {
        console.log('[QRCodeScanner] Error clearing scanner (non-critical)');
      }
      
      setIsScanning(false);
    } catch (err) {
      console.error('[QRCodeScanner] Unexpected error stopping scanner:', err);
      setIsScanning(false);
      // Essayer de nettoyer quand même
      try {
        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.clear();
        }
      } catch (clearErr) {
        console.log('[QRCodeScanner] Error in cleanup:', clearErr);
      }
    } finally {
      isStoppingRef.current = false;
    }
  };

  const handleClose = async () => {
    await stopScanning();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary" />
            Scanner un code QR
          </DialogTitle>
          <DialogDescription>
            Scannez le code QR de l'événement pour rejoindre automatiquement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div 
            id="qr-reader" 
            ref={qrReaderRef}
            className="w-full" 
            style={{ minHeight: '300px' }}
          ></div>

          {!isScanning ? (
            <Button
              onClick={startScanning}
              className="w-full gap-2"
              disabled={isScanning}
            >
              <Scan className="w-4 h-4" />
              Démarrer le scan
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="w-full gap-2"
            >
              <X className="w-4 h-4" />
              Arrêter le scan
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

