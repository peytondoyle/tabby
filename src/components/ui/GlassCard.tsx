/**
 * @deprecated Use GlassCardV2 instead. This component will be removed in a future version.
 * GlassCardV2 provides better glass effects, improved motion, and enhanced accessibility.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'strong';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  title,
  subtitle,
  actions,
  padding = 'md',
  variant = 'default',
  className = '',
  style,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 md:p-5',
    lg: 'p-5 md:p-6 lg:p-8'
  };

  const baseClasses = cn(
    'rounded-[var(--radius)]',
    'border transition-all duration-[var(--transition-base)]',
    variant === 'strong' ? [
      'bg-[hsl(var(--bg-strong))]',
      'backdrop-blur-2xl',
      'border-[hsl(var(--glass-border))]'
    ] : [
      'bg-[hsl(var(--glass))]',
      'backdrop-blur-xl',
      'border-[hsl(var(--glass-border))]'
    ],
    'shadow-glass',
    className
  );

  return (
    <motion.div
      className={baseClasses}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={style}
      onClick={onClick}
    >
      {(title || subtitle || actions) && (
        <div className={cn(
          'flex items-start justify-between',
          padding !== 'none' ? paddingClasses[padding] : 'p-4 md:p-5',
          children ? 'border-b border-[hsl(var(--glass-border))]' : ''
        )}>
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold tracking-tight text-[hsl(var(--text))]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-[hsl(var(--muted))]">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {children && (
        <div className={paddingClasses[padding]}>
          {children}
        </div>
      )}
    </motion.div>
  );
};

export default GlassCard;