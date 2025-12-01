'use client';

import { Share2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useState } from 'react';

interface ShareButtonProps {
    targetId: string; // ID of the element to capture
    title: string;
}

export function ShareButton({ targetId, title }: ShareButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleShare = async () => {
        setIsGenerating(true);
        try {
            const element = document.getElementById(targetId);
            if (!element) return;

            const canvas = await html2canvas(element, {
                backgroundColor: '#FFDE00', // Neo-Brutalism Yellow
                scale: 2, // High resolution
            });

            const image = canvas.toDataURL('image/png');

            // Download logic
            const link = document.createElement('a');
            link.href = image;
            link.download = `trending-top5-${title}.png`;
            link.click();

            // In a real app, we might use Web Share API if supported
            if (navigator.share) {
                const blob = await (await fetch(image)).blob();
                const file = new File([blob], 'trend.png', { type: 'image/png' });
                try {
                    await navigator.share({
                        title: 'Trending Top 5',
                        text: `Check out this trend: ${title}`,
                        files: [file],
                    });
                } catch (e) {
                    console.log('Share API failed or cancelled', e);
                }
            }

        } catch (error) {
            console.error('Error generating image:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 bg-[var(--color-nb-green)] text-black font-bold py-4 flex items-center justify-center gap-2 border-2 border-black shadow-hard hover:brightness-110 transition-all disabled:opacity-50"
        >
            {isGenerating ? (
                <span className="animate-pulse">GENERATING...</span>
            ) : (
                <>
                    <Share2 className="w-5 h-5" />
                    SHARE IMAGE
                </>
            )}
        </button>
    );
}
