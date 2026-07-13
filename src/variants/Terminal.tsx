import * as React from "react"

import { flagUrl } from "@/lib/countries"
import type { Quiz } from "@/lib/useQuiz"
import { cn } from "@/lib/utils"

const AMBER = "oklch(0.82 0.14 78)"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function CornerBracket({ at }: { at: "tl" | "tr" | "bl" | "br" }) {
  const map = {
    tl: { pos: "left-1 top-1", ch: "┌" },
    tr: { pos: "right-1 top-1", ch: "┐" },
    bl: { pos: "bottom-1 left-1", ch: "└" },
    br: { pos: "bottom-1 right-1", ch: "┘" },
  }[at]
  return (
    <span
      aria-hidden
      className={cn("absolute font-mono text-sm leading-none", map.pos)}
      style={{ color: AMBER }}
    >
      {map.ch}
    </span>
  )
}

export function Terminal({ quiz }: { quiz: Quiz }) {
  const { round, streak, best, accuracy, total, seen, deckSize, complete } =
    quiz

  return (
    <div
      className="min-h-dvh bg-[oklch(0.155_0.008_70)] font-mono text-[oklch(0.86_0.02_80)]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, oklch(1 0 0 / 0.015) 0 1px, transparent 1px 3px)",
      }}
    >
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-[max(1.5rem,env(safe-area-inset-top))] sm:px-5">
        <section className="border border-white/12 bg-[oklch(0.175_0.008_70)] lowercase">
          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-white/12 px-3 py-2 text-xs">
            <span style={{ color: AMBER }}>flags</span>
          </div>

          {/* Status line — fixed mono columns of live data */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-white/12 px-3 py-2 text-xs tabular-nums sm:gap-x-5">
            <Field label="streak" value={pad2(streak)} accent />
            <Field label="best" value={pad2(best)} />
            <Field label="acc" value={`${accuracy}%`} />
            <Field label="seen" value={`${pad2(seen)}/${deckSize}`} />
            <Field label="n" value={pad2(total)} />
          </div>

          <div className="p-4 sm:p-5">
            {complete ? (
              <Complete quiz={quiz} />
            ) : (
              <>
                {/* Flag plate. The box holds a fixed 3:2 aspect so its height
                    never shifts between rounds; each flag is object-contain'd
                    inside it, so flags of any ratio (square Swiss, wide Qatar,
                    the Nepal pennant) show in full — letterboxed, never cropped. */}
                <div className="relative border border-white/15 p-3">
                  <CornerBracket at="tl" />
                  <CornerBracket at="tr" />
                  <CornerBracket at="bl" />
                  <CornerBracket at="br" />
                  <div className="mx-auto flex aspect-[3/2] w-full max-w-sm items-center justify-center">
                    <img
                      key={round.id}
                      src={flagUrl(round.answer.code)}
                      alt="Identify the country this flag belongs to"
                      className="max-h-full max-w-full animate-in object-contain duration-150 ease-out fade-in"
                    />
                  </div>
                </div>

                {/* Keyed by round so the typed query and focus reset each round. */}
                <AnswerPanel key={round.id} quiz={quiz} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// Shown once every flag in the deck has been answered. A flawless run — no
// misses across the whole set — is a win; anything else is a completed set.
function Complete({ quiz }: { quiz: Quiz }) {
  const { perfect, deckSize, best, accuracy, restart } = quiz
  return (
    <div className="animate-in fade-in duration-200">
      <div className="relative border border-white/15 p-6 text-center">
        <CornerBracket at="tl" />
        <CornerBracket at="tr" />
        <CornerBracket at="bl" />
        <CornerBracket at="br" />
        <div
          className="text-2xl font-medium tracking-wide"
          style={{ color: AMBER }}
        >
          {perfect ? "you win" : "set complete"}
        </div>
        <p className="mt-2 text-xs text-white/50">
          {perfect
            ? `perfect run — all ${deckSize} flags, no misses`
            : `you've been through all ${deckSize} flags`}
        </p>
        <div className="mt-4 flex justify-center gap-5 text-xs tabular-nums">
          <Field label="best" value={pad2(best)} accent />
          <Field label="acc" value={`${accuracy}%`} />
        </div>
      </div>

      <button
        autoFocus
        onClick={restart}
        className="mt-4 w-full border border-white/12 px-3 py-2.5 text-center font-mono text-sm lowercase transition-colors duration-100 not-disabled:hover:bg-[oklch(0.82_0.14_78)] not-disabled:hover:text-black"
      >
        play again
      </button>
    </div>
  )
}

// The type-to-answer interaction: a prompt input plus the candidate list. You
// type the nation's name; each option underlines the prefix you've matched so
// far, and options whose name no longer shares your prefix dim to disabled.
// Press Enter to submit — allowed the moment exactly one candidate still
// matches what you've typed.
function AnswerPanel({ quiz }: { quiz: Quiz }) {
  const { round, picked, answered } = quiz
  const [typed, setTyped] = React.useState("")

  const query = typed.trim().toLowerCase()
  const matchesQuery = (name: string) => name.toLowerCase().startsWith(query)
  const matches = query
    ? round.options.filter((o) => matchesQuery(o.name))
    : round.options
  const soleCode =
    !answered && query !== "" && matches.length === 1 ? matches[0].code : null

  return (
    <>
      {/* Candidate list — dims to disabled as your query excludes each */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {round.options.map((option) => {
          const isAnswer = option.code === round.answer.code
          const isPicked = option.code === picked
          const isSole = option.code === soleCode
          const matched = matchesQuery(option.name)
          const excluded = !answered && query !== "" && !matched
          const dimmed = answered && !isAnswer && !isPicked
          const marker = answered
            ? isAnswer
              ? "✓"
              : isPicked
                ? "✗"
                : " "
            : isSole
              ? "▶"
              : " "
          return (
            <button
              key={option.code}
              disabled={answered || excluded}
              onClick={() => quiz.pick(option.code)}
              className={cn(
                "flex items-center gap-2 border px-3 py-2.5 text-left font-mono text-sm lowercase transition-[background-color,border-color,color,opacity] duration-100",
                "border-white/12 not-disabled:hover:bg-[oklch(0.82_0.14_78)] not-disabled:hover:text-black",
                // The lone remaining candidate, flashed as it auto-submits.
                isSole && "border-[oklch(0.82_0.14_78)]/70",
                isAnswer &&
                answered &&
                "animate-correct-pop border-transparent bg-[oklch(0.78_0.15_150)] text-black",
                isPicked &&
                !isAnswer &&
                "animate-wrong-shake border-transparent bg-[oklch(0.68_0.19_25)] text-black",
                dimmed && "opacity-35",
                excluded && "opacity-25"
              )}
            >
              <span
                className="w-3 shrink-0 text-center"
                style={isSole ? { color: AMBER } : undefined}
              >
                {marker}
              </span>
              <span className="truncate">
                {!answered && query !== "" && matched ? (
                  <>
                    <span className="underline decoration-2 underline-offset-2">
                      {option.name.slice(0, query.length)}
                    </span>
                    {option.name.slice(query.length)}
                  </>
                ) : (
                  option.name
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Prompt: a bare terminal line — just the caret marker and the cursor.
          Hidden on touch devices (tablet and below), where you tap options. */}
      <div className="mt-3 hidden items-center gap-2 text-sm lg:flex">
        <span style={{ color: AMBER }} aria-hidden>
          &gt;
        </span>
        <input
          autoFocus
          disabled={answered}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            // Enter submits, but only once the query has narrowed to a single
            // candidate — hitting it any earlier is a no-op.
            if (e.key === "Enter" && soleCode) quiz.pick(soleCode)
          }}
          aria-label="Type the country name to answer"
          placeholder="type a nation to answer"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full bg-transparent text-[oklch(0.9_0.02_80)] lowercase outline-none placeholder:text-white/30 disabled:opacity-50"
          style={{ caretColor: AMBER }}
        />
      </div>
    </>
  )
}

function Field({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <span>
      <span className="text-white/35">{label}=</span>
      <span
        style={accent ? { color: AMBER } : undefined}
        className="font-medium"
      >
        {value}
      </span>
    </span>
  )
}
