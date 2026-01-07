import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           🔐 Aadhaar XML Verifier Server                  ║
║                                                            ║
║  Server running on: http://localhost:${PORT}                  ║
║                                                            ║
║  Web Interface:     http://localhost:${PORT}                  ║
║  API Endpoint:      POST http://localhost:${PORT}/api/verify  ║
║  Health Check:      GET http://localhost:${PORT}/health       ║
║                                                            ║
║  Press Ctrl+C to stop the server                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
