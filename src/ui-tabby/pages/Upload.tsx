import React, { useRef } from 'react';
import { BillySheet } from '../../components/design-system/BillySheet';
import Button from '../kit/Button';

interface UploadProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

export default function Upload({ isOpen, onClose, onFileSelect }: UploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      onClose();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <BillySheet
        open={isOpen}
        onClose={onClose}
        variant="sheet"
        showCloseButton={false}
      >
        <div className="p-6 text-center">
          <div className="text-6xl mb-6">📷</div>
          <h2 className="text-2xl font-bold text-white mb-4">Upload Receipt</h2>
          <p className="text-white/70 mb-8">
            Take a photo or select an image from your gallery
          </p>
          
          <div className="space-y-4">
            <Button 
              primary 
              onClick={handleUploadClick}
              className="w-full h-14 text-lg"
            >
              📷 Take Photo
            </Button>
            <Button 
              onClick={handleUploadClick}
              className="w-full h-14 text-lg bg-white/10 text-white border border-white/20"
            >
              🖼️ Choose from Gallery
            </Button>
          </div>
        </div>
      </BillySheet>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </>
  );
}
