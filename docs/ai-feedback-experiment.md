# Adult AI feedback experiment: cloud transcription (results)

**Status (2026-11-04):** adult lab only (`lab/`, never in the production build). The published app and the children’s corner are unchanged and send nothing anywhere. Prepared sentences only; no language model (DeepSeek is a later step). Plan and provider research: [ai-feedback-plan.md](ai-feedback-plan.md).

> **Ground truth is partly provisional.** “What was said” is the recording script plus the one correction already confirmed by the reader’s listening (the dropped “and” in *Normal reading*, see [ai-feasibility.md](ai-feasibility.md)). The moments listed under [Still to confirm by listening](#still-to-confirm-by-listening) may move counts between “system error” and “real difference”. Nothing below was confirmed by ear unless it says so.

## What was run
- **Recordings:** the six existing test recordings (one adult reader, phone, 8 Oct; 34.8–65.9 s each, 5.3 min in all), converted to 16 kHz mono WAV like the app’s recorder. Not in the repository.
- **Services**, each sent only the audio (never the passage, so it can’t pull the transcript towards the text):
  - **Deepgram Nova-3**: `filler_words=true`, no smart formatting, no punctuation, `mip_opt_out=true`.
  - **AssemblyAI Universal-3.5 Pro** and **Universal-2**: `disfluencies=true`, `format_text=false`, `punctuate=false`.
- **Analysis**, all local and deterministic (`lab/analysis.ts`, `lab/feedback.ts`):
  - word alignment against the passage;
  - silences measured from the audio, with a silence split by a click shorter than 0.25 s joined into one;
  - pace by sentence from word timings, leaving measured silences out so a pause isn’t counted as slow reading.
- **Feedback:** prepared sentences following the copy rules in `src/lib/sample-feedback.ts`. Names and titles (“Mrs”, “Okafor”, “Willow Lane”) are not reported, because every service misheard them.
- **Code:** run with `node lab/cloud/run.ts --upload` (`lab/cloud/`). Keys stay in the git-ignored `.env.local` and only this local Node process reads them.
  - The converted audio, raw provider responses and the full local report are written to the git-ignored `lab/.cloud-results/`.
  - A scan of the project after the run found no key value in any file other than `.env.local`.

## Results
**System errors** are recognition mistakes: a transcript that differs from what was said. They are not reading mistakes. “Not names” excludes names and titles, which the feedback no longer reports.

| | Deepgram Nova-3 | AssemblyAI Universal-3.5 Pro | AssemblyAI Universal-2 |
|---|---|---|---|
| **Normal reading:** system errors that would reach feedback (not names) | 4 (“like” for “liked”, “fling”, “he” for “it”, “he” for “they”) | **0** | 7 (incl. an invented “um”) |
| …and the confirmed real omission (“and”, 0:42) | found | found | found |
| **Repetitions kept** (“a small brass” restart; “Nobody ever” restart) | both | both | **dropped the first “a small brass”**: the restart was silently removed |
| “Some said **said** an hour” (scripted) | all three heard “some said an hour… some said an hour”, a whole-phrase restart, not a doubled “said”. To confirm by listening | | |
| **Omission, addition, substitutions** (“low” left out, “very” added, “village”, “two”) | 4 of 4 | 4 of 4 | 4 of 4 |
| **Invented words:** “low” or “three” restored? Words in the 11 s of silence/noise? | none | none | none |
| **Pause** (one 5.7 s silence between “of” and “light”, 0:36.6–0:42.3, measured from the audio) | “light” within 0.1 s; “of” ends **0.56 s late**, inside the silence | “of” and “light” both within 0.1 s | both within 0.1 s |
| **Pace change** after “Some said an hour” | found (145 → 211 words/min) | found (148 → 215) | found (146 → 211) |
| False pace changes in the other five recordings | none | none | none |
| All system errors, six recordings (not names) | 56 | **12** | 38 |
| List price, pre-recorded | $0.0043/min | $0.0035/min | $0.0025/min |
| ≈ per 10-minute reading session | $0.043 | **$0.035** | $0.025 |

“All system errors” is counted against the provisional ground truth, using the full local report. Several of Universal-3.5 Pro’s 12 are moments where all three services agree, so they may turn out to be real reading differences once checked.

**Before the fixes above,** the same feedback would have given false pace changes in two recordings: a long pause was counted as slow reading. It would also have filled most items with names (“Mrs” heard as “miss”, “Okafor” as “o’carroll”) and shown one word in its spelling-neutral form (“hor” for “hour”). These were corrected in the lab code and the results re-analysed from the saved responses, without uploading again.

**Word confidence did not separate errors from real differences.** For example, “missus” scored 0.96 and “said” for “swore” scored 1.00, so confidence is used only to mark very unclear words (< 0.5) as “couldn’t assess”.

## Sample feedback (prepared sentences, AssemblyAI Universal-3.5 Pro)
At most four items per reading, in time order. There is one optional thing to try, for a new passage, never a reread.

**Normal reading**
- *Difference from the text* · “out early and the next” (0:41) — “and” wasn’t heard here.
- Try next: On your next passage, you could try a quick silent skim first and see whether you like reading that way.

**Pause recording**
- *Difference from the text* · Text: “hour others swore it burned” · Heard “said” for “swore” (0:27) — The word heard here was different from the one on the page. Pronunciation and accent aren’t compared — only which word was read. *(to confirm by listening)*
- *Moment to review — not a mistake* · “of … light” (0:36) — There was a pause of about 5.7 seconds inside this phrase. Pauses can be perfectly natural — this is just a moment you might like to listen back to.
- *Difference from the text* · “out early and the next” (0:55) — “and” wasn’t heard here. *(to confirm)*

**Pace recording** (one of its items)
- *Moment to review — not a mistake* · From “Some said an hour …” (0:29) — From here the reading was quicker than before — about 215 words a minute, compared with about 148. A pace change isn’t automatically a problem; it’s simply worth a listen.

**Silence/noise recording** (two sentences read)
- *Couldn’t assess confidently* · From “Children liked to guess …” — The recording ends here, so the rest of the passage (76 words) wasn’t checked.

**A clean reading** (from the tests) gets only: *Nothing found in the areas checked* — “Nice one for making time to read. Nothing stood out in the areas checked.”

## Recommendation
1. **Accuracy:** **AssemblyAI Universal-3.5 Pro** was clearly the most accurate:
   - no false word flags on the normal reading;
   - kept every repetition and invented nothing;
   - the most accurate word timings at the pause;
   - also the cheaper of the two strong options.
2. **Not Universal-2:** it silently dropped a restarted phrase and added fillers (“um”) that the other two didn’t hear, so it is not suitable.
3. **Deepgram Nova-3:** acceptable on the scripted checks but noisier, with nearly five times the system errors of Universal-3.5 Pro (56 against 12).
4. **Privacy decides the provider:**
   - **AssemblyAI’s free account can’t opt out of model training.** Only a paid plan can switch it off, and the opt-out isn’t retroactive. These six recordings were uploaded with the owner’s explicit agreement on that basis.
   - **Before any further real recordings go to AssemblyAI,** the account would need a paid plan with “Opt out of model improvement” on and a short retention period (TTL). How a paid plan is billed was not checked, and no paid top-up was made.
   - **Deepgram’s opt-out works on the free credit,** so it remains the privacy-safe choice if a paid AssemblyAI plan isn’t wanted.
5. **Nothing user-facing yet.** The pass bar from the plan is met for Universal-3.5 Pro on scripted changes, repetitions, invented words, pause timing and pace, but on one reader and one passage only. Real feedback would also need:
   - the listening confirmations below;
   - more readers, microphones and passages;
   - the copy reviewed in the app, not just this lab.
   - **The children’s corner stays out of scope.**

## Credit used
Billed audio is what each service reported processing. Each recording was transcribed once per model.

| Service | Audio | List price | Free credit |
|---|---|---|---|
| Deepgram Nova-3 | 316 s (5.27 min) | ≈ $0.023 (opt-out surcharge, if any, unknown) | $200 |
| AssemblyAI Universal-3.5 Pro | 319 s | ≈ $0.019 | $50 shared |
| AssemblyAI Universal-2 | 319 s + 32 s of computer-voice test audio (debugging) | ≈ $0.015 | |
| **Total** | | **≈ $0.056** | |

- **Failed attempts:** three AssemblyAI attempts (two on recordings, one on the computer-voice file) failed before transcribing and returned no audio duration, so they are not expected to be billed.
- **How the credit figure was reached:** these are list-price estimates. The Deepgram key deliberately has no usage permission, so the dashboards are the authority.
- **Payment:** no card was added and no top-up was made.

## What was retained, and where
- **Deepgram:** every request carried `mip_opt_out=true`. Its documentation says opted-out data is “retained only for the duration necessary to process the request”.
- **AssemblyAI:**
  - **Transcripts:** each was deleted through the API once both models had finished. A deletion also removes the uploaded audio, which is why the two models share one upload.
  - **Accidental duplicate uploads:** a first attempt deleted too early, so two recordings (*Normal reading* and *Repetitions*) were uploaded twice. The two failed transcripts left from those attempts were found and deleted.
  - **Current state:** a listing of the account shows all 17 transcripts deleted.
  - **What may remain:** AssemblyAI keeps request metadata, and files may already have been used for model improvement under the free plan’s terms.
- **On this computer:** the raw responses (with word timings) and the converted WAVs are in `lab/.cloud-results/`, which is git-ignored. Delete that folder when the experiment is finished.

## Still to confirm by listening
| Recording | Time | Words | Question |
|---|---|---|---|
| Pause | 0:35–0:43 | “the warm circle of … light it made on the path” | Was this one long pause (“of” ends 0:36.6, “light” starts 0:42.3)? There is a brief sound at **0:39.3** that splits the silence into 2.7 s + 3.0 s: was it a breath or another sound? (A separate 1.1 s silence at 0:45.7–0:46.7, “and the way … strangers”, is ordinary.) |
| Repetitions | 0:23–0:27 | “Some said an hour … some said an hour” | Did you restart the whole phrase, or say “said said”? |
| Repetitions | 0:08 | “set it on **the** low stone wall” | “the” or “a”? (all three heard “a”) |
| Silence/noise | 0:18 | the same phrase | “the” or “a”? (all three heard “a”) |
| Changes | 0:31 | “light **it** made” | “it” or “he”? (all three heard “he”) |
| Changes, Pause | 0:41, 0:55 | “went out early, **and** the next day” | Was “and” read? (all three say not) |
| Pause | 0:27 | “others **swore** it burned” | “swore” or “said”? (all three heard “said”) |
| Pace | 0:19, 0:30 | “dark **could** find”, “an hour, **and** others” | “could” or “can”? Was an extra “and” read? (all three agree on “can” and the extra “and”) |
| Silence/noise | 0:00–0:11 | no speech expected | Was anything said before “Every evening” at about 0:11? (no service heard anything) |

## Limits
One reader, one phone, one passage, one take per case, and a partly provisional ground truth. These results show the pipeline can work; they say nothing about other voices, accents, children, microphones or rooms, and they don’t establish why any recognition error happened.
