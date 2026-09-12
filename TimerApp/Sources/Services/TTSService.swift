import Foundation
import AVFoundation
import Combine

final class TTSService: ObservableObject {
    @Published var isSpeaking: Bool = false

    private let endpoint = "http://localhost:5002/speak"
    private var audioPlayer: AVAudioPlayer?

    func speak(_ text: String, preset: String = "default", volume: Double = 1.0) {
        guard !text.isEmpty else { return }
        isSpeaking = true

        // 1. Call your local XTTS endpoint (python server running on local network)
        // 2. Receive audio file / base64
        // 3. Play with AVAudioPlayer, mixed with others
        print("TTS [\(preset)]: \(text) (vol \(volume))")

        // For real integration, replace with URLSession + AVPlayer
        // with category .playback + mixWithOthers
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.isSpeaking = false
        }
    }
}
