import { Pressable, Text, TextInput, View } from 'react-native';

import type { Segment, VoiceCue } from '../types/workout';

interface SegmentEditorProps {
  segment: Segment;
  onUpdate: (segment: Segment) => void;
  onDelete: () => void;
}

const BEEP_TYPES: Segment['beepType'][] = [
  'Tick',
  'RoundEnd',
  'RestEnd',
  'None',
];

function parseSeconds(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

export function SegmentEditor({
  segment,
  onUpdate,
  onDelete,
}: SegmentEditorProps) {
  const update = (partial: Partial<Segment>) => {
    onUpdate({ ...segment, ...partial });
  };

  const updateVoiceCue = (index: number, partial: Partial<VoiceCue>) => {
    const voiceCues = segment.voiceCues.map((cue, i) =>
      i === index ? { ...cue, ...partial } : cue
    );
    update({ voiceCues });
  };

  const addVoiceCue = () => {
    update({
      voiceCues: [...segment.voiceCues, { text: '', triggerSeconds: 10 }],
    });
  };

  const removeVoiceCue = (index: number) => {
    update({
      voiceCues: segment.voiceCues.filter((_, i) => i !== index),
    });
  };

  return (
    <View className="bg-neutral-900 rounded-xl p-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-base font-semibold">Segment</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text className="text-red-400 text-sm font-medium">Delete</Text>
        </Pressable>
      </View>

      <Text className="text-neutral-400 text-xs mb-1">Name</Text>
      <TextInput
        className="bg-neutral-800 text-white rounded-lg px-3 py-2 mb-3 border border-neutral-700"
        placeholder="Warmup, Heavy Bag..."
        placeholderTextColor="#737373"
        value={segment.name}
        onChangeText={(name) => update({ name })}
      />

      <Text className="text-neutral-400 text-xs mb-1">Type</Text>
      <View className="flex-row mb-3 gap-2">
        {(['Work', 'Rest'] as const).map((type) => {
          const selected = segment.type === type;
          return (
            <Pressable
              key={type}
              onPress={() => update({ type })}
              className={`flex-1 rounded-lg py-2 items-center border ${
                selected
                  ? 'bg-orange-500 border-orange-500'
                  : 'bg-neutral-800 border-neutral-700'
              }`}
            >
              <Text
                className={`font-medium ${selected ? 'text-white' : 'text-neutral-300'}`}
              >
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row mb-3 gap-3">
        <View className="flex-1">
          <Text className="text-neutral-400 text-xs mb-1">Duration (sec)</Text>
          <TextInput
            className="bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700"
            keyboardType="number-pad"
            value={String(segment.duration)}
            onChangeText={(value) => update({ duration: parseSeconds(value) })}
          />
        </View>
        <View className="flex-1">
          <Text className="text-neutral-400 text-xs mb-1">Count-in (sec)</Text>
          <TextInput
            className="bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700"
            keyboardType="number-pad"
            value={String(segment.countIn)}
            onChangeText={(value) => update({ countIn: parseSeconds(value) })}
          />
        </View>
      </View>

      <Text className="text-neutral-400 text-xs mb-1">Beep Type</Text>
      <View className="flex-row flex-wrap mb-4 gap-2">
        {BEEP_TYPES.map((beepType) => {
          const selected = segment.beepType === beepType;
          return (
            <Pressable
              key={beepType}
              onPress={() => update({ beepType })}
              className={`rounded-lg px-3 py-2 border ${
                selected
                  ? 'bg-orange-500 border-orange-500'
                  : 'bg-neutral-800 border-neutral-700'
              }`}
            >
              <Text
                className={`text-sm ${selected ? 'text-white' : 'text-neutral-300'}`}
              >
                {beepType}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="border-t border-neutral-800 pt-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white text-sm font-semibold">Voice Cues</Text>
          <Pressable onPress={addVoiceCue} hitSlop={8}>
            <Text className="text-orange-400 text-sm font-medium">+ Add Cue</Text>
          </Pressable>
        </View>

        {segment.voiceCues.length === 0 ? (
          <Text className="text-neutral-500 text-sm">No voice cues yet.</Text>
        ) : (
          segment.voiceCues.map((cue, index) => (
            <View
              key={`${segment.id}-cue-${index}`}
              className="bg-neutral-800 rounded-lg p-3 mb-2 border border-neutral-700"
            >
              <TextInput
                className="bg-neutral-900 text-white rounded-lg px-3 py-2 mb-2 border border-neutral-700"
                placeholder='e.g. "10 seconds left, push!"'
                placeholderTextColor="#737373"
                value={cue.text}
                onChangeText={(text) => updateVoiceCue(index, { text })}
              />
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Text className="text-neutral-400 text-xs mb-1">
                    Trigger at (sec remaining)
                  </Text>
                  <TextInput
                    className="bg-neutral-900 text-white rounded-lg px-3 py-2 border border-neutral-700"
                    keyboardType="number-pad"
                    value={String(cue.triggerSeconds)}
                    onChangeText={(value) =>
                      updateVoiceCue(index, {
                        triggerSeconds: parseSeconds(value),
                      })
                    }
                  />
                </View>
                <Pressable
                  onPress={() => removeVoiceCue(index)}
                  className="mt-4 px-2 py-2"
                  hitSlop={8}
                >
                  <Text className="text-red-400 text-sm">Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
