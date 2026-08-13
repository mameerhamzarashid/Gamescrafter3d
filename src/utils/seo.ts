import { Game } from '../types';

export function updatePageSEO(title: string, description: string, url: string = window.location.href, image?: string) {
  if (typeof document === 'undefined') return;

  // Title
  document.title = title;

  // Meta Description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', description);
  }

  // Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);

  if (image) {
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute('content', image);
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.setAttribute('content', image);
  }

  // Canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', url);
  }
}

export function updateHomeSEO() {
  const title = 'GamesCrafter Store - Play 30+ Free Instant HTML5 Games Online';
  const description = 'Play 30+ instant HTML5 cyber games online for free on mobile and desktop. No downloads, 1-Player and 2-Player modes, arcade racing, retro puzzles, and space action.';
  const url = 'https://gamescrafter.store/';
  updatePageSEO(title, description, url);
}

export function updateGameSEO(game: Game) {
  const title = `${game.title} - Play Free Online | GamesCrafter Store`;
  const description = `Play ${game.title} (${game.genre}, ${game.playerMode}) free on GamesCrafter Store. ${game.description} Instant HTML5 gameplay on mobile and desktop.`;
  const url = `https://gamescrafter.store/games/${game.id}`;
  updatePageSEO(title, description, url, game.thumbnailUrl);

  // Ingest Game structured data
  try {
    let script = document.getElementById('game-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'game-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "VideoGame",
      "name": game.title,
      "description": game.description,
      "genre": game.genre,
      "gamePlatform": ["Web Browser", "Android", "iOS", "Mobile", "Desktop"],
      "applicationCategory": "Game",
      "image": game.thumbnailUrl,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": game.rating.toString(),
        "bestRating": "5",
        "ratingCount": Math.floor(game.plays / 10).toString()
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    });
  } catch {
    // ignore
  }
}
