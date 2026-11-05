# Petits Pas

A tracking app for two parents following a four-month specialist plan for their child, built around three goals: daily spontaneous communication, daily attention, and new games.

## Language

### Program

**Program**:
The four-month period, with a start and an end date, during which the three goals are pursued.
_Avoid_: Plan (that is the specialists' document), challenge

**Goal**:
One of the three measured aims of the Program: communication, attention, new games.
_Avoid_: Objective, KPI

**Communication**:
Any spontaneous act by which the child expresses something: a sign, pointing, or a spoken word. The umbrella term for the first Goal.
_Avoid_: Sign (only one kind of Communication)

**Target**:
The number a Goal is judged against (10 communications a day, 1 attention session a day, 3 new games in total). It can change during the Program; a past day is judged against the Target in force on that date.
_Avoid_: Quota, threshold (reserved for Mastery)

**Day**:
A local calendar day, midnight to midnight, in the parents' timezone.

**Household**:
The two parents and the one child they log for.
_Avoid_: Family, account

### Communication

**Communication type**:
One kind of communicative act the specialists count, shown as a tile (Encore, Fini, Fâché, Donner, Aider, Attendre, Manger, Pointer, Mot).
_Avoid_: Sign, category, button

**Communication event**:
One logged occurrence of a Communication type at a moment in time, optionally with a note.
_Avoid_: Tap, entry, log

**Sequence**:
One back-and-forth around a single act; repeats of the same act inside one Sequence are logged once, by the parent's judgement. So the same act repeated within one exchange is one event, not two (to confirm with the specialists).
_Avoid_: Attempt, burst

**Spontaneous**:
Initiated by the child without a prompt. Only spontaneous acts are logged as Communication events.
_Avoid_: Unprompted

**Counted**:
A Communication event that contributes to the daily total against the Target. A logged event is not necessarily Counted (a spoken word is not, unless the parent says so).
_Avoid_: Valid, scored

**Daily note**:
One free-text note attached to a Day to explain its numbers (bad night, illness, change).
_Avoid_: Journal, comment

**Mastery**:
How solid a Communication type is, derived from how regularly it is logged: grey (not seen recently), yellow (emerging), green (mastered). It measures frequency, never the quality of the act. Mot has no Mastery, since each event is a different word.
_Avoid_: Level, score, progress

### Attention

**Attention session**:
A stretch of engagement with one Activity, timed or logged after the fact, adult-led allowed. It meets the Goal only at 3 minutes or more. A Game Attempt that lasts that long is also an Attention session.
_Avoid_: Game session, play time

**Activity**:
Something the child can engage with during an Attention session (blocks, a book, bubbles).
_Avoid_: Exercise, task

### Games

**Game**:
Something to play together that is kept in the library, tried or not yet tried.
_Avoid_: Toy, exercise

**Attempt**:
One try of a Game, with the child's reaction (liked, neutral, refused), an optional duration and an optional note. An Attempt lasting 3 minutes or more counts as an Attention session, without being logged twice.
_Avoid_: Play

**New game**:
A Game the parent declared she had never seen before, and whose first Attempt falls within the Program dates. Only New games count toward the Goal.
_Avoid_: Fresh game, unlocked game
