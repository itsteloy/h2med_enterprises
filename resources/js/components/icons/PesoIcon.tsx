import React from 'react';

interface PesoIconProps {
  className?: string;
  size?: number;
}

export const PesoIcon: React.FC<PesoIconProps> = ({ className = "h-6 w-6" }) => {
  return (
    <div className={`${className} flex items-center justify-center font-bold text-current text-xl`}>
      ₱
    </div>
  );
};

export default PesoIcon;