# Radio Starlight Urk — EAS Build instructies

## 1. Installeer vereisten
```bash
npm install -g eas-cli pnpm
```

## 2. Uitpakken en installeren
```bash
unzip starlight-urk-expo.zip -d starlight-urk
cd starlight-urk
pnpm install
```

## 3. Git-repo initialiseren (verplicht voor EAS)
```bash
git init
git add .
git commit -m "init"
```

## 4. Inloggen bij Expo
```bash
eas login
```

## 5. Bouwen

### APK (voor testen / sideloaden):
```bash
eas build --platform android --profile preview
```

### App Bundle (voor Google Play Store):
```bash
eas build --platform android --profile production
```

De build draait in de Expo-cloud. Je ontvangt een downloadlink zodra hij klaar is.
