import SwiftUI

struct ContentView: View {
    @StateObject private var timerEngine: TimerEngine
    @StateObject private var ttsService = TTSService()
    @StateObject private var audioService = AudioService()

    @State private var selectedWorkout: Workout? = nil
    @State private var showEditor = false

    init() {
        let engine = TimerEngine()
        _timerEngine = StateObject(wrappedValue: engine)
    }

    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemBackground).ignoresSafeArea()
                VStack(spacing: 32) {
                    // Phase indicator
                    Text(phaseLabel)
                        .font(.largeTitle.weight(.bold))
                        .foregroundColor(phaseColor)
                        .animation(.easeInOut(duration: 0.3), value: timerEngine.phase)

                    // Main timer
                    Text(timerEngine.formattedTime)
                        .font(.system(size: 120, weight: .thin, design: .monospaced))
                        .foregroundColor(phaseColor)

                    // Progress ring
                    ProgressCircle(progress: timerEngine.progress)
                        .frame(width: 200, height: 200)
                        .animation(.easeInOut(duration: 0.2), value: timerEngine.progress)

                    // Segment info
                    if let seg = timerEngine.currentSegment {
                        VStack(spacing: 8) {
                            Text(seg.name)
                                .font(.title2)
                            Text("\(seg.durationSeconds)s work · \(seg.countInSeconds)s count-in · \(seg.beepDuration)s beep")
                                .font(.caption)
                                .opacity(0.7)
                        }
                    }

                    // Control buttons
                    HStack(spacing: 24) {
                        if timerEngine.isRunning {
                            Button(action: timerEngine.pause) {
                                Label("Pause", systemImage: "pause.fill")
                                    .font(.headline)
                                    .padding(.horizontal, 24, .vertical, 12)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.orange)
                        } else {
                            if case .paused = timerEngine.phase {
                                Button(action: timerEngine.resume) {
                                    Label("Resume", systemImage: "play.fill")
                                        .font(.headline)
                                        .padding(.horizontal, 24, .vertical, 12)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.green)
                            } else {
                                Button(action: timerEngine.start) {
                                    Label("Start", systemImage: "play.fill")
                                        .font(.headline)
                                        .padding(.horizontal, 24, .vertical, 12)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(.red)
                                .disabled(selectedWorkout == nil)
                            }
                        }

                        Button(action: timerEngine.stop) {
                            Label("Reset", systemImage: "stop.fill")
                                .font(.headline)
                                .padding(.horizontal, 24, .vertical, 12)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.top, 8)

                    // Configure button
                    Button(action: { showEditor = true }) {
                        Label("Configure Workout", systemImage: "slider.horizontal.3")
                    }
                    .padding()
                }
                .padding()
            }
            .navigationTitle("Workout Timer")
            .sheet(isPresented: $showEditor) {
                WorkoutEditorView { workout in
                    timerEngine.configure(with: workout)
                    selectedWorkout = workout
                }
            }
        }
        .onAppear {
            timerEngine.configure(with: sampleWorkout())
            selectedWorkout = sampleWorkout()
        }
    }

    private var phaseLabel: String {
        switch timerEngine.phase {
        case .idle: return "Ready"
        case .countIn: return "Get Ready"
        case .running: return timerEngine.currentSegment?.name ?? "Work"
        case .warning: return "Warning"
        case .beepCountdown: return "Go!"
        case .paused: return "Paused"
        case .finished: return "Done"
        }
    }

    private var phaseColor: Color {
        switch timerEngine.phase {
        case .idle: return .gray
        case .countIn, .countIn: return .orange
        case .running: return timerEngine.currentSegment?.type == .rest ? .green : .red
        case .warning: return .yellow
        case .beepCountdown: return .red
        case .paused: return .gray
        case .finished: return .blue
        }
    }

    private func sampleWorkout() -> Workout {
        let warmup = Segment(
            name: "Warmup",
            type: .warmup,
            durationSeconds: 240,
            countInSeconds: 5,
            warningThresholds: [60, 10, 3],
            beepDuration: 3,
            voiceCues: [
                VoiceCue(text: "Warm up time. Let's go.", triggerSecondsBefore: 0, voicePreset: "male_motivational", volume: 0.9)
            ],
            voiceCueAt: ["start": 0]
        )
        let rest1 = Segment(
            name: "Rest",
            type: .rest,
            durationSeconds: 45,
            countInSeconds: 0,
            warningThresholds: [5, 3],
            beepDuration: 3,
            voiceCues: [
                VoiceCue(text: "Recover. Breathe.", triggerSecondsBefore: 0, voicePreset: "female_calm", volume: 0.8)
            ],
            voiceCueAt: ["start": 0, "5s_left": 5]
        )
        let round = Segment(
            name: "Round",
            type: .work,
            durationSeconds: 420,
            countInSeconds: 0,
            warningThresholds: [60, 10, 3],
            beepDuration: 3,
            voiceCues: [
                VoiceCue(text: "Let's work!", triggerSecondsBefore: 0, voicePreset: "male_motivational", volume: 0.9),
                VoiceCue(text: "One minute left", triggerSecondsBefore: 60, voicePreset: "male_motivational", volume: 0.85),
                VoiceCue(text: "Ten seconds", triggerSecondsBefore: 10, voicePreset: "male_motivational", volume: 1.0)
            ],
            voiceCueAt: ["start": 0, "60s_left": 60, "10s_left": 10]
        )
        return Workout(name: "HIIT Sample", segments: [warmup, rest1, round, rest1, round])
    }
}

struct ProgressCircle: View {
    let progress: Double
    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.gray.opacity(0.2), lineWidth: 12)
            Circle()
                .trim(from: 0, to: CGFloat(min(progress, 1.0)))
                .stroke(Color.red, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut(duration: 0.2), value: progress)
        }
    }
}
