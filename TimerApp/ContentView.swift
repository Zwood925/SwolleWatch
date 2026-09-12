import SwiftUI

struct ContentView: View {
    @StateObject private var timer = TimerEngine()
    @StateObject private var tts = TTSService()
    @State private var workout: [SegmentConfig] = []

    var body: some View {
        VStack(spacing: 20) {
            Text("Workout Timer")
                .font(.largeTitle)
                .bold()

            if workout.isEmpty {
                Text("No workout configured.")
                Button("Load Sample") {
                    workout = sampleWorkout()
                    timer.configure(with: workout)
                }
            } else {
                Text(segmentLabel)
                    .font(.title2)
                Text(timeLabel)
                    .font(.system(size: 80, weight: .bold, design: .rounded))
                    .monospacedDigit()
                HStack {
                    Button("Start") { timer.start() }
                    Button("Pause") { timer.pause() }
                    Button("Reset") { timer.stop() }
                }
            }
        }
        .padding()
        .onAppear {
            timer.tts = tts
        }
    }

    private var segmentLabel: String {
        if timer.currentSegmentIndex < workout.count {
            return workout[timer.currentSegmentIndex].name
        }
        return "Finished"
    }

    private var timeLabel: String {
        let secs = Int(timer.currentSecondsLeft)
        return String(format: "%02d:%02d", secs / 60, secs % 60)
    }

    private func sampleWorkout() -> [SegmentConfig] {
        [
            SegmentConfig(segmentType: .work, durationSeconds: 240,
                          countInSeconds: 5, warningDurations: [10, 3],
                          voiceCues: ["Let's go!"]),
            SegmentConfig(segmentType: .rest, durationSeconds: 45,
                          countInSeconds: 0, warningDurations: [5, 3],
                          voiceCues: ["Recover."]),
            SegmentConfig(segmentType: .work, durationSeconds: 420,
                          countInSeconds: 0, warningDurations: [60, 10, 3],
                          voiceCues: ["Push harder!"])
        ]
    }
}
