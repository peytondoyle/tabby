import React from 'react';
import { BillySheet } from '../../components/design-system/BillySheet';
import Avatar from '../kit/Avatar';

interface AnalyzingProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Analyzing({ isOpen, onClose }: AnalyzingProps) {
  return (
    <BillySheet
      open={isOpen}
      onClose={onClose}
      variant="center"
      showCloseButton={false}
      closeOnBackdropClick={false}
      closeOnEscape={false}
    >
      <div className="p-8 text-center">
        <div className="w-64 h-80 bg-white rounded-[20px] mx-auto mb-6 flex items-center justify-center text-6xl">
          ⏳
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">Analyzing receipt</h2>
        
        <div className="flex justify-center gap-4 mt-8">
          <Avatar initials="A" />
          <Avatar initials="B" />
        </div>
      </div>
    </BillySheet>
  );
}
