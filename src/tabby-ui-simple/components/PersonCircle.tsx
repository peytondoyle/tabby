import React from 'react';
import './PersonCircle.css';

interface PersonCircleProps {
  name: string;
  image?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  selected?: boolean;
}

export const PersonCircle: React.FC<PersonCircleProps> = ({
  name,
  image,
  size = 'medium',
  onClick,
  selected = false
}) => {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`billy-person-circle ${size} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {image ? (
        <img src={image} alt={name} />
      ) : (
        <span className="initial">{initial}</span>
      )}
    </div>
  );
};