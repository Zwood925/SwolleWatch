import Foundation

// MARK: - Workout Data Models

struct Workout: Codable, Identifiable {
    let id: UUID
    var name: String
    var segments: [Segment]
    var createdAt: Date

    init(name: String, segments: [Segment]) {
        self.id = UUID()
        self.name = name
        self.segments = segments
        self.createdAt = Date()
    }
}

struct Segment: Codable, Identifiable, Equatable {
    let id: UUID
    var name: String
    var type: SegmentType
    var durationSeconds: Int
    var countInSeconds: Int
    var warningThresholds: [Int]  // e.g. [60, 10, 3] seconds before end
    var beepDuration: Int         // final countdown beep duration (e.g. 3 seconds)
    var voiceCues: [VoiceCue]
    var voiceCueAt: [String: Int]  // "pumpup" at 30 seconds, etc.

    init(name: String = "",
         type: SegmentType,
         durationSeconds: Int = 60,
         countInSeconds: Int = 3,
         warningThresholds: [Int] = [10, 3],
         beepDuration: Int = 3,
         voiceCues: [VoiceCue] = [],
         voiceCueAt: [String: Int] = [:]) {
        self.id = UUID()
        self.name = name.isEmpty ? (type == .work ? "Work" : "Rest") : name
        self.type = type
        self.durationSeconds = durationSeconds
        self.countInSeconds = countInSeconds
        self.warningThresholds = warningThresholds
        self.beepDuration = beepDuration
        self.voiceCues = voiceCues
        self.voiceCueAt = voiceCueAt
    }
}

enum SegmentType: String, Codable, CaseIterable {
    case warmup = "Warmup"
    case work = "Work"
    case rest = "Rest"
    case cooldown = "Cooldown"

    var color: String {
        switch self {
        case .warmup: return "orange"
        case .work: return "red"
        case .rest: return "green"
        case .cooldown: return "blue"
        }
    }
}

struct VoiceCue: Codable, Identifiable, Equatable {
    let id: UUID
    var text: String
    var triggerSecondsBefore: Int?  // nil = at segment start
    var voicePreset: String         // "male_motivational", "female_calm", etc.
    var volume: Double              // 0.0-1.0 relative volume

    init(text: String,
         triggerSecondsBefore: Int? = nil,
         voicePreset: String = "default",
         volume: Double = 1.0) {
        self.id = UUID()
        self.text = text
        self.triggerSecondsBefore = triggerSecondsBefore
        self.voicePreset = voicePreset
        self.volume = volume
    }
}
