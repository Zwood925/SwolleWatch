import SwiftUI
import WatchKit

struct WatchContentView: View {
    @ObservedObject private var timerEngine = TimerEngine()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 12) {
                Text("Timer")
                    .font(.headline)
                    .foregroundColor(.orange)
                Text(timerEngine.formattedTime)
                    .font(.system(size: 48, weight: .bold, design: .monospaced))
                Button(action: timerEngine.start) {
                    Image(systemName: "play.fill")
                }
            }
        }
    }
}
