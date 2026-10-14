import { defineConfig } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0) so it's accessible from cellphone
  },
  plugins: [
    qrcode({
      filter: (url) => {
        // Exclude localhost and loopbacks completely
        if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1')) {
          return false;
        }
        // Exclude internal docker bridge networks if desired, leaving only the real Wi-Fi / LAN IP
        if (url.includes('172.17.') || url.includes('172.18.')) {
          return false;
        }
        return true;
      },
    }),
  ],
});
