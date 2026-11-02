import React from 'react';

interface MainContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'standard' | 'narrow' | 'wide' | 'auth';
}

export const MainContainer: React.FC<MainContainerProps> = ({
  children,
  className = '',
  size = 'standard',
}) => {
  const sizeClasses = {
    standard: 'max-w-7xl',
    narrow: 'max-w-4xl',
    wide: 'max-w-[1400px]',
    auth: 'max-w-md',
  }[size];

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 box-border ${sizeClasses} ${className}`}
    >
      {children}
    </div>
  );
};
