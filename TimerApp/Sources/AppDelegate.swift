import UIKit
import AVFoundation

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions
                     launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Configure audio session for background playback + mixing with other apps
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback,
                                    mode: .default,
                                    options: [.mixWithOthers, .duckOthers])
            try session.setActive(true)
        } catch {
            print("Failed to set up audio session: \(error)")
        }
        return true
    }
}
