# Live IPTV Player

A modern, responsive, and web-based IPTV player built with plain HTML, CSS, and JavaScript. This application fetches television channel lists from public M3U playlists and allows you to stream live TV directly in your browser.

## Features

- **Live Streaming**: Integrated with `hls.js` to natively support `.m3u8` streams across all modern browsers.
- **Dynamic M3U Parsing**: Automatically fetches and parses channel data (including logos, groups, and names) from the `iptv-org` public M3U playlist.
- **Category Filtering**: Channels are automatically organized into categories (News, Entertainment, Sports, etc.) based on playlist metadata.
- **Favorites System**: Star your favorite channels to quickly access them later. Your favorites are saved persistently in your browser's local storage.
- **Smart Autoplay**: Automatically plays a high-quality default stream (Aaj Tak HD) upon load. Includes a fallback interactive "Click to Play" overlay to gracefully handle strict browser autoplay policies.
- **Search Functionality**: Instantly search for channels by name.
- **Responsive UI**: A sleek, dark-mode-inspired interface that perfectly adapts to both desktop monitors and mobile devices.

## Tech Stack

- **HTML5 & Vanilla JS**: No heavy frontend frameworks required.
- **CSS3**: Custom responsive styling with Flexbox and CSS Grid.
- **HLS.js**: A robust JavaScript library for HTTP Live Streaming in browsers that don't support it natively.
- **Phosphor Icons**: Beautiful, scalable vector icons used throughout the interface.

## Usage

- **Navigation**: Use the category chips in the sidebar (or top bar on mobile) to filter channels by genre.
- **Playing a Stream**: Click on any channel card to start playing it in the main video player.
- **Favorites**: Click the star icon on any channel card to add it to your favorites. Click the "Favorites" category chip to view all your saved channels.
- **Home/Refresh**: Click the "Live TV" logo in the top left corner to reload the application.

## Troubleshooting

- **Stream not playing?**: Many public IPTV streams are unstable, geo-blocked, or periodically go offline. If a channel doesn't load, try selecting another one.
- **No audio on startup?**: Modern browsers block videos with audio from playing automatically. The app will prompt you with a "Click anywhere to start video" overlay if the browser intervenes. Click it to begin playback.

## Data Source

This project utilizes the massive open-source playlist provided by [iptv-org](https://github.com/iptv-org/iptv) as its primary data source.

## License

This project is open-source and free to use or modify.
