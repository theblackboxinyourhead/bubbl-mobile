PSTN

Run this in a new terminal: 
ngrok http 8080

In bubbl directory (where you have the Caddyfile.local file) run:
caddy run --config ./frontend/Caddyfile.local

In the media-bridge directory run:
npm run dev

In the frontend directory run:
npm run dev

########################################################

MOBILE
**Precondition**
- Frontend must already be running locally on port `3000`.


Terminal 1
```bash
cd /Users/bartek/Desktop/Main/bubbl_main/bubbl/mobile
npm run start -- --dev-client --host localhost --port 8081
```

Terminal 2
```bash
open -a Simulator; xcrun simctl boot 34EBDEB9-CBCD-4CE4-B77F-B10006D95126 || true; xcrun simctl bootstatus 34EBDEB9-CBCD-4CE4-B77F-B10006D95126 -b; xcrun simctl openurl 34EBDEB9-CBCD-4CE4-B77F-B10006D95126 "exp+bubbl-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
```

Killer.
```bash
lsof -tiTCP:3000,8081 -sTCP:LISTEN | xargs -r kill -9; xcrun simctl shutdown 34EBDEB9-CBCD-4CE4-B77F-B10006D95126 || true
```
