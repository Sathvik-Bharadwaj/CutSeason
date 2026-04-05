"use client";

type SetInputRowProps = {
  setNumber: number;
  reps: number;
  weight: number;
  canRemove: boolean;
  onRepsChange: (value: number) => void;
  onWeightChange: (value: number) => void;
  onRemove: () => void;
};

function toNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

export function SetInputRow({
  setNumber,
  reps,
  weight,
  canRemove,
  onRepsChange,
  onWeightChange,
  onRemove,
}: SetInputRowProps) {
  return (
    <div className="grid grid-cols-[64px_1fr_1fr_auto] items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 sm:gap-3">
      <div className="text-center text-xs font-semibold tracking-wide text-zinc-400">SET {setNumber}</div>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Reps
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={reps}
          onChange={(event) => onRepsChange(toNumber(event.target.value))}
          className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-400"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Weight
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={weight}
          onChange={(event) => onWeightChange(toNumber(event.target.value))}
          className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-400"
        />
      </label>

      <button
        type="button"
        disabled={!canRemove}
        onClick={onRemove}
        className="h-9 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Remove
      </button>
    </div>
  );
}
