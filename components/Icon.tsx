
import React from 'react';

interface IconProps {
  as: React.ElementType;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ as: Component, className }) => {
  return <Component className={className} />;
};
