import Foundation
import AVFoundation
import Combine

@MainActor
class TimerEngine: ObservableObject {
    enum State {
        case idle
        case countIn(segmentIndex: Int)
        case running(segmentIndex: Int, segmentElapsed: Double)
        case warning(segmentIndex: Int, secondsLeft: Double)
        case beepCountdown(segmentIndex: Int, secondsLeft: Double)
        case paused(segmentIndex: Int, segmentElapsed: Double)
        case finished
    }

    @Published private(set) var state: State = .idle
    @Published var currentSegmentIndex = 0
    @Published var totalElapsed: TimeInterval = 0
    @Published var currentSecondsLeft: Double = 0

    private var timer: Timer?
    private var segments: [SegmentConfig] = []
    private var lastTick: Date?

    var tts: TTSService?

    func configure(with segments: [SegmentConfig]) {
        self.segments = segments
    }

    func start() {
        guard !segments.isEmpty else { return }
        setupAudioSession()
        advanceToNextSegment()
    }

    func pause() {
        timer?.invalidate()
        if case .running(let idx, let elapsed) = state {
            state = .paused(segmentIndex: idx, segmentElapsed: elapsed)
        } else if case .countIn(let idx) = state {
            // store partial countIn? Keep simple: restart from current
        }
    }

    func resume() {
        if case .paused(let idx, let elapsed) = state {
            state = .running(segmentIndex: idx, segmentElapsed: elapsed)
            startTicking()
        }
    }

    func stop() {
        timer?.invalidate()
        state = .idle
        currentSegmentIndex = 0
        totalElapsed = 0
    }

    private func advanceToNextSegment() {
        guard currentSegmentIndex < segments.count else {
            state = .finished
            return
        }
        let seg = segments[currentSegmentIndex]
        if seg.countInSeconds > 0 {
            state = .countIn(segmentIndex: currentSegmentIndex)
            currentSecondsLeft = seg.countInSeconds
            startCountdown(seconds: seg.countInSeconds, phase: .countIn)
        } else {
            startSegment()
        }
    }

    private func startSegment() {
        let seg = segments[currentSegmentIndex]
        state = .running(segmentIndex: currentSegmentIndex, segmentElapsed: 0)
        currentSecondsLeft = seg.durationSeconds
        startTicking()
    }

    private enum Phase { case countIn, segment }

    private func startCountdown(seconds: Double, phase: Phase) {
        lastTick = Date()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    private func startTicking() {
        lastTick = Date()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tick()
            }
        }
    }

    private func tick() {
        guard let last = lastTick else { return }
        let elapsed = Date().timeIntervalSince(last)
        lastTick = Date()
        totalElapsed += elapsed

        switch state {
        case .countIn(let idx):
            currentSecondsLeft -= elapsed
            if currentSecondsLeft <= 0 {
                startSegment()
            }

        case .running(let idx, let segElapsed):
            let seg = segments[idx]
            let newElapsed = segElapsed + elapsed
            let remaining = seg.durationSeconds - newElapsed

            // Check warning thresholds
            for warn in seg.warningDurations.sorted().reversed() {
                if remaining <= warn && (segElapsed > warn || segElapsed <= warn) {
                    tts?.speak("Warning: \(Int(warn)) seconds left")
                    // avoid repeat
                }
            }
            // Check beep countdown
            if remaining <= seg.warningDurations.min() ?? 3 {
                state = .beepCountdown(segmentIndex: idx, secondsLeft: remaining)
                tts?.playBeep()
            }

            if remaining <= 0 {
                currentSegmentIndex += 1
                advanceToNextSegment()
            } else {
                currentSecondsLeft = remaining
                state = .running(segmentIndex: idx, segmentElapsed: newElapsed)
            }

        case .beepCountdown(let idx, let secs):
            currentSecondsLeft = secs
            // beep logic
            if secs <= 0 {
                currentSegmentIndex += 1
                advanceToNextSegment()
            }

        default:
            break
        }
    }

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            print("Audio session error: \(error)")
        }
    }
}
