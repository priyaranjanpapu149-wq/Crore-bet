import axios from 'axios';

const api = axios.create({
  adapter: async (config) => ({
    config,
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {
      data:
        config.url === '/home'
          ? {
              date: '',
              markets: [],
              rates: {},
              notices: [],
              sliders: [],
              settings: {
                siteName: 'Crore Bet',
                tagline: 'Play Big. Win Big.',
                appDownloadUrl: '',
                stats: {
                  players: 5000,
                  games: 25,
                  dailyWinnings: '1 Cr',
                },
              },
            }
          : config.url === '/charts'
            ? []
            : { weeks: [] },
    },
  }),
});

export default api;
