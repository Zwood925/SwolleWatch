import Foundation
import AVFoundation

class TTSService: ObservableObject {
    @Published var isSpeaking = false

    // Points to your local XTTS server
    private let endpoint = "http://localhost:5002/speak"

    func speak(_ text: String, voice: String = "male", speed: Double = 1.0) {
        guard !text.isEmpty else { return }
        isSpeaking = true
        // Call local FastAPI endpoint; play audio over mixed session
        // Implementation uses URLSession + AVPlayer.sharedSession mix
        // For brevity, skeleton shown.
        print("XTTS cue: \(text) — voice: \(voice)")
        // After playback, set isSpeaking = false
    }

    func playBeep(duration: Double = 0.3, frequency: Double = 880) {
        // Generate/trigger beep audio; mixed with others
    }
}
