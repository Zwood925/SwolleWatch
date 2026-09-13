import { Audio } from 'expo-av';

let beepSound: Audio.Sound | null = null;
let audioReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioReady) {
    return;
  }

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioReady = true;
}

export async function playCountdownBeep(): Promise<void> {
  try {
    await ensureAudioMode();

    if (!beepSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/beep.wav'),
        { shouldPlay: true, volume: 0.6 }
      );
      beepSound = sound;
      return;
    }

    await beepSound.replayAsync();
  } catch {
    // Audio failures should never crash the workout timer.
  }
}

export async function unloadBeepSound(): Promise<void> {
  if (!beepSound) {
    return;
  }

  try {
    await beepSound.unloadAsync();
  } catch {
    // ignore unload errors
  } finally {
    beepSound = null;
  }
}
