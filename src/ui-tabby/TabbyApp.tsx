import React, { useState, useRef, useEffect } from 'react';
import './tokens.css';
import './styles.css';
import Welcome from './pages/Welcome';
import Analyzing from './pages/Analyzing';
import Upload from './pages/Upload';
import BillyAssign from './pages/BillyAssign';
import ShareModal from './pages/ShareModal';
import { useScanAdapter } from './adapters/useScanAdapter';

type Step = 'welcome' | 'analyzing' | 'assign' | 'share';

export default function TabbyApp() {
  const [step, setStep] = useState<Step>('welcome');
  const [isScanning, setIsScanning] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const { startScan } = useScanAdapter();

  // Wrap everything in a proper full-screen container
  const renderContent = () => {
    if (step === 'welcome') {
      return (
        <>
          <Welcome onStart={handleStartScan} />
          <Upload 
            isOpen={showUpload}
            onClose={() => setShowUpload(false)}
            onFileSelect={handleFileSelect}
          />
          <Analyzing 
            isOpen={showAnalyzing}
            onClose={() => setShowAnalyzing(false)}
          />
        </>
      );
    }
    
    if (step === 'assign') {
      return <BillyAssign onNext={() => setStep('share')} />;
    }
    
    if (step === 'share') {
      return <ShareModal onBack={() => setStep('assign')} />;
    }
    
    return null;
  };

  // Load fonts dynamically and preload for better performance
  useEffect(() => {
    // Preload fonts
    const preloadVT323 = document.createElement('link');
    preloadVT323.rel = 'preload';
    preloadVT323.href = 'https://fonts.gstatic.com/s/vt323/v17/pxiKyp0ihIEF2isfFJXUdVNF.woff2';
    preloadVT323.as = 'font';
    preloadVT323.type = 'font/woff2';
    preloadVT323.crossOrigin = 'anonymous';
    
    // Load font stylesheet
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap';
    link.rel = 'stylesheet';
    
    document.head.appendChild(preloadVT323);
    document.head.appendChild(link);
    
    return () => {
      if (document.head.contains(preloadVT323)) {
        document.head.removeChild(preloadVT323);
      }
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  const handleStartScan = async () => {
    setShowUpload(true);
  };

  const handleFileSelect = async (file: File) => {
    setShowUpload(false);
    setShowAnalyzing(true);
    setIsScanning(true);

    try {
      await startScan(file);
      setShowAnalyzing(false);
      setStep('assign');
    } catch (error) {
      console.error('Scan failed:', error);
      setShowAnalyzing(false);
      setStep('welcome');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0C0D10] text-white">
      {renderContent()}
    </div>
  );
}
