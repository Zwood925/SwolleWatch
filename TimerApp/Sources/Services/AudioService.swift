import AVFoundation
import Foundation

final class AudioService {

    private var tickPlayer: AVAudioPlayer?
    private var warningPlayer: AVAudioPlayer?
    private var beepPlayer: AVAudioPlayer?

    init() {
        setupPlayers()
    }

    func setupPlayers() {
        // Load from Resources: tick.wav, warning.mp3, beep.wav
        // Fallback: generate tones programmatically with AVAudioEngine
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    func playCountInBeep() {
        // Play 3-second count-in beeps
        playTone(frequency: 880, duration: 0.3)
    }

    func playTick() {
        playTone(frequency: 1100, duration: 0.05)
    }

    func playWarningBeep(intensity: Float = 0.5) {
        playTone(frequency: 660, duration: 0.15)
    }

    /// Generate synthetic beep using AVAudioEngine for zero-file dependency
    private func playTone(frequency: Double, duration: TimeInterval) {
        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1))

        let sampleRate = 44100.0
        let count = Int(duration * sampleRate)
        let buffer = AVAudioPCMBuffer(pcmFormat: AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!, frameCapacity: AVAudioFrameCount(count))!
        for i in 0..<count {
            let t = Double(i) / sampleRate
            let val = sin(2 * .pi * frequency * t)
            buffer.floatChannelData?[0][i] = Float(val)
        }

        do {
            try engine.start()
            player.scheduleBuffer(buffer)
            player.play()
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                engine.stop()
            }
        } catch {
            print("Audio engine error: \(error)")
        }
    }
}
