import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, Upload, Scan, Camera, X, CheckCircle2, Save, Calendar } from 'lucide-react';
import { useEventStore } from '@/store/eventStore';
import { useTransactionsStore } from '@/store/transactionsStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

const API_BASE_URL = "https://api.walletfamily.fr";

// -----------------------------------------------------------------------------
// Local helpers (memo enseigne)
// -----------------------------------------------------------------------------
const saveEnseigneLocally = (enseigne, categorie) => {
  const data = JSON.parse(localStorage.getItem("enseignes") || "{}");
  data[enseigne] = categorie;
  localStorage.setItem("enseignes", JSON.stringify(data));
};

const getCategorieForEnseigne = (enseigne) => {
  const data = JSON.parse(localStorage.getItem("enseignes") || "{}");
  return data[enseigne] || "";
};

// -----------------------------------------------------------------------------
// Filtre CB PREMIER → MONTANT (pour tickets français)
// -----------------------------------------------------------------------------
const cleanCBBankTicket = (rawText) => {
  if (!rawText) return "";

  const lines = rawText.split("\n").map(l => l.trim());

  // Trouver début : CB PREMIER
  const startIndex = lines.findIndex(l =>
    /^CB PREMIER/i.test(l) || l.includes("CB PREMIER")
  );

  if (startIndex === -1) return rawText;

  // Trouver la ligne "MONTANT"
  const montantIndex = lines.findIndex((l, i) =>
    i > startIndex && /MONTANT/i.test(l)
  );

  if (montantIndex === -1) {
    // Si pas de "MONTANT", chercher jusqu'à une ligne avec EUR/€
    const eurIndex = lines.findIndex((l, i) =>
      i > startIndex && /€|EUR/i.test(l)
    );
    if (eurIndex !== -1) {
      return lines.slice(startIndex, eurIndex + 1).join("\n");
    }
    return lines.slice(startIndex).join("\n");
  }

  // Si "MONTANT" trouvé, inclure cette ligne ET les lignes suivantes jusqu'à trouver le montant
  // Chercher le montant dans les 5 lignes suivantes après "MONTANT"
  let endIndex = montantIndex;
  for (let i = montantIndex; i < Math.min(montantIndex + 6, lines.length); i++) {
    const line = lines[i];
    // Si on trouve un montant avec devise, inclure cette ligne
    if (/(\d+[.,]\d{1,2})\s*(EUR|€|CHF|\$)/i.test(line) || 
        /(EUR|€|CHF|\$)\s*(\d+[.,]\d{1,2})/i.test(line)) {
      endIndex = i;
      break;
    }
    // Si on trouve juste un montant numérique après MONTANT, l'inclure aussi
    if (i > montantIndex && /^\d+[.,]\d{1,2}$/.test(line)) {
      endIndex = i;
      break;
    }
    endIndex = i; // Inclure au moins jusqu'à cette ligne
  }

  return lines.slice(startIndex, endIndex + 1).join("\n");
};

// -----------------------------------------------------------------------------
// Compression image
// -----------------------------------------------------------------------------
const compressImage = (file, maxSizeMB = 2, maxDim = 1600, initialQ = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Le fichier n'est pas une image."));
    }

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = async () => {
      try {
        const ratio = Math.min(1, maxDim / Math.max(image.width, image.height));
        const width = Math.round(image.width * ratio);
        const height = Math.round(image.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        let q = initialQ;
        let blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", q));

        while (blob && blob.size > maxSizeMB * 1024 * 1024 && q > 0.4) {
          q -= 0.1;
          blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", q));
        }

        URL.revokeObjectURL(url);

        if (!blob || blob.size > maxSizeMB * 1024 * 1024) {
          return reject(new Error("Impossible de compresser l'image sous 2 Mo."));
        }

        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + "_compressed.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        resolve(compressedFile);
      } catch (err) {
        reject(err);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Erreur lors du chargement de l'image."));
    };

    image.src = url;
  });
};

