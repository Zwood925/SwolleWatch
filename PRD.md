# SwolleWatch - App Store PRD

## 1. Overview
SwolleWatch is a $1.99 native iOS interval workout timer application built with Expo (React Native). It provides custom segment sequences (Work/Rest), high-contrast visual countdowns, two-tone interval chimes, and native Text-To-Speech (TTS) audio cues.

## 2. Core Features
- **Custom Workout Builder:** Add, edit, reorder, or delete custom segments (Name, Duration, Work/Rest Type, Count-in, Beep Type).
- **Voice Cue Engine:** Trigger custom TTS messages at specific remaining seconds in a segment (e.g., "10 seconds left, push!").
- **Visual Timer:** Neon circular progress bar with dark glassmorphism aesthetic.
- **Audio Service:** Native `expo-speech` integration eliminating external API servers.
- **State Persistence:** Local storage via `AsyncStorage` / `Zustand` so workouts persist between app reopens.

## 3. Project Structure
SwolleWatch/
├── app/                  # Expo Router pages
│   ├── index.tsx         # Main Timer Screen
│   ├── builder.tsx       # Workout Builder Modal
│   └── _layout.tsx       # Navigation Root
├── src/
│   ├── components/       # Reusable UI (CircularTimer, SegmentRow, VoiceCueInput)
│   ├── store/            # Zustand workout & timer state
│   ├── services/         # Native TTS & Audio wrapper
│   └── types/            # TypeScript data interfaces
└── assets/               # App icons & sound files