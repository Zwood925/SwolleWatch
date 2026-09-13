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
  targetHrZone: string;
  targetCadence: string;
  notes: string;
}

export interface Workout {
  id: string;
  name: string;
  segments: Segment[];
}

export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface ActiveSession {
  workoutId: string;
  currentSegmentIndex: number;
  segmentRemainingSeconds: number;
  status: SessionStatus;
}
