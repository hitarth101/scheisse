// Language Transfer "Complete German": track lengths in seconds, measured from the published files
// (app/public/audio/NN.mp3, mono 64 kbps, re-encoded by tools/encode-lectures.sh).
export const TRACK_SECONDS: readonly number[] = [445.03, 320.10, 437.25, 356.33, 372.21, 466.42, 466.54, 357.91, 585.04, 344.76, 420.14, 424.68, 488.85, 492.58, 583.84, 376.14, 518.52, 462.71, 412.93, 426.55, 370.70, 288.12, 495.65, 470.44, 595.82, 457.75, 360.22, 380.66, 379.30, 535.26, 540.69, 481.09, 351.84, 311.66, 474.75, 554.26, 366.65, 578.44, 809.19, 474.43, 538.37, 478.30, 462.88, 475.09, 639.26, 567.03, 701.57, 522.34, 463.76, 1112.04];

export const TRACK_COUNT = TRACK_SECONDS.length;

export function trackSeconds(track: number): number {
  return TRACK_SECONDS[track - 1] ?? 0;
}

export function audioUrl(track: number): string {
  return `${import.meta.env.BASE_URL}audio/${String(track).padStart(2, '0')}.mp3`;
}

export const TOTAL_SECONDS = TRACK_SECONDS.reduce((a, b) => a + b, 0);
