import { ReactNode, useState } from 'react';

interface TooltipProps {
    text: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
    const [show, setShow] = useState(false);

    const posClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div className={`absolute ${posClasses[position]} px-2.5 py-1.5 bg-dark-700 text-dark-200 text-xs rounded-lg whitespace-nowrap z-50 border border-dark-600/50 shadow-lg pointer-events-none`}>
                    {text}
                </div>
            )}
        </div>
    );
}
