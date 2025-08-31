import React from 'react';
import { motion } from 'framer-motion';
import type { ReceiptState } from '@/lib/receipt';
import { ReceiptStates } from '@/lib/receipt';

interface ReceiptBannerProps {
  receiptState: ReceiptState;
  fileName?: string;
  onView?: () => void;
  onReplace?: () => void;
  onRescan?: () => void;
}

export const ReceiptBanner: React.FC<ReceiptBannerProps> = ({
  receiptState,
  fileName,
  onView,
  onReplace,
  onRescan
}) => {
  const getStatusInfo = () => {
    switch (receiptState) {
      case ReceiptStates.UPLOADED:
        return {
          icon: '📄',
          text: 'Receipt uploaded',
          color: 'bg-blue-50 border-blue-200 text-blue-700'
        };
      case ReceiptStates.PROCESSING:
        return {
          icon: '⏳',
          text: 'Processing receipt...',
          color: 'bg-yellow-50 border-yellow-200 text-yellow-700'
        };
      case ReceiptStates.READY:
        return {
          icon: '✅',
          text: 'Receipt processed',
          color: 'bg-green-50 border-green-200 text-green-700'
        };
      default:
        return {
          icon: '📄',
          text: 'Receipt',
          color: 'bg-gray-50 border-gray-200 text-gray-700'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-3 ${statusInfo.color}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{statusInfo.icon}</span>
          <div>
            <div className="font-medium text-sm">{statusInfo.text}</div>
            {fileName && (
              <div className="text-xs opacity-75 truncate max-w-[200px]">
                {fileName}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onView && (
            <motion.button
              onClick={onView}
              className="px-3 py-1 text-xs bg-white/80 hover:bg-white border border-current rounded-md transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View
            </motion.button>
          )}
          
          {onReplace && (
            <motion.button
              onClick={onReplace}
              className="px-3 py-1 text-xs bg-white/80 hover:bg-white border border-current rounded-md transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Replace
            </motion.button>
          )}
          
          {onRescan && receiptState === ReceiptStates.UPLOADED && (
            <motion.button
              onClick={onRescan}
              className="px-3 py-1 text-xs bg-white/80 hover:bg-white border border-current rounded-md transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Re-scan
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
