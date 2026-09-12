import Foundation
import Combine
import AVFoundation

// MARK: - Timer Phase

enum TimerPhase: Equatable {
    case idle
    case countIn(segmentIndex: Int, secondsLeft: Double)
    case running(segmentIndex: Int, secondsLeft: Double)
    case warning(segmentIndex: Int, secondsLeft: Double, threshold: Int)
    case beepCountdown(segmentIndex: Int, secondsLeft: Double)
    case paused(segmentIndex: Int, secondsLeft: Double)
    case finished
}

// MARK: - Timer Engine

@MainActor
final class TimerEngine: ObservableObject {

    // MARK: - Published State
    @Published private(set) var phase: TimerPhase = .idle
    @Published private(set) var currentSegmentIndex: Int = 0
    @Published private(set) var totalElapsed: TimeInterval = 0
    @Published private(set) var secondsLeft: Double = 0
    @Published private(set) var isRunning: Bool = false

    // MARK: - Dependencies
    private let ttsService: TTSService
    private let audioService: AudioService

    // MARK: - Internal State
    private var timer: Timer?
    private var segments: [Segment] = []
    private var lastTick: Date?
    private var pausedAt: Date?
    private var activeWarnings: Set<Int> = []  // tracks which thresholds already fired

    // MARK: - Computed
    var currentSegment: Segment? {
        guard currentSegmentIndex < segments.count else { return nil }
        return segments[currentSegmentIndex]
    }

    var progress: Double {
        guard let seg = currentSegment else { return 0 }
        let total = Double(seg.durationSeconds)
        return 1 - (secondsLeft / total)
    }

    // MARK: - Init

    init(ttsService: TTSService = TTSService(),
         audioService: AudioService = AudioService()) {
        self.ttsService = ttsService
        self.audioService = audioService
    }

    // MARK: - Configuration

    func configure(with workout: Workout) {
        stop()
        self.segments = workout.segments
    }

    func configure(with segments: [Segment]) {
        stop()
        self.segments = segments
    }

    // MARK: - Controls

    func start() {
        guard !segments.isEmpty else { return }
        isRunning = true
        advanceToSegment(0)
    }

    func pause() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        pausedAt = Date()
        if case .running(let idx, let secs) = phase {
            phase = .paused(segmentIndex: idx, secondsLeft: secs)
        } else if case .countIn(let idx, let secs) = phase {
            phase = .paused(segmentIndex: idx, secondsLeft: secs)
        }
    }

    func resume() {
        guard case .paused(let idx, let secs) = phase else { return }
        isRunning = true
        phase = .running(segmentIndex: idx, secondsLeft: secs)
        startTicker()
    }

    func stop() {
        timer?.invalidate()
        timer = nil
        isRunning = false
        currentSegmentIndex = 0
        totalElapsed = 0
        secondsLeft = 0
        activeWarnings = []
        phase = .idle
    }

    func skipToNextSegment() {
        guard currentSegmentIndex < segments.count else { return }
        currentSegmentIndex += 1
        advanceToSegment(currentSegmentIndex)
    }

    // MARK: - Segment Flow

    private func advanceToSegment(_ index: Int) {
        guard index < segments.count else {
            phase = .finished
            isRunning = false
            ttsService.speak("Workout complete! Great job!")
            return
        }

        let seg = segments[index]
        currentSegmentIndex = index
        activeWarnings = []
        audioService.playCountInBeep()

        phase = .countIn(segmentIndex: index, secondsLeft: Double(seg.countInSeconds))
        secondsLeft = Double(seg.countInSeconds)
        startTicker()

        if seg.countInSeconds == 0 {
            startSegment(index)
        }
    }

    private func startSegment(_ index: Int) {
        let seg = segments[index]
        phase = .running(segmentIndex: index, secondsLeft: Double(seg.durationSeconds))
        secondsLeft = Double(seg.durationSeconds)
        activeWarnings = []

        ttsService.speak(seg.name, preset: "segment_start")
    }

    // MARK: - Ticker

    private func startTicker() {
        lastTick = Date()
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    private func tick() {
        guard let last = lastTick else { return }
        let dt = Date().timeIntervalSince(last)
        lastTick = Date()
        totalElapsed += dt

        switch phase {
        case .countIn(let idx, let secs):
            let newSecs = secs - dt
            if newSecs <= 0 {
                startSegment(idx)
            } else {
                secondsLeft = newSecs
                phase = .countIn(segmentIndex: idx, secondsLeft: newSecs)
            }

        case .running(let idx, let secs):
            let newSecs = secs - dt
            let seg = segments[idx]

            // Warning thresholds
            for threshold in seg.warningThresholds.sorted().reversed() {
                if newSecs <= Double(threshold) && !activeWarnings.contains(threshold) {
                    activeWarnings.insert(threshold)
                    phase = .warning(segmentIndex: idx, secondsLeft: newSecs, threshold: threshold)
                    handleWarning(seg: seg, threshold: threshold, secondsLeft: newSecs)
                }
            }

            // Final beep countdown
            let beepStart = Double(seg.beepDuration)
            if newSecs <= beepStart && newSecs > 0 {
                if case .running = phase {
                    phase = .beepCountdown(segmentIndex: idx, secondsLeft: newSecs)
                }
                handleBeepCountdown(secondsLeft: newSecs, beepDuration: seg.beepDuration)
            }

            // Segment complete
            if newSecs <= 0 {
                advanceToSegment(idx + 1)
            } else {
                secondsLeft = newSecs
                if case .running = phase {
                    phase = .running(segmentIndex: idx, secondsLeft: newSecs)
                }
            }

        case .beepCountdown(let idx, let secs):
            secondsLeft = secs
            handleBeepCountdown(secondsLeft: secs, beepDuration: segments[idx].beepDuration)

        case .finished:
            timer?.invalidate()

        default:
            break
        }
    }

    // MARK: - Audio / Voice Handlers

    private func handleWarning(seg: Segment, threshold: Int, secondsLeft: Double) {
        let cue = seg.voiceCues.first { $0.triggerSecondsBefore == threshold }
        let text = cue?.text ?? "\(threshold) seconds"
        let preset = cue?.voicePreset ?? "warning"
        let volume = cue?.volume ?? 0.8
        ttsService.speak(text, preset: preset, volume: volume)
        audioService.playWarningBeep(intensity: Float(volume))
    }

    private func handleBeepCountdown(secondsLeft: Double, beepDuration: Int) {
        // Play tick every second in the beep window
        let secs = Int(secondsLeft)
        if Double(secs) == secondsLeft {
            audioService.playTick()
        }
    }

    // MARK: - Helpers

    var formattedTime: String {
        let total = Int(secondsLeft.rounded(.up))
        let m = total / 60
        let s = total % 60
        return String(format: "%02d:%02d", m, s)
    }

    var totalTimeLabel: String {
        let total = Int(secondsLeft.rounded(.up))
        let m = total / 60
        let s = total % 60
        if m > 0 {
            return "\(m)m \(s)s"
        }
        return "\(s)s"
    }
}
