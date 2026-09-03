import { useState, useRef, useEffect } from 'react';
import { loadPreferences, savePreferences } from '@web/lib/preferences.js';
import { downloadFile } from '@web/lib/utils.js';
import type { BrandGuidelines } from '@shared-types/brand.js';

export interface TextWordLayer {
  id: string;
  text: string;
  fontFamily: string;
  color: string;
  scale: number;
  position: { x: number; y: number };
}

export function useCanvasEditor(
  brandGuidelines?: BrandGuidelines,
  saveAsset?: (name: string, data: string, type: 'image' | 'doc' | 'video' | 'audio') => Promise<void>,
  prompt?: string
) {
  const [bakeLogoOnGeneration, setBakeLogoOnGeneration] = useState(() => loadPreferences().bakeLogoOnGeneration);
  const [logoPosition, setLogoPosition] = useState(() => loadPreferences().logoPosition);
  const [logoScale, setLogoScale] = useState(() => loadPreferences().logoScale);
  const [logoInverted, setLogoInverted] = useState(() => loadPreferences().logoInverted);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const [textLayers, setTextLayers] = useState<TextWordLayer[]>([]);
  const [selectedTextWordId, setSelectedTextWordId] = useState<string | null>(null);
  const [draggingTextWordId, setDraggingTextWordId] = useState<string | null>(null);
  const [newTextWordInput, setNewTextWordInput] = useState('');
  const [layoutStudioTab, setLayoutStudioTab] = useState<'logo' | 'text'>('logo');

  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize canvas preferences to cookies/storage
  useEffect(() => {
    savePreferences({
      bakeLogoOnGeneration,
      logoPosition,
      logoScale,
      logoInverted
    });
  }, [bakeLogoOnGeneration, logoPosition, logoScale, logoInverted]);

  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
    setDraggingTextWordId(null);
  };

  const handleLogoTouchStart = (e: React.TouchEvent) => {
    setIsDraggingLogo(true);
    setDraggingTextWordId(null);
  };

  const handleTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTextWordId(id);
    setSelectedTextWordId(id);
    setIsDraggingLogo(false);
  };

  const handleTextTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    setDraggingTextWordId(id);
    setSelectedTextWordId(id);
    setIsDraggingLogo(false);
  };

  const handleAddTextWord = (split: boolean) => {
    if (!newTextWordInput.trim()) return;
    
    const words = split 
      ? newTextWordInput.trim().split(/\s+/).filter(Boolean)
      : [newTextWordInput.trim()];
      
    const newLayers = words.map((w, idx) => ({
      id: `text-word-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: w,
      fontFamily: brandGuidelines.typography?.primary || 'Outfit',
      color: brandGuidelines.colors?.[0] || '#ffffff',
      scale: 12, // default scale, matches ~3rem font-size standard in layout
      position: { 
        x: 35 + (idx * 8) % 40, 
        y: 40 + (idx * 6) % 30 
      } // staggered starting placement around center
    }));
    
    setTextLayers(prev => [...prev, ...newLayers]);
    setNewTextWordInput('');
    if (newLayers.length > 0) {
      setSelectedTextWordId(newLayers[0].id);
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDraggingLogo) {
      setLogoPosition({ x: clampedX, y: clampedY });
    } else if (draggingTextWordId) {
      setTextLayers(prev => prev.map(layer => 
        layer.id === draggingTextWordId 
          ? { ...layer, position: { x: clampedX, y: clampedY } } 
          : layer
      ));
    }
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDraggingLogo) {
      setLogoPosition({ x: clampedX, y: clampedY });
    } else if (draggingTextWordId) {
      setTextLayers(prev => prev.map(layer => 
        layer.id === draggingTextWordId 
          ? { ...layer, position: { x: clampedX, y: clampedY } } 
          : layer
      ));
    }
  };

  const handleContainerTouchEnd = () => {
    setIsDraggingLogo(false);
    setDraggingTextWordId(null);
  };

  const handleDownloadInteractiveImage = async (bgSrc: string, logoSrc: string) => {
    const fetchAsLocalUrl = async (url: string): Promise<string> => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
      }
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Proxy fetch failed");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (e) {
        console.warn("Proxy fetch failed for", url, "falling back directly:", e);
        return url;
      }
    };

    let bgLocalUrl = '';
    let logoLocalUrl = '';
    try {
      // Pre-fetch background map behind proxy to avoid CORS/tainted canvas issues entirely!
      bgLocalUrl = await fetchAsLocalUrl(bgSrc);
      if (logoSrc) {
        logoLocalUrl = await fetchAsLocalUrl(logoSrc);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas");

      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";

      const loadPromises = [
        new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = bgLocalUrl;
        })
      ];

      if (logoSrc && logoLocalUrl) {
        loadPromises.push(
          new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
            logoImg.src = logoLocalUrl;
          })
        );
      }

      await Promise.all(loadPromises);

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      ctx.drawImage(bgImg, 0, 0);

      // Render the Logo if present
      if (logoSrc && logoImg.width > 0) {
        const calcLogoWidth = bgImg.width * (logoScale / 100);
        const calcLogoHeight = logoImg.height * (calcLogoWidth / logoImg.width);

        const logoX = bgImg.width * (logoPosition.x / 100);
        const logoY = bgImg.height * (logoPosition.y / 100);

        if (logoInverted) {
          ctx.filter = "invert(1)";
        }
        ctx.drawImage(
          logoImg, 
          logoX - calcLogoWidth / 2, 
          logoY - calcLogoHeight / 2, 
          calcLogoWidth, 
          calcLogoHeight
        );
        if (logoInverted) {
          ctx.filter = "none";
        }
      }

      // Draw all customized text word layers beautifully
      textLayers.forEach(layer => {
        // Compute proportional font size - scale represents % of background width
        const fontSizePr = bgImg.width * (layer.scale / 100);
        
        ctx.font = `bold ${fontSizePr}px "${layer.fontFamily}", "Outfit", "Inter", sans-serif`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const tx = bgImg.width * (layer.position.x / 100);
        const ty = bgImg.height * (layer.position.y / 100);
        
        // Draw text word onto the composite canvas
        ctx.fillText(layer.text, tx, ty);
      });

      const resultDataUrl = canvas.toDataURL('image/png');
      const brandName = brandGuidelines?.name || 'brand';
      const filename = `${brandName.toLowerCase().replace(/\s+/g, '-')}-creative-${Date.now()}.png`;
      downloadFile(resultDataUrl, filename);

      if (saveAsset) {
        saveAsset(`Layout: ${prompt?.slice(0, 15) || 'Creative Custom'}`, resultDataUrl, 'image');
      }
    } catch (err) {
      console.error("Failed to generate exported image with custom logo layout:", err);
      // Fallback
      const brandName = brandGuidelines?.name || 'brand';
      downloadFile(bgSrc, `${brandName.toLowerCase().replace(/\s+/g, '-')}-creative-fallback-${Date.now()}.png`);
    } finally {

      // Cleanup blob URLs to release memory
      if (bgLocalUrl.startsWith('blob:')) URL.revokeObjectURL(bgLocalUrl);
      if (logoLocalUrl.startsWith('blob:')) URL.revokeObjectURL(logoLocalUrl);
    }
  };

  return {
    bakeLogoOnGeneration,
    setBakeLogoOnGeneration,
    logoPosition,
    setLogoPosition,
    logoScale,
    setLogoScale,
    logoInverted,
    setLogoInverted,
    isDraggingLogo,
    setIsDraggingLogo,
    textLayers,
    setTextLayers,
    selectedTextWordId,
    setSelectedTextWordId,
    draggingTextWordId,
    setDraggingTextWordId,
    newTextWordInput,
    setNewTextWordInput,
    layoutStudioTab,
    setLayoutStudioTab,
    containerRef,
    handleLogoMouseDown,
    handleLogoTouchStart,
    handleTextMouseDown,
    handleTextTouchStart,
    handleAddTextWord,
    handleContainerMouseMove,
    handleContainerTouchMove,
    handleContainerTouchEnd,
    handleDownloadInteractiveImage
  };
}
