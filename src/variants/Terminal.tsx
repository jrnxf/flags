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
  const { round, streak, best, accuracy, total } = quiz

  return (
    <div
      className="min-h-dvh bg-[oklch(0.155_0.008_70)] font-mono text-[oklch(0.86_0.02_80)]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, oklch(1 0 0 / 0.015) 0 1px, transparent 1px 3px)",
      }}
    >
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-5 py-[max(1.5rem,env(safe-area-inset-top))]">
        <section className="border border-white/12 bg-[oklch(0.175_0.008_70)] lowercase">
          {/* Title bar */}
          <div className="flex items-center justify-between border-b border-white/12 px-3 py-2 text-xs">
            <span style={{ color: AMBER }}>vex</span>
          </div>

          {/* Status line — fixed mono columns of live data */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-white/12 px-3 py-2 text-xs tabular-nums">
            <Field label="streak" value={pad2(streak)} accent />
            <Field label="best" value={pad2(best)} />
            <Field label="acc" value={`${accuracy}%`} />
            <Field label="n" value={pad2(total)} />
          </div>

          <div className="p-4 sm:p-5">
            {/* Flag plate */}
            <div className="relative border border-white/15 p-3">
              <CornerBracket at="tl" />
              <CornerBracket at="tr" />
              <CornerBracket at="bl" />
              <CornerBracket at="br" />
              <img
                key={round.id}
                src={flagUrl(round.answer.code)}
                alt="Identify the country this flag belongs to"
                className="mx-auto aspect-[3/2] w-full max-w-sm animate-in object-cover grayscale-0 duration-150 ease-out fade-in"
              />
            </div>

            {/* Keyed by round so the typed query and focus reset each round. */}
            <AnswerPanel key={round.id} quiz={quiz} />
          </div>
        </section>
      </div>
    </div>
  )
}

// The type-to-answer interaction: a prompt input plus the candidate list. You
// type the nation's name; options whose name no longer shares your prefix dim
// to disabled, and the answer auto-submits the moment exactly one candidate
// remains.
function AnswerPanel({ quiz }: { quiz: Quiz }) {
  const { round, picked, answered } = quiz
  const [typed, setTyped] = React.useState("")

  const query = typed.trim().toLowerCase()
  const matchesQuery = (name: string) => name.toLowerCase().startsWith(query)
  const matches = query
    ? round.options.filter((o) => matchesQuery(o.name))
    : round.options
  const soleCode =
    !answered && query.length >= 3 && matches.length === 1
      ? matches[0].code
      : null

  // Auto-accept once at least three typed characters narrow the query to a
  // single candidate — no Enter needed. pick() ignores extra calls, and
  // soleCode drops to null once answered, so this fires exactly once per round.
  React.useEffect(() => {
    if (soleCode) quiz.pick(soleCode)
  }, [soleCode, quiz])

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
              <span className="truncate">{option.name}</span>
            </button>
          )
        })}
      </div>

      {/* Prompt: a bare terminal line — just the caret marker and the cursor. */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span style={{ color: AMBER }} aria-hidden>
          &gt;
        </span>
        <input
          autoFocus
          disabled={answered}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
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
