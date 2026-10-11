import { Trash2 } from "lucide-react";

export function StudioRemove({
  title,
  noun,
  disabled,
  confirmed,
  onConfirm,
  onCancel,
  onRemove,
}: {
  title: string;
  noun: "book" | "word" | "lesson";
  disabled: boolean;
  confirmed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <button
        className="icon-button"
        aria-label={`Remove ${title}`}
        disabled={disabled}
        onClick={onConfirm}
      >
        <Trash2 size={15} />
      </button>
      {confirmed && (
        <div className="studio-delete">
          <p>
            Remove this {noun} from the draft?{" "}
            {noun === "book" && "Media files will stay on the server."}
          </p>
          <button className="button secondary" onClick={onCancel}>
            Keep {noun}
          </button>
          <button
            className="button primary"
            disabled={disabled}
            onClick={onRemove}
          >
            Remove {noun}
          </button>
        </div>
      )}
    </>
  );
}
