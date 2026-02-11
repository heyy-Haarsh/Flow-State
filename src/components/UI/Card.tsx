import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    glow?: string;
}

const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
};

export default function Card({
    children,
    className = '',
    padding = 'md',
    hover = false,
    glow,
}: CardProps) {
    return (
        <div
            className={`
        bg-dark-800/60 backdrop-blur-lg border border-dark-700/50 rounded-xl
        shadow-lg ${paddings[padding]}
        ${hover ? 'hover:border-dark-600/70 hover:bg-dark-800/80 transition-all duration-300 cursor-pointer' : ''}
        ${className}
      `}
            style={glow ? { boxShadow: `0 0 30px ${glow}20, inset 0 1px 0 ${glow}10` } : undefined}
        >
            {children}
        </div>
    );
}
