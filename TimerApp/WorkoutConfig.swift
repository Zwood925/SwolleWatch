import Foundation
import AVFoundation

struct TimerConfig: Codable {
    var name: String
    var rounds: [SegmentConfig]
}

struct SegmentConfig: Codable, Identifiable {
    let id: UUID = UUID()
    var segmentType: SegmentType // .work or .rest
    var durationSeconds: Double // total length of segment
    var countInSeconds: Double // countdown before segment starts
    var warningDurations: [Double] // e.g., [60, 10, 3]
    var voiceCues: [String] // motivational strings for XTTS
}

enum SegmentType: String, Codable {
    case work, rest
}
