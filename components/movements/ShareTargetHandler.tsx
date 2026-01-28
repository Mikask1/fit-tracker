'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface ShareTargetHandlerProps {
  onShare: (data: { name?: string; note?: string; image?: string }) => void;
}

export function ShareTargetHandler({ onShare }: ShareTargetHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const source = searchParams.get('source');
    const title = searchParams.get('title');
    const text = searchParams.get('text');
    const url = searchParams.get('url');

    if (source === 'share' && (title || text || url)) {
      // Construct initial form data from shared content
      const initialFormData = {
        name: title || text?.slice(0, 50) || 'Shared Exercise',
        note: [text, url].filter(Boolean).join('\n'),
        image: url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? url : '',
      };

      onShare(initialFormData);
      toast.info('Creating exercise from shared content');
    }
  }, [searchParams, onShare]);

  return null;
}
