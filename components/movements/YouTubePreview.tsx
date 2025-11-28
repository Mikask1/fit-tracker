interface YouTubePreviewProps {
  url: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^&\s]+)/,
    /(?:youtube\.com\/embed\/)([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

export function YouTubePreview({ url }: YouTubePreviewProps) {
  if (!url) return null;

  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video preview"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
