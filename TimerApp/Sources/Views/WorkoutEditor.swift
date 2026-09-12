import SwiftUI

struct WorkoutEditorView: View {
    var onSave: (Workout) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var name = "My Workout"
    @State private var segments: [Segment] = []

    init(onSave: @escaping (Workout) -> Void) {
        self.onSave = onSave
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Workout Name") {
                    TextField("Name", text: $name)
                }
                Section("Segments") {
                    ForEach(segments.indices, id: \.self) { i in
                        HStack {
                            Text(segments[i].name)
                            Spacer()
                            Text("\(segments[i].durationSeconds)s")
                        }
                    }
                    .onDelete(perform: deleteSegment)
                }
                Button("Add Segment") {
                    segments.append(Segment(
                        type: .work,
                        durationSeconds: 60,
                        countInSeconds: 3,
                        warningThresholds: [10, 3],
                        beepDuration: 3
                    ))
                }
            }
            .navigationTitle("Build Workout")
            .toolbar {
                Button("Save") {
                    let workout = Workout(name: name, segments: segments)
                    onSave(workout)
                    dismiss()
                }
            }
        }
    }

    private func deleteSegment(at offsets: IndexSet) {
        segments.remove(atOffsets: offsets)
    }
}
