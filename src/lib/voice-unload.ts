const pending = new Set<object>();

function preventUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = "";
}

export function protectVoiceTake(owner: object, unsaved: boolean) {
  if (typeof window === "undefined") return;
  if (unsaved) {
    if (!pending.size) window.addEventListener("beforeunload", preventUnload);
    pending.add(owner);
  } else {
    pending.delete(owner);
    if (!pending.size)
      window.removeEventListener("beforeunload", preventUnload);
  }
}
