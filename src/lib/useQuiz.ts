import * as React from "react"

import { countries, flagUrl, type Country } from "@/lib/countries"

export const OPTION_COUNT = 4

// How many upcoming flags to keep warmed in the browser cache so advancing a
// round never waits on a fetch.
const PRELOAD_AHEAD = 3

// Total flags in one full pass. Finishing all of them completes a game.
export const DECK_SIZE = countries.length

// Auto-advance timings. A wrong answer lingers longer so the correct flag can
// register before the next round loads.
const CORRECT_ADVANCE = 280
const WRONG_ADVANCE = 700

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export type Round = {
  id: number
  answer: Country
  options: Country[]
}

function makeRound(answer: Country, id: number): Round {
  const distractors = shuffle(
    countries.filter((c) => c.code !== answer.code)
  ).slice(0, OPTION_COUNT - 1)
  return { id, answer, options: shuffle([answer, ...distractors]) }
}

// One game is a single shuffled pass through every country. Cards are drawn
// from the end of `deck`; the deck is only ever rebuilt by starting a fresh
// game, so no flag can repeat until all of them have been shown. `seen` tracks
// how far into the pass we are (current flag included), so once it reaches
// DECK_SIZE the player has been through the whole set.
type Game = {
  deck: Country[]
  round: Round
  seen: number
  nextId: number
}

// This shuffle-bag / deck approach (a.k.a. bag randomizer) is the standard fix
// for "random with no repeats until exhausted" — the same trick Tetris uses for
// its 7-piece bag. Kept pure so React StrictMode's double-invoked initializer
// stays correct.
function startGame(): Game {
  const deck = shuffle(countries)
  return { deck, round: makeRound(deck.pop()!, 0), seen: 1, nextId: 1 }
}

function drawNext(game: Game): Game {
  const deck = game.deck.slice()
  const answer = deck.pop()!
  return {
    deck,
    round: makeRound(answer, game.nextId),
    seen: game.seen + 1,
    nextId: game.nextId + 1,
  }
}

export type Quiz = {
  round: Round
  picked: string | null
  answered: boolean
  isCorrect: boolean
  streak: number
  best: number
  total: number
  correct: number
  accuracy: number
  /** Flags shown in the current game so far (current flag included). */
  seen: number
  /** Flags in one full game — reach this and you've been through them all. */
  deckSize: number
  /** True once every flag in the deck has been answered. */
  complete: boolean
  /** True when the game was completed without a single miss. */
  perfect: boolean
  reduceMotion: boolean
  /** Register an answer. Extra picks after the first are ignored. */
  pick: (code: string) => void
  /** Skip to the next round immediately (also cancels the pending advance). */
  next: () => void
  /** Reshuffle a fresh deck and start over. */
  restart: () => void
}

// All quiz state and scoring. Presentational variants consume this and add
// their own layout, type, and motion on top.
export function useQuiz(): Quiz {
  const [game, setGame] = React.useState<Game>(startGame)
  const [picked, setPicked] = React.useState<string | null>(null)
  const [complete, setComplete] = React.useState(false)
  const [perfect, setPerfect] = React.useState(false)
  const [streak, setStreak] = React.useState(0)
  const [best, setBest] = React.useState(0)
  const [total, setTotal] = React.useState(0)
  const [correct, setCorrect] = React.useState(0)
  const [reduceMotion] = React.useState(prefersReducedMotion)

  const advanceTimer = React.useRef<number | undefined>(undefined)

  const round = game.round
  const answered = picked !== null
  const isCorrect = picked === round.answer.code

  const next = React.useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setGame(drawNext)
    setPicked(null)
  }, [])

  const restart = React.useCallback(() => {
    window.clearTimeout(advanceTimer.current)
    setGame(startGame())
    setPicked(null)
    setComplete(false)
    setPerfect(false)
    setStreak(0)
  }, [])

  const pick = React.useCallback(
    (code: string) => {
      // Ignore extra picks once this round is answered. Guarding here (rather
      // than inside a setPicked updater) keeps the scoring side effects below
      // out of a state updater, which StrictMode runs twice — that double-ran
      // them and awarded double points per answer.
      if (picked !== null) return
      setPicked(code)
      setTotal((t) => t + 1)

      const gotIt = code === round.answer.code
      // Streak after this answer, needed to judge a flawless finish below.
      let nextStreak = 0
      if (gotIt) {
        setCorrect((c) => c + 1)
        nextStreak = streak + 1
        setStreak(nextStreak)
        setBest((b) => Math.max(b, nextStreak))
      } else {
        setStreak(0)
      }

      // The last flag of the deck ends the game instead of advancing.
      const finished = game.seen >= DECK_SIZE
      advanceTimer.current = window.setTimeout(
        finished
          ? () => {
              setPerfect(nextStreak === DECK_SIZE)
              setComplete(true)
            }
          : next,
        gotIt ? CORRECT_ADVANCE : WRONG_ADVANCE
      )
    },
    [picked, round, streak, game.seen, next]
  )

  React.useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  // Warm the next few flags. Only the answer's flag is rendered (options are
  // text), and answers are drawn from the end of the deck, so preloading its
  // last entries keeps the images decoded and cached before their round shows.
  // Fetching into a detached Image populates the cache; the render then hits it
  // instantly. Runs on mount and after every draw, as the deck shrinks.
  React.useEffect(() => {
    game.deck.slice(-PRELOAD_AHEAD).forEach((country) => {
      const img = new Image()
      img.src = flagUrl(country.code)
    })
  }, [game.deck])

  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100)

  return {
    round,
    picked,
    answered,
    isCorrect,
    streak,
    best,
    total,
    correct,
    accuracy,
    seen: game.seen,
    deckSize: DECK_SIZE,
    complete,
    perfect,
    reduceMotion,
    pick,
    next,
    restart,
  }
}
