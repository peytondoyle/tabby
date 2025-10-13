import React from 'react';
import {
  Coffee,
  Beer,
  Wine,
  Pizza,
  Sandwich,
  Fish,
  Beef,
  Drumstick,
  Salad,
  Apple,
  IceCream,
  Cake,
  Cookie,
  Soup,
  Milk,
  Egg,
  Croissant,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

// Mapping of keywords to icons
const iconMap: Record<string, LucideIcon> = {
  // Drinks
  coffee: Coffee,
  tea: Coffee,
  latte: Coffee,
  espresso: Coffee,
  cappuccino: Coffee,
  mocha: Coffee,
  beer: Beer,
  ale: Beer,
  lager: Beer,
  wine: Wine,
  champagne: Wine,
  prosecco: Wine,
  cocktail: Wine,
  juice: Milk,
  milk: Milk,
  smoothie: Milk,
  shake: Milk,

  // Main dishes
  pizza: Pizza,
  burger: Beef,
  steak: Beef,
  beef: Beef,
  chicken: Drumstick,
  wings: Drumstick,
  drumstick: Drumstick,
  turkey: Drumstick,
  fish: Fish,
  salmon: Fish,
  tuna: Fish,
  seafood: Fish,
  shrimp: Fish,
  lobster: Fish,
  sandwich: Sandwich,
  wrap: Sandwich,
  panini: Sandwich,
  sub: Sandwich,
  hoagie: Sandwich,

  // Sides & Appetizers
  salad: Salad,
  greens: Salad,
  caesar: Salad,
  soup: Soup,
  broth: Soup,
  chowder: Soup,
  fries: Apple, // Using apple as veggie placeholder
  chips: Apple,
  nachos: Apple,

  // Breakfast
  eggs: Egg,
  omelet: Egg,
  scrambled: Egg,
  fried: Egg,
  croissant: Croissant,
  bagel: Croissant,
  toast: Croissant,
  pancake: Croissant,
  waffle: Croissant,

  // Desserts
  ice: IceCream,
  gelato: IceCream,
  frozen: IceCream,
  cake: Cake,
  pie: Cake,
  tart: Cake,
  cookie: Cookie,
  brownie: Cookie,
  biscuit: Cookie,
};

/**
 * Intelligently matches a food item name to a Lucide icon
 */
export function getFoodIcon(itemName: string): LucideIcon {
  const lowerName = itemName.toLowerCase();

  // Check each keyword in the icon map
  for (const [keyword, Icon] of Object.entries(iconMap)) {
    if (lowerName.includes(keyword)) {
      return Icon;
    }
  }

  // Default fallback icon
  return Utensils;
}

/**
 * Component that renders the appropriate food icon
 */
interface FoodIconProps {
  itemName: string;
  emoji?: string | null; // AI-generated emoji from API
  iconUrl?: string | null; // DALL-E generated icon URL
  size?: number;
  className?: string;
  color?: string;
}

export const FoodIcon: React.FC<FoodIconProps> = ({
  itemName,
  emoji,
  iconUrl,
  size = 20,
  className = '',
  color = 'currentColor'
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Priority 1: AI-generated beautiful flat design icon
  if (iconUrl) {
    return (
      <div
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Loading skeleton while image loads */}
        {!imageLoaded && !imageError && (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {/* Actual icon image */}
        <img
          src={iconUrl}
          alt={itemName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '4px',
            display: imageLoaded && !imageError ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
        />

        {/* Fallback icon on error */}
        {imageError && (
          <Utensils size={size * 0.7} color={color} style={{ opacity: 0.5 }} />
        )}
      </div>
    );
  }

  // Priority 2: AI-generated emoji (only if no icon URL is being generated)
  if (emoji) {
    return (
      <span
        className={className}
        style={{
          fontSize: `${size}px`,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {emoji}
      </span>
    );
  }

  // Priority 3: Fall back to Lucide icon
  const Icon = getFoodIcon(itemName);
  return <Icon size={size} className={className} color={color} />;
};
