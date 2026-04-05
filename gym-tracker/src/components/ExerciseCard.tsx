"use client";

type ExerciseCardProps = {
  name: string;
  selected: boolean;
  onToggle: () => void;
};

export function ExerciseCard({ name, selected, onToggle }: ExerciseCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
        selected
          ? "border-white bg-zinc-900"
          : "border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900/50"
      }`}
    >
      <span className="text-sm font-medium tracking-wide text-zinc-100">{name}</span>
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
          selected
            ? "border-white bg-white text-black"
            : "border-zinc-600 text-zinc-500 group-hover:border-zinc-400 group-hover:text-zinc-300"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}
