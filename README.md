# Workout Timer — App Store Plan

## Architecture (SwiftUI, native)
- **iPhone**: SwiftUI + Combine + AVAudioSession (.mixWithOthers)
- **Apple Watch**: WatchKit SwiftUI companion app (in bundle)
- **Timer Engine**: Precise 0.1s ticker, configurable segments, count-in, warnings, beep countdown
- **Voice**: FastAPI bridge (`workout_server/server.py`) to your local XTTS model
- **Background**: Timer continues with lock-screen / app background; audio plays over Spotify/Apple Music

## Key Features Implemented
- Full customization (work/rest rounds, durations, count-ins, warning thresholds, beep durations)
- Voice cues via XTTS with gender/preset selection (male_motivational, female_calm, etc.)
- Synthetic beeps (no external files needed) via AVAudioEngine
- Watch companion with mirrored timer + haptics
- App Store bundle: Info.plist, AppIcon asset preview, XcodeGen `project.yml`

## To Build

```bash
# 1. Generate Xcode project (if you have XcodeGen)
# xcodegen generate

# 2. Start local XTTS server
cd workout_server
pip install -r requirements.txt
python server.py

# 3. Open TimerApp/TimerApp.xcodeproj or build with Swift Package
```

## Apple Store Optimization
- **App Icon**: Design 1024×1024 with stopwatch/exercise motif; include in Assets.xcassets
- **Screenshots**: Show count-in, running timer, rest period, finished screen
- **Metadata**: Keywords (HIIT, workout timer, interval timer, Apple Watch)
- **Privacy**: No personal data; just audio session + local storage
- **Rating**: 4.8 target with coaching/voice feature

## Your Customization Point
In TimerApp/Sources/Models/Workout.swift, edit `Segment` to match your example:
- 4min warmup (240s), 5s count-in, 10s/3s warnings, 3s beep
- 45s rest (5s warning, 3s beep)
- 7min work (60s/10s/3s warnings, 3s beep)
- 90s rest (15s warning)

In `ContentView.swift` `sampleWorkout()`, the chain loops as many times as you put in the array.

## Next Step
Confirm this matches your vision and I’ll polish the Watch haptics and submit the full build commands.
