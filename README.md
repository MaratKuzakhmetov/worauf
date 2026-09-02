# worauf

Which preposition goes with which German verb, adjective or noun — and in which case.

`warten auf` + Akkusativ. `bestehen auf` + Dativ. Same preposition, different case, and no rule
derives it: German prepositional objects lexicalise their case, so the *wo / wohin* rule you were
taught for places does not help you here. This is a reference and a trainer for exactly that.

Interface in English and Russian. **Status:** design and planning. No code yet — see [`PLAN.md`](PLAN.md).

## What makes it different

- The unit of data is the **pattern**, not the word — because `sich freuen auf` (looking forward to)
  and `sich freuen über` (glad about something that happened) are two different verbs that happen to
  share a stem.
- **Case is asked as its own question.** Existing tools print `warten auf + Akk` as a string and drill
  the preposition, letting the case leak out of an example sentence. Nothing drills the case itself.
- Browse in both directions: pick a word to see its prepositions, or pick a preposition to see its words.

## Documentation

| Document | What's in it |
|---|---|
| [`PLAN.md`](PLAN.md) | Phases, ownership, decisions that are not re-opened |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Schema, authoring format, data invariants |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design language, tokens, screen states |
| [`docs/research/DATA_SOURCES.md`](docs/research/DATA_SOURCES.md) | Open sources, coverage, licensing |
| [`docs/research/PRIOR_ART.md`](docs/research/PRIOR_ART.md) | Competing tools, learner pain points |
| [`docs/research/STACK.md`](docs/research/STACK.md) | Stack evaluation and locked decisions |
| [`docs/adr/`](docs/adr/) | Architecture decision records |

## Licence

Application code: MIT. Dataset: CC BY-SA 4.0, inherited from Wiktionary. See `ATTRIBUTION.md`
(added with the first imported data).
