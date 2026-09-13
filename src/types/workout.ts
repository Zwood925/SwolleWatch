export interface VoiceCue {
  text: string;
  triggerSeconds: number;
}

export interface Segment {
  id: string;
  name: string;
  type: 'Work' | 'Rest';
  duration: number;
  countIn: number;
  beepType: 'Tick' | 'RoundEnd' | 'RestEnd' | 'None';
  voiceCues: VoiceCue[];
}

export interface Workout {
  id: string;
  name: string;
  segments: Segment[];
}
