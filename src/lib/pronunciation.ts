export async function localEnglishVoice(): Promise<
  SpeechSynthesisVoice | undefined
> {
  const find = () =>
    speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.startsWith("en") && voice.localService);
  const existing = find();
  if (existing) return existing;
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => finish(), 1500);
    function finish() {
      window.clearTimeout(timer);
      speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(find());
    }
    speechSynthesis.addEventListener("voiceschanged", finish);
  });
}