// -----------------------------------------------------------------------------
// Composant principal
// -----------------------------------------------------------------------------
export function TesseractTest({ onDataExtracted, showEventSelection = false, autoOpenCamera = false }) {
  
  // ---------- state ----------
  const [image, setImage] = useState(null);
  const [scannedText, setScannedText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [category, setCategory] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(autoOpenCamera);
  
  // États pour l'enregistrement dans un événement
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const events = useEventStore((state) => state.events);
  const addTransaction = useTransactionsStore((state) => state.addTransaction);
  const updateParticipant = useEventStore((state) => state.updateParticipant);
  const updateEvent = useEventStore((state) => state.updateEvent);

  // ---------- refs / hooks ----------
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // ---------- detection mobile / camera ----------
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const videoConstraints = isMobile
    ? { facingMode: { exact: "environment" } }
    : {};

  // ---------------------------------------------------------------------------
  // Effet : ouvrir automatiquement la caméra si demandé
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (autoOpenCamera) {
      const timer = setTimeout(() => setIsCameraOpen(true), 200);
      return () => clearTimeout(timer);
    } else {
      setIsCameraOpen(false);
    }
  }, [autoOpenCamera]);

  // ---------------------------------------------------------------------------
  // Effet : suggestion automatique de catégorie selon l'enseigne déjà mémorisée
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (ocrResult) {
      const enseigne = extractStoreName(ocrResult);
      const categorieMemoisee = getCategorieForEnseigne(enseigne);
      if (categorieMemoisee) {
        setCategory(categorieMemoisee);
        console.log("📦 Catégorie suggérée depuis mémoire :", categorieMemoisee);
      }
    }
  }, [ocrResult]);

  // ---------------------------------------------------------------------------
  // OCR – helpers
  // ---------------------------------------------------------------------------

  // Recadrage automatique
  const autoCropImage = async (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");

          const targetWidth = 600;
          const targetHeight = 800;
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext("2d");
          const offsetX = (img.width - targetWidth) / 2;
          const offsetY = (img.height - targetHeight) / 2;

          ctx.drawImage(
            img,
            offsetX,
            offsetY,
            targetWidth,
            targetHeight,
            0,
            0,
            targetWidth,
            targetHeight
          );

          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error("❌ Échec du recadrage"));
            resolve(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", 0.8);
        };
        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    });
  };

  const blobToFile = (blob, filename) =>
    new File([blob], filename, { type: "image/jpeg" });

  // ---------------------------------------------------------------------------
  // startOCR — Fonction principale d'OCR
  // ---------------------------------------------------------------------------
  const startOCR = async (fileOrImageSrc) => {
    setIsScanning(true);
    setScanProgress(0);
    let result = null;

    try {
      setMessage("🔍 Analyse du ticket en cours...");
      toast({
        title: "Analyse en cours",
        description: "Traitement de l'image...",
      });

      // ----- Préparation du fichier -----
      let file;
      if (typeof fileOrImageSrc === "string") {
        const blob = await fetch(fileOrImageSrc).then((res) => res.blob());
        file = blobToFile(blob, "capture.jpg");
      } else {
        file = fileOrImageSrc;
      }

      // Recadrage automatique
      try {
        file = await autoCropImage(file);
        console.info("✅ Image recadrée avec succès");
      } catch (err) {
        console.warn("⚠️ Recadrage échoué :", err.message);
      }

      // Compression
      if (!file.type.startsWith("image/")) {
        throw new Error("Le fichier sélectionné n'est pas une image.");
      }

      const compressed = await compressImage(file, 2);
      console.info(
        `💾 Capture compressée : ${(file.size / 1e6).toFixed(2)} Mo → ${(compressed.size / 1e6).toFixed(2)} Mo`
      );
      setCapturedImage(URL.createObjectURL(compressed));

      // ----- Envoi OCR -----
      setScanProgress(50);
      let texteOCR = "";
      
      try {
        // Essayer d'abord avec l'API WalletFamily
        const formData = new FormData();
        formData.append("image", compressed, "image.jpg");

        const res = await fetch(`${API_BASE_URL}/ocr`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          setScanProgress(80);
          result = await res.json();
          console.log("🧾 Résultat OCR brut (API) :", result);
          texteOCR = result?.ocrResult || result?.text || result?.texte || "";
        } else {
          throw new Error(`API ${res.status}`);
        }
      } catch (apiError) {
        console.warn("⚠️ API WalletFamily non disponible :", apiError?.message || apiError);
        throw new Error(
          apiError?.message?.includes("Failed to fetch") || apiError?.name === "TypeError"
            ? "API OCR indisponible. Vérifiez votre connexion ou réessayez plus tard."
            : "API OCR WalletFamily indisponible. Réessayez plus tard."
        );
      }

      // -------------------------------------------------------------------
      // Nettoyage des tickets CB AVANT setOcrResult
      // -------------------------------------------------------------------
      const hasText = texteOCR.trim().length > 0;
      const hasApiData = result?.donnees_extraites && typeof result.donnees_extraites === "object";

      if (hasText || hasApiData) {
        const cleanedText = hasText ? cleanCBBankTicket(texteOCR) : "";
        if (hasText) {
          setOcrResult(cleanedText);
          setScannedText(cleanedText);
        }
        setExtractedData(result?.donnees_extraites ?? null);

        // Extraire les données manuellement si l'API ne les fournit pas
        if (!result?.donnees_extraites) {
          const enseigne = hasText ? extractStoreName(cleanedText) : "";
          const date = hasText ? extractDate(cleanedText) : "";
          const heure = hasText ? extractTime(cleanedText) : "";
          let total = hasText ? extractTotalAmount(cleanedText) : "";
          if (!total && hasText) total = extractTotalAmount(texteOCR);

          let devise = "€";
          if (hasText) {
            const deviseMatch = cleanedText.match(/(EUR|€|CHF|\$)/i) || texteOCR.match(/(EUR|€|CHF|\$)/i);
            if (deviseMatch) devise = deviseMatch[1].toUpperCase() === "EUR" ? "€" : deviseMatch[1];
          }

          const extracted = { enseigne, date, heure, total, devise };
          console.log("🔍 Données extraites:", extracted);
          setExtractedData(extracted);
          if (onDataExtracted) onDataExtracted(extracted);
        } else {
          const apiData = result?.donnees_extraites;
          if (apiData && typeof apiData === "object") {
            if (onDataExtracted) {
              console.log("[TesseractTest] Calling onDataExtracted callback with API data");
              onDataExtracted(apiData);
            }
            if (!apiData.total || apiData.total === "" || apiData.total === "0") {
              const total = extractTotalAmount(cleanedText) || extractTotalAmount(texteOCR);
              if (total) apiData.total = total;
            }
            if (!apiData.devise) {
              const deviseMatch = cleanedText.match(/(EUR|€|CHF|\$)/i) || texteOCR.match(/(EUR|€|CHF|\$)/i);
              apiData.devise = deviseMatch?.[1]?.toUpperCase() === "EUR" ? "€" : (deviseMatch?.[1] || "€");
            }
            console.log("🔍 Données extraites (API):", apiData);
            setExtractedData(apiData);
          } else {
            setExtractedData(null);
          }
        }

        setMessage("✅ Texte extrait avec succès !");
        toast({
          title: "Succès",
          description: "Facture scannée avec succès !",
        });
      } else {
        setMessage("❌ Erreur OCR : Résultat vide.");
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Aucun texte détecté dans l'image.",
        });
      }
    } catch (error) {
      console.error("⚠️ Erreur OCR :", error);
      setMessage("❌ Erreur OCR : " + error.message);
      setOcrResult("");
      setScannedText("");
      setExtractedData(null);
      toast({
        variant: "destructive",
        title: "Erreur OCR",
        description: error.message || "Une erreur est survenue lors du scan.",
      });
    } finally {
      setIsScanning(false);
      setScanProgress(100);
      setTimeout(() => setScanProgress(0), 500);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers UI
  // ---------------------------------------------------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
      });
      return;
    }

    setCapturedImage(URL.createObjectURL(file));
    startOCR(file);
  };

  const capture = async () => {
    if (!webcamRef.current) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Caméra non disponible",
      });
      return;
    }

    // Attendre un peu que la webcam soit prête
    await new Promise(resolve => setTimeout(resolve, 500));

    let imageSrc;
    try {
      imageSrc = webcamRef.current.getScreenshot();
    } catch (err) {
      console.error("Erreur getScreenshot:", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de capturer l'image. Vérifiez que la caméra est bien ouverte.",
      });
      return;
    }

    if (!imageSrc) {
      setMessage("❌ Échec de la capture webcam. La caméra n'est peut-être pas encore prête.");
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de la capture webcam. Attendez quelques secondes et réessayez.",
      });
      return;
    }

    try {
      const blob = await fetch(imageSrc).then((res) => res.blob());
      const file = blobToFile(blob, "capture.jpg");

      if (file.size > 2 * 1024 * 1024) {
        const compressed = await compressImage(file, 2);
        console.info(
          `💾 Capture compressée : ${(file.size / 1e6).toFixed(2)} Mo → ${(compressed.size / 1e6).toFixed(2)} Mo`
        );
        setCapturedImage(URL.createObjectURL(compressed));
        startOCR(compressed);
      } else {
        setCapturedImage(URL.createObjectURL(file));
        startOCR(file);
      }
    } catch (err) {
      console.error("❌ Erreur lors de la capture webcam :", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du traitement de l'image capturée.",
      });
    }
  };

  const openCamera = () => {
    setIsCameraOpen(true);
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
  };

  const resetScan = () => {
    setCapturedImage(null);
    setOcrResult("");
    setScannedText("");
    setExtractedData(null);
    setMessage("");
    setCategory("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------------------------
  // Fonctions d'extraction
  // ---------------------------------------------------------------------------
  const extractDate = (text) => {
    if (!text) return "";
    const dateMatch = text.match(/\b(\d{2})[\/-](\d{2})[\/-](\d{2,4})\b/);
    if (dateMatch) {
      const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
      return `${dateMatch[1]}/${dateMatch[2]}/${year}`;
    }
    return "";
  };

  const extractTime = (text) => {
    if (!text) return "";
    
    console.log("🕐 Recherche de l'heure...");
    
    // Pattern 1: Format "LE 31/10/25 A 17.03:23" ou "LE 31/10/25 A 17:03:23" (priorité maximale)
    let timeMatch = text.match(/(?:LE|DATE)\s+\d{2}[\/-]\d{2}[\/-]\d{2,4}\s+[AÀ]\s+(\d{1,2})[.:](\d{2})[:]?\d{0,2}/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        const heure = `${String(hour).padStart(2, '0')}:${timeMatch[2]}`;
        console.log(`✅ Heure trouvée (pattern 1):`, heure);
        return heure;
      }
    }
    
    // Pattern 2: Format "A 17.03-23" ou "A 17:03-23" (heure avec séparateur point ou deux-points)
    timeMatch = text.match(/[AÀ]\s+(\d{1,2})[.:](\d{2})[-:]?\d{0,2}/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        const heure = `${String(hour).padStart(2, '0')}:${timeMatch[2]}`;
        console.log(`✅ Heure trouvée (pattern 2):`, heure);
        return heure;
      }
    }
    
    // Pattern 3: Format standard HH:MM ou HH:MM:SS
    timeMatch = text.match(/\b(\d{2}):(\d{2})(?::\d{2})?\b/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        // Vérifier que ce n'est pas dans un contexte de montant
        const matchIndex = text.indexOf(timeMatch[0]);
        const context = text.substring(Math.max(0, matchIndex - 5), matchIndex + 10).toUpperCase();
        if (!/MONTANT|TOTAL|TTC|PRIX|PAYER/.test(context)) {
          const heure = `${timeMatch[1]}:${timeMatch[2]}`;
          console.log(`✅ Heure trouvée (pattern 3):`, heure);
          return heure;
        }
      }
    }
    
    // Pattern 4: Format "17.03-23" ou "17:03-23" (heure seule avec tiret)
    timeMatch = text.match(/\b(\d{1,2})[.:](\d{2})[-]\d{2}\b/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        const heure = `${String(hour).padStart(2, '0')}:${timeMatch[2]}`;
        console.log(`✅ Heure trouvée (pattern 4):`, heure);
        return heure;
      }
    }
    
    console.log("❌ Aucune heure trouvée");
    return "";
  };

  const extractTotalAmount = (text) => {
    if (!text) return "";

    const lines = text.split("\n").map((l) => l.trim());
    const keywords = ["TOT TTC", "PRIX TTC", "TTC", "TOTAL", "À PAYER", "A PAYER", "MONTANT", "TOT"];
    const currencySymbols = ["€", "EUR", "CHF", "$"];
    const toFloat = (s) => parseFloat(s.replace(",", "."));

    // Fonction pour vérifier si un nombre est une heure (0-24)
    const isTime = (numStr, line) => {
      const num = parseFloat(numStr.replace(",", "."));
      // Vérifier si c'est dans un contexte d'heure
      const lineUpper = line.toUpperCase();
      const hasTimeContext = /[AÀ]\s+\d|HEURE|H\s*:|:\s*\d|-\d{2}$|-\d{2}\s/.test(lineUpper);
      return hasTimeContext && num >= 0 && num < 24 && numStr.includes(".") && numStr.split(".")[1]?.length === 2;
    };

    console.log("🔍 Recherche du montant ligne par ligne...");

    // ÉTAPE 1 : Chercher ligne par ligne avec mot-clé + montant (priorité maximale)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineUpper = line.toUpperCase();

      if (keywords.some((k) => lineUpper.includes(k))) {
        console.log(`📌 Ligne ${i + 1} avec mot-clé:`, line);
        
        // Chercher dans la ligne avec le mot-clé
        let matches = line.match(/(\d+[.,]\d{2})/g);
        if (matches?.length) {
          for (const match of matches) {
            if (!isTime(match, line)) {
              const montant = toFloat(match);
              if (montant > 0.01 && montant < 10000) {
                console.log(`✅ Montant trouvé (ligne ${i + 1}):`, montant);
                return montant.toFixed(2);
              }
            }
          }
        }

        // Chercher dans les 5 lignes suivantes (au lieu de 1)
        for (let j = i + 1; j <= i + 5 && j < lines.length; j++) {
          const nextLine = lines[j];
          console.log(`  → Vérification ligne ${j + 1}:`, nextLine);
          
          // Chercher montant avec devise
          const currencyMatch = nextLine.match(/(\d+[.,]\d{2})\s*(EUR|€|CHF|\$)/i);
          if (currencyMatch) {
            const montant = toFloat(currencyMatch[1]);
            if (montant > 0.01 && montant < 10000) {
              console.log(`✅ Montant trouvé avec devise (ligne ${j + 1}):`, montant);
              return montant.toFixed(2);
            }
          }
          
          // Chercher montant simple
          matches = nextLine.match(/(\d+[.,]\d{2})/g);
          if (matches?.length) {
            for (const match of matches) {
              if (!isTime(match, nextLine)) {
                const montant = toFloat(match);
                if (montant > 0.01 && montant < 10000) {
                  console.log(`✅ Montant trouvé (ligne ${j + 1}):`, montant);
                  return montant.toFixed(2);
                }
              }
            }
          }
        }
      }
    }

    // ÉTAPE 2 : Chercher ligne par ligne avec devise (priorité haute)
    console.log("🔍 Recherche avec devise dans tout le texte...");
    const currencyRegex = new RegExp(
      `(\\d+[.,]\\d{1,2})\\s*(${currencySymbols.join("|")})`,
      "gi"
    );
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = [...line.matchAll(currencyRegex)];
      for (const match of matches) {
        let matchStr = match[1];
        // Corriger si un seul chiffre après la virgule
        if (/[.,]\d{1}$/.test(matchStr)) {
          matchStr = matchStr + "0";
        }
        if (!isTime(matchStr, line)) {
          const montant = toFloat(matchStr);
          if (montant > 0.01 && montant < 10000) {
            console.log(`✅ Montant trouvé avec devise (ligne ${i + 1}):`, montant, "depuis:", line);
            return montant.toFixed(2);
          }
        }
      }
    }
    
    // ÉTAPE 2b : Chercher aussi avec devise avant le nombre (ex: "EUR 8,95")
    console.log("🔍 Recherche devise avant nombre...");
    const currencyBeforeRegex = new RegExp(
      `(${currencySymbols.join("|")})\\s*(\\d+[.,]\\d{1,2})`,
      "gi"
    );
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = [...line.matchAll(currencyBeforeRegex)];
      for (const match of matches) {
        let matchStr = match[2];
        // Corriger si un seul chiffre après la virgule
        if (/[.,]\d{1}$/.test(matchStr)) {
          matchStr = matchStr + "0";
        }
        if (!isTime(matchStr, line)) {
          const montant = toFloat(matchStr);
          if (montant > 0.01 && montant < 10000) {
            console.log(`✅ Montant trouvé avec devise avant (ligne ${i + 1}):`, montant, "depuis:", line);
            return montant.toFixed(2);
          }
        }
      }
    }

    // ÉTAPE 3 : Chercher après "MONTANT" dans les 10 lignes suivantes (priorité très haute)
    const montantIndex = lines.findIndex(l => l.toUpperCase().includes("MONTANT"));
    if (montantIndex !== -1) {
      console.log(`📌 "MONTANT" trouvé ligne ${montantIndex + 1}, recherche dans les lignes suivantes...`);
      
      // Chercher dans la ligne même si elle contient "MONTANT"
      const montantLine = lines[montantIndex];
      console.log(`  → Ligne MONTANT (${montantIndex + 1}):`, montantLine);
      
      // Chercher avec devise (format XX,XX EUR ou XX.XX EUR)
      let currencyMatchInLine = montantLine.match(/(\d+[.,]\d{1,2})\s*(EUR|€|CHF|\$)/i);
      if (currencyMatchInLine) {
        let montantStr = currencyMatchInLine[1];
        if (/[.,]\d{1}$/.test(montantStr)) {
          montantStr = montantStr + "0";
        }
        const montant = toFloat(montantStr);
        if (montant > 0.01 && montant < 10000) {
          console.log(`✅ Montant trouvé dans la ligne MONTANT:`, montant);
          return montant.toFixed(2);
        }
      }
      
      // Chercher aussi devise avant nombre (EUR XX,XX)
      currencyMatchInLine = montantLine.match(/(EUR|€|CHF|\$)\s*(\d+[.,]\d{1,2})/i);
      if (currencyMatchInLine) {
        let montantStr = currencyMatchInLine[2];
        if (/[.,]\d{1}$/.test(montantStr)) {
          montantStr = montantStr + "0";
        }
        const montant = toFloat(montantStr);
        if (montant > 0.01 && montant < 10000) {
          console.log(`✅ Montant trouvé dans la ligne MONTANT (devise avant):`, montant);
          return montant.toFixed(2);
        }
      }
      
      // Chercher montant simple dans la ligne MONTANT
      const matchesInLine = montantLine.match(/(\d+[.,]\d{1,2})/g);
      if (matchesInLine?.length) {
        for (const match of matchesInLine) {
          if (!isTime(match, montantLine)) {
            let montantStr = match;
            if (/[.,]\d{1}$/.test(montantStr)) {
              montantStr = montantStr + "0";
            }
            const montant = toFloat(montantStr);
            if (montant > 0.01 && montant < 10000) {
              console.log(`✅ Montant trouvé dans la ligne MONTANT (simple):`, montant);
              return montant.toFixed(2);
            }
          }
        }
      }
      
      // Chercher dans les lignes suivantes (jusqu'à 15 lignes après)
      for (let i = montantIndex + 1; i <= montantIndex + 15 && i < lines.length; i++) {
        const line = lines[i];
        console.log(`  → Ligne ${i + 1}:`, line);
        
        // Chercher avec devise après nombre (priorité)
        let currencyMatch = line.match(/(\d+[.,]\d{1,2})\s*(EUR|€|CHF|\$)/i);
        if (currencyMatch) {
          let montantStr = currencyMatch[1];
          if (/[.,]\d{1}$/.test(montantStr)) {
            montantStr = montantStr + "0";
          }
          const montant = toFloat(montantStr);
          if (montant > 0.01 && montant < 10000) {
            console.log(`✅ Montant trouvé après MONTANT avec devise (ligne ${i + 1}):`, montant);
            return montant.toFixed(2);
          }
        }
        
        // Chercher avec devise avant nombre
        currencyMatch = line.match(/(EUR|€|CHF|\$)\s*(\d+[.,]\d{1,2})/i);
        if (currencyMatch) {
          let montantStr = currencyMatch[2];
          if (/[.,]\d{1}$/.test(montantStr)) {
            montantStr = montantStr + "0";
          }
          const montant = toFloat(montantStr);
          if (montant > 0.01 && montant < 10000) {
            console.log(`✅ Montant trouvé après MONTANT (devise avant, ligne ${i + 1}):`, montant);
            return montant.toFixed(2);
          }
        }
        
        // Chercher montant simple (sans devise mais après MONTANT)
        const matches = line.match(/(\d+[.,]\d{1,2})/g);
        if (matches?.length) {
          for (const match of matches) {
            if (!isTime(match, line)) {
              let montantStr = match;
              if (/[.,]\d{1}$/.test(montantStr)) {
                montantStr = montantStr + "0";
              }
              const montant = toFloat(montantStr);
              // Accepter des montants plus petits après MONTANT (peut être un sous-total)
              if (montant > 0.01 && montant < 10000) {
                console.log(`✅ Montant trouvé après MONTANT (ligne ${i + 1}):`, montant);
                return montant.toFixed(2);
              }
            }
          }
        }
      }
    }

    // ÉTAPE 4 : Chercher dans les dernières lignes (les montants sont souvent à la fin)
    console.log("🔍 Recherche dans les dernières lignes...");
    const lastLines = lines.slice(-15); // Dernières 15 lignes (augmenté)
    for (let i = 0; i < lastLines.length; i++) {
      const line = lastLines[i];
      const originalIndex = Math.max(0, lines.length - 15 + i);
      console.log(`  → Dernière ligne ${originalIndex + 1}:`, line);
      
      // Chercher avec devise après nombre
      let currencyMatch = line.match(/(\d+[.,]\d{1,2})\s*(EUR|€|CHF|\$)/i);
      if (currencyMatch) {
        let montantStr = currencyMatch[1];
        if (/[.,]\d{1}$/.test(montantStr)) {
          montantStr = montantStr + "0";
        }
        const montant = toFloat(montantStr);
        if (montant > 0.01 && montant < 10000) {
          console.log(`✅ Montant trouvé dans dernière ligne avec devise:`, montant);
          return montant.toFixed(2);
        }
      }
      
      // Chercher avec devise avant nombre
      currencyMatch = line.match(/(EUR|€|CHF|\$)\s*(\d+[.,]\d{1,2})/i);
      if (currencyMatch) {
        let montantStr = currencyMatch[2];
        if (/[.,]\d{1}$/.test(montantStr)) {
          montantStr = montantStr + "0";
        }
        const montant = toFloat(montantStr);
        if (montant > 0.01 && montant < 10000) {
          console.log(`✅ Montant trouvé dans dernière ligne (devise avant):`, montant);
          return montant.toFixed(2);
        }
      }
      
      // Chercher montant avec 1 ou 2 décimales
      const matches = line.match(/(\d+[.,]\d{1,2})/g);
      if (matches?.length) {
        for (const match of matches) {
          if (!isTime(match, line)) {
            let montantStr = match;
            if (/[.,]\d{1}$/.test(montantStr)) {
              montantStr = montantStr + "0";
            }
            const montant = toFloat(montantStr);
            if (montant > 0.01 && montant < 10000) {
              console.log(`✅ Montant trouvé dans dernière ligne:`, montant);
              return montant.toFixed(2);
            }
          }
        }
      }
    }

    // ÉTAPE 5 : Recherche agressive dans TOUT le texte (même sans mot-clé)
    console.log("🔍 Recherche agressive dans tout le texte...");
    const montants = [];
    
    // Parcourir toutes les lignes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Ignorer les lignes qui sont clairement des codes ou numéros
      if (/^\d{10,}$/.test(line.trim())) continue; // Ignorer les longs numéros (cartes, codes)
      if (/^\d{5,6}$/.test(line.trim()) && i < lines.length - 5) continue; // Codes postaux en haut
      
      // Chercher avec devise (priorité)
      let currencyMatch = line.match(/(\d+[.,]\d{1,2})\s*(EUR|€|CHF|\$)/i);
      if (currencyMatch) {
        let montantStr = currencyMatch[1];
        if (/[.,]\d{1}$/.test(montantStr)) {
          montantStr = montantStr + "0";
        }
        if (!isTime(montantStr, line)) {
          const montant = toFloat(montantStr);
          if (montant > 0.01 && montant < 10000) {
            montants.push({ montant, ligne: i + 1, priorite: 10, source: line });
          }
        }
      }
      
      // Chercher devise avant nombre
      currencyMatch = line.match(/(EUR|€|CHF|\$)\s*(\d+[.,]\d{1,2})/i);
      if (currencyMatch) {
        let montantStr = currencyMatch[2];
        if (/[.,]\d{1}$/.test(montantStr)) {
          montantStr = montantStr + "0";
        }
        if (!isTime(montantStr, line)) {
          const montant = toFloat(montantStr);
          if (montant > 0.01 && montant < 10000) {
            montants.push({ montant, ligne: i + 1, priorite: 10, source: line });
          }
        }
      }
      
      // Chercher montants simples (moins prioritaire)
      const matches = line.match(/(\d+[.,]\d{1,2})/g);
      if (matches?.length) {
        for (const match of matches) {
          if (!isTime(match, line)) {
            let montantStr = match;
            if (/[.,]\d{1}$/.test(montantStr)) {
              montantStr = montantStr + "0";
            }
            const montant = toFloat(montantStr);
            // Priorité plus faible si pas de devise, mais accepter
            if (montant > 0.01 && montant < 10000) {
              // Priorité plus élevée si dans les dernières lignes
              const priorite = i >= lines.length - 5 ? 5 : 1;
              montants.push({ montant, ligne: i + 1, priorite, source: line });
            }
          }
        }
      }
    }
    
    // Pattern 2: Chercher aussi les nombres sans virgule qui pourraient être des montants (ex: "895" = "8,95")
    // Seulement dans les dernières lignes et avec contexte de devise
    const lastLinesText = lines.slice(-8).join(" ");
    const noDecimalMatches = lastLinesText.match(/\b(\d{3,4})\s*(EUR|€)\b/gi);
    if (noDecimalMatches) {
      for (const match of noDecimalMatches) {
        const numMatch = match.match(/(\d{3,4})/);
        if (numMatch) {
          const num = parseInt(numMatch[1]);
          // Interpréter comme centimes (ex: 895 = 8.95)
          if (num >= 100 && num < 10000) {
            const montant = num / 100;
            if (montant > 0.01 && montant < 100) {
              montants.push({ montant, ligne: lines.length, priorite: 8, source: match });
              console.log(`✅ Montant potentiel sans virgule trouvé:`, montant);
            }
          }
        }
      }
    }
    
    if (montants.length > 0) {
      // Trier par priorité puis par montant (le plus élevé)
      montants.sort((a, b) => {
        if (b.priorite !== a.priorite) return b.priorite - a.priorite;
        return b.montant - a.montant;
      });
      
      const bestMatch = montants[0];
      console.log(`✅ Montant trouvé (fallback, ligne ${bestMatch.ligne}, priorité ${bestMatch.priorite}):`, bestMatch.montant, "depuis:", bestMatch.source);
      console.log(`📊 Tous les montants trouvés:`, montants.map(m => `${m.montant}€ (ligne ${m.ligne}, priorité ${m.priorite})`));
      return bestMatch.montant.toFixed(2);
    }

    console.log("❌ Aucun montant trouvé");
    console.log("📝 Texte complet pour débogage:", text);
    console.log("📝 Nombre de lignes:", lines.length);
    console.log("📝 Dernières 5 lignes:", lines.slice(-5));
    return "";
  };

  const extractStoreName = (text) => {
    if (!text) return "Magasin inconnu";

    console.log("🏪 Recherche de l'enseigne...");

    const storeKeywords = [
      "INTERMARCHÉ", "INTERMARCHE", "SUPER U", "LECLERC", "AUCHAN",
      "LIDL", "ALDI", "MONOPRIX", "CASINO", "CARREFOUR", "TOTAL", "ESSO",
      "PHARM", "PHARMACIE", "BOUCHERIE", "BOULANGERIE", "EPICERIE"
    ];

    const lines = text.split("\n").map((l) => l.trim());
    const linesUpper = lines.map((l) => l.toUpperCase());

    // Exclusion complète des enseignes bancaires et termes de paiement
    const exclusionBancaire = [
      "CARTE", "CB", "DEBIT", "PAIEMENT", "CONTACT", "SANS CONTACT",
      "BANCAIRE", "BANQUE", "CREDIT", "AGRICOLE", "LANGUEDOC",
      "PREMIER", "PREMIUM", "CLASSIC", "GOLD", "PLATINUM",
      "VISA", "MASTERCARD", "AMEX", "AMERICAN EXPRESS",
      "TICKET", "CLIENT", "A CONSERVER", "NO AUTO",
      "SANS CO", "SANS", "CO", "EDIT", "AGRICOLE"
    ];

    // ÉTAPE 1 : Chercher les enseignes connues
    for (const kw of storeKeywords) {
      const matchIndex = linesUpper.findIndex((l) => l.includes(kw));
      if (matchIndex !== -1) {
        const match = lines[matchIndex];
        if (!exclusionBancaire.some((ex) => linesUpper[matchIndex].includes(ex))) {
          console.log(`✅ Enseigne trouvée (mot-clé connu, ligne ${matchIndex + 1}):`, match);
          return match;
        }
      }
    }

    // ÉTAPE 2 : Trouver la position de la date/heure pour chercher après
    let dateHeureIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = linesUpper[i];
      if (line.match(/\d{2}[\/-]\d{2}[\/-]\d{2,4}/) && (line.includes("A") || line.includes("À") || line.match(/\d{1,2}[.:]\d{2}/))) {
        dateHeureIndex = i;
        console.log(`📅 Date/heure trouvée ligne ${i + 1}:`, lines[i]);
        break;
      }
    }

    // ÉTAPE 3 : Chercher l'enseigne après la date/heure (priorité haute)
    if (dateHeureIndex !== -1) {
      // Chercher dans les 3 lignes suivantes
      for (let i = dateHeureIndex + 1; i <= dateHeureIndex + 3 && i < lines.length; i++) {
        const line = lines[i];
        const lineUpper = linesUpper[i];
        
        // Vérifier que ce n'est pas une exclusion bancaire
        const isExcluded = exclusionBancaire.some((ex) => lineUpper.includes(ex));
        if (isExcluded) continue;
        
        // Vérifier que c'est une ligne valide (lettres, pas seulement chiffres)
        const hasLetters = /[A-ZÀ-ÿ]{3,}/.test(lineUpper);
        const isOnlyNumbers = /^\d+$/.test(line.trim());
        const isValidLength = line.trim().length >= 4 && line.trim().length <= 50;
        
        if (hasLetters && !isOnlyNumbers && isValidLength) {
          // Vérifier qu'il n'y a pas trop de chiffres (ex: codes postaux, numéros)
          const digitCount = (line.match(/\d/g) || []).length;
          const letterCount = (line.match(/[A-ZÀ-ÿ]/gi) || []).length;
          
          // Si c'est principalement des lettres (au moins 60% de lettres)
          if (letterCount >= 3 && digitCount < letterCount * 0.4) {
            console.log(`✅ Enseigne trouvée après date/heure (ligne ${i + 1}):`, line);
            return line.trim();
          }
        }
      }
    }

    // ÉTAPE 4 : Chercher en haut du ticket (premières lignes)
    console.log("🔍 Recherche en haut du ticket...");
    const topLines = lines.slice(0, Math.min(10, lines.length));
    for (let i = 0; i < topLines.length; i++) {
      const line = topLines[i];
      const lineUpper = linesUpper[i];
      
      // Vérifier que ce n'est pas une exclusion bancaire
      const isExcluded = exclusionBancaire.some((ex) => lineUpper.includes(ex));
      if (isExcluded) continue;
      
      // Vérifier que c'est principalement en majuscules (enseigne souvent en majuscules)
      const upperCaseCount = (line.match(/[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ]/g) || []).length;
      const totalLetterCount = (line.match(/[A-Za-zÀ-ÿ]/g) || []).length;
      const isValidLength = line.trim().length >= 4 && line.trim().length <= 50;
      
      // Si c'est principalement en majuscules (au moins 70%) et contient des lettres
      if (totalLetterCount >= 4 && upperCaseCount / totalLetterCount >= 0.7 && isValidLength) {
        // Vérifier qu'il n'y a pas trop de chiffres
        const digitCount = (line.match(/\d/g) || []).length;
        if (digitCount < totalLetterCount * 0.3) {
          // Vérifier que ce n'est pas un numéro de carte ou code
          if (!/^\d{10,}$/.test(line.trim())) {
            console.log(`✅ Enseigne trouvée en haut (ligne ${i + 1}):`, line);
            return line.trim();
          }
        }
      }
    }

    // ÉTAPE 5 : Fallback - chercher toute ligne valide (sans exclusions)
    console.log("🔍 Fallback: recherche dans tout le texte...");
    const candidates = lines.filter((line, index) => {
      const lineUpper = linesUpper[index];
      const isExcluded = exclusionBancaire.some((ex) => lineUpper.includes(ex));
      if (isExcluded) return false;
      
      const isValidLength = line.trim().length >= 4 && line.trim().length <= 50;
      const hasLetters = /[A-ZÀ-ÿ]{3,}/i.test(line);
      const isOnlyNumbers = /^\d+$/.test(line.trim());
      const digitCount = (line.match(/\d/g) || []).length;
      const letterCount = (line.match(/[A-ZÀ-ÿ]/gi) || []).length;
      
      return isValidLength && 
             hasLetters && 
             !isOnlyNumbers && 
             letterCount >= 3 && 
             digitCount < letterCount * 0.5 &&
             !/^\d{10,}$/.test(line.trim());
    });

    if (candidates.length > 0) {
      console.log(`✅ Enseigne trouvée (fallback):`, candidates[0]);
      return candidates[0].trim();
    }

    console.log("❌ Aucune enseigne trouvée");
    return "Magasin inconnu";
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Card className="p-4 sm:p-6 neon-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Scan className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold">
            Scanner une facture
          </h3>
        </div>
        
        <p className="text-xs sm:text-sm text-muted-foreground">
          Téléchargez une image ou utilisez la caméra pour scanner votre facture et extraire automatiquement les informations.
        </p>

        {/* Actions (upload / camera) */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label
            htmlFor="fileInput"
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            Sélectionner une image
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              disabled={isScanning}
            />
          </label>
          
          <Button
            onClick={isCameraOpen ? closeCamera : openCamera}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isScanning}
          >
            <Camera className="w-4 h-4" />
            {isCameraOpen ? "Fermer la caméra" : "Ouvrir la caméra"}
          </Button>

          {capturedImage && (
            <Button
              onClick={resetScan}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Changer
            </Button>
          )}
        </div>

        {/* Webcam */}
        {isCameraOpen && (
          <div className="flex justify-center">
            <div className="w-full max-w-md aspect-video border rounded-lg overflow-hidden bg-black">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={videoConstraints}
                onUserMedia={() => {
                  console.log("✅ Webcam prête");
                }}
                onUserMediaError={(error) => {
                  console.error("❌ Erreur webcam:", error);
                  toast({
                    variant: "destructive",
                    title: "Erreur de caméra",
                    description: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
                  });
                }}
              />
            </div>
          </div>
        )}

        {isCameraOpen && (
          <div className="flex justify-center">
            <Button
              onClick={capture}
              className="flex items-center gap-2"
              disabled={isScanning}
            >
              <Camera className="w-4 h-4" />
              Capturer
            </Button>
          </div>
        )}

        {/* Catégorie */}
        {ocrResult && (
          <div className="space-y-2">
            <label htmlFor="category" className="block text-sm font-medium">
              Catégorie d'achat :
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded-md bg-background text-foreground"
            >
              <option value="">-- Choisissez une catégorie --</option>
              <option value="Alimentation">Alimentation</option>
              <option value="Transport">Transport</option>
              <option value="Santé">Santé</option>
              <option value="Loisirs">Loisirs</option>
              <option value="Autres achats">Autres achats</option>
            </select>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.includes("❌")
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
            }`}
          >
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Progress */}
        {isScanning && (
          <div className="space-y-2">
            <Progress value={scanProgress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              Analyse en cours... {scanProgress}%
            </p>
          </div>
        )}

        {/* Aperçu image */}
        {capturedImage && (
          <div className="flex flex-col items-center space-y-2">
            <h4 className="text-sm font-semibold">Aperçu :</h4>
            <img
              src={capturedImage}
              alt="Image capturée"
              className="max-w-full max-h-[300px] rounded-lg border"
            />
          </div>
        )}

        {/* Informations extraites */}
        {extractedData && (
          <div className="space-y-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h4 className="text-sm font-semibold">Informations extraites :</h4>
            </div>
            
            {/* Enseigne */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Enseigne</p>
              <p className="text-base font-semibold">{extractedData.enseigne || "Non détecté"}</p>
            </div>
            
            {/* Date */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="text-base font-semibold">{extractedData.date || "Non détectée"}</p>
            </div>
            
            {/* Heure */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Heure</p>
              <p className="text-base font-semibold">{extractedData.heure || "Non détectée"}</p>
            </div>
            
            {/* Montant total - TOUJOURS AFFICHÉ */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Montant total</p>
              {extractedData.total ? (
                <p className="text-2xl font-bold text-green-500">
                  {extractedData.total} {extractedData.devise || "€"}
                </p>
              ) : (
                <p className="text-base font-semibold text-muted-foreground">Non détecté</p>
              )}
            </div>

            {/* Section pour enregistrer dans un événement */}
            {showEventSelection && events.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-500/30 space-y-3">
                <Label className="text-sm font-semibold">Enregistrer dans un événement</Label>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Sélectionner un événement</Label>
                  <Select
                    value={selectedEventId || ''}
                    onValueChange={(value) => {
                      console.log('[TesseractTest] Event selected:', value);
                      setSelectedEventId(value);
                      setSelectedParticipantId(null);
                    }}
                  >
                    <SelectTrigger className="neon-border">
                      <SelectValue placeholder="Choisir un événement" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{event.title}</span>
                            <span className="text-xs text-muted-foreground">({event.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedEventId && (() => {
                  const selectedEvent = events.find(e => e.id === selectedEventId);
                  const participants = Array.isArray(selectedEvent?.participants) ? selectedEvent.participants : [];
                  
                  if (participants.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Cet événement n'a pas de participants.
                      </p>
                    );
                  }

                  return (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Sélectionner le participant payeur</Label>
                      <Select
                        value={selectedParticipantId || ''}
                        onValueChange={(value) => {
                          console.log('[TesseractTest] Participant selected:', value);
                          setSelectedParticipantId(value);
                        }}
                      >
                        <SelectTrigger className="neon-border">
                          <SelectValue placeholder="Choisir le participant" />
                        </SelectTrigger>
                        <SelectContent>
                          {participants.map((participant) => (
                            <SelectItem key={participant.id} value={participant.id}>
                              {participant.name} {participant.email ? `(${participant.email})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

                {selectedEventId && selectedParticipantId && extractedData.total && (
                  <Button
                    onClick={async () => {
                      console.log('[TesseractTest] ===== SAVING TO EVENT =====');
                      console.log('[TesseractTest] Event ID:', selectedEventId);
                      console.log('[TesseractTest] Participant ID:', selectedParticipantId);
                      console.log('[TesseractTest] Extracted data:', extractedData);
                      
                      setIsSaving(true);
                      
                      try {
                        const selectedEvent = events.find(e => e.id === selectedEventId);
                        const participant = selectedEvent?.participants.find(p => p.id === selectedParticipantId);
                        
                        if (!selectedEvent || !participant) {
                          throw new Error('Événement ou participant introuvable');
                        }

                        const scannedAmount = parseFloat(extractedData.total);
                        if (isNaN(scannedAmount) || scannedAmount <= 0) {
                          throw new Error('Montant invalide');
                        }

                        // 1. Créer la transaction (RÈGLE BONKONT : validatedBy = validation collective)
                        const transactionData = {
                          store: extractedData.enseigne || 'Magasin inconnu',
                          date: extractedData.date ? (() => {
                            try {
                              if (extractedData.date.includes('/')) {
                                const [day, month, year] = extractedData.date.split('/');
                                return new Date(`${year}-${month}-${day}`).toISOString().split('T')[0];
                              }
                              return extractedData.date;
                            } catch (e) {
                              return new Date().toISOString().split('T')[0];
                            }
                          })() : new Date().toISOString().split('T')[0],
                          time: extractedData.heure || new Date().toTimeString().slice(0, 5),
                          amount: scannedAmount,
                          currency: extractedData.devise === '$' || extractedData.devise === 'USD' ? 'USD' :
                                    extractedData.devise === '£' || extractedData.devise === 'GBP' ? 'GBP' : 'EUR',
                          participants: selectedEvent.participants.map((p) => p.id),
                          payerId: selectedParticipantId,
                          source: 'scanned_ticket',
                          scannedData: extractedData,
                          validatedBy: [selectedParticipantId],
                        };

                        console.log('[TesseractTest] Creating transaction:', transactionData);
                        addTransaction(selectedEventId, transactionData);
                        console.log('[TesseractTest] Transaction created');

                        // 2. Créditer le compte du participant
                        const totalDue = selectedEvent.amount / selectedEvent.participants.length;
                        const alreadyPaid = participant.paidAmount || 0;
                        const newPaidAmount = alreadyPaid + scannedAmount;
                        const isFullyPaid = newPaidAmount >= totalDue - 0.01;

                        console.log('[TesseractTest] Payment calculation:', {
                          totalDue,
                          alreadyPaid,
                          scannedAmount,
                          newPaidAmount,
                          isFullyPaid
                        });

                        updateParticipant(selectedEventId, selectedParticipantId, {
                          hasPaid: isFullyPaid,
                          paidAmount: newPaidAmount,
                          paidDate: new Date(),
                          paymentMethod: 'scanned_ticket'
                        });
                        console.log('[TesseractTest] Participant updated');

                        // 3. Mettre à jour l'événement
                        const currentTotalPaid = selectedEvent.totalPaid || 0;
                        const newTotalPaid = currentTotalPaid + scannedAmount;
                        const eventRemainingAmount = Math.max(0, selectedEvent.amount - newTotalPaid);

                        updateEvent(selectedEventId, {
                          totalPaid: newTotalPaid,
                          remainingAmount: eventRemainingAmount,
                          status: newTotalPaid >= selectedEvent.amount - 0.01 ? 'completed' : 'active'
                        });
                        console.log('[TesseractTest] Event updated');

                        console.log('[TesseractTest] ===== SAVE COMPLETE =====');
                        
                        toast({
                          title: "✅ Enregistré avec succès !",
                          description: `Transaction de ${scannedAmount.toFixed(2)}€ enregistrée pour ${participant.name} dans l'événement "${selectedEvent.title}".`,
                        });

                        // Réinitialiser
                        setSelectedEventId(null);
                        setSelectedParticipantId(null);
                        setExtractedData(null);
                        setImage(null);
                        setCapturedImage(null);
                        setOcrResult("");
                        setScannedText("");
                      } catch (error) {
                        console.error('[TesseractTest] Error saving to event:', error);
                        toast({
                          variant: "destructive",
                          title: "Erreur",
                          description: error.message || "Une erreur est survenue lors de l'enregistrement.",
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="w-full gap-2 button-glow"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer dans l'événement
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Résultat OCR */}
        {ocrResult && (
          <div className="bg-muted rounded-lg shadow-lg">
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b rounded-t-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <h4 className="text-sm font-semibold">Texte extrait :</h4>
              </div>
            </div>

            {/* Contenu OCR */}
            <div
              className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-left overflow-y-auto max-h-[300px]"
            >
              {ocrResult}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
