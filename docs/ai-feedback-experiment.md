# Adult AI feedback experiment: cloud transcription (results)

**Status (2026-11-04):** adult lab only (`lab/`, never in the production build). The published app and the children’s corner are unchanged and send nothing anywhere. Prepared sentences only; no language model (DeepSeek is a later step). Plan and provider research: [ai-feedback-plan.md](ai-feedback-plan.md).

> **Ground truth: confirmed by the reader’s listening (2026-11-04, second check).** “What was said” is the recording script with the corrections the reader confirmed by ear on a second listen, which replaces an earlier check the same day (see [What was checked by ear](#what-was-checked-by-ear)). The corrections are:
> - “and” not read in “went out early, and the next day” (*Normal reading*, *Changes* and *Pause*);
> - a whole-phrase restart “Some said an hour … some said an hour” instead of the scripted “said said” (*Repetitions*);
> - “a low stone wall” (*Repetitions* and *Silence/noise*);
> - “others said it burned” (*Pause*);
> - “can” for “could” (*Pace*).
>
> Agreement between providers is **not** treated as confirmation. Words outside the checked moments are assumed read as scripted.

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
- **Re-analysis after the listening check:** the counts below were recalculated with `node lab/cloud/run.ts` from the saved provider responses. Nothing was uploaded again and no further credit was used.

## Results
**System errors** are recognition mistakes: a transcript that differs from what was said. They are not reading mistakes. Two measures are shown separately:
- **Overall transcription accuracy:** every word, including names and titles (“Mrs”, “Okafor”, “Willow Lane”), compared with what was said (638 words over the six recordings).
- **False flags that could reach feedback:** the same comparison against the passage, leaving out names and titles, which the feedback never reports.

| | Deepgram Nova-3 | AssemblyAI Universal-3.5 Pro | AssemblyAI Universal-2 |
|---|---|---|---|
| **Overall transcription errors, names included** (word error rate) | 56 (8.8%) | **13 (2.0%)** | 44 (6.9%) |
| **False flags that could reach feedback, names excluded** | 47 | **3** | 29 |
| Normal reading: false flags (names excluded) | 4 (“like” for “liked”, “fling”, “he” for “it”, “he” for “they”) | **0** | 7 (incl. an invented “um”) |
| Real omission of “and” (*Normal*, *Changes*, *Pause*) | found in all three | found in all three | found in all three |
| Real substitutions the reader confirmed: “a” for “the”, “said” for “swore”, “can” for “could” | all found | all found | all found |
| **Restarted phrases** (“a small brass”, “Some said an hour”, “Nobody ever”) | all kept | all kept | **dropped the first “a small brass”** |
| Scripted omission, addition, substitutions (“low”, “very”, “village”, “two”) | 4 of 4 | 4 of 4 | 4 of 4 |
| **Invented words** | an extra “and” (*Pace*) | an extra “and” (*Pace*) | an extra “and” (*Pace*), plus fillers (“um”, “uh”) |
| Words in the 11 s of silence/noise | none | none | none |
| **Pause** (one 5.7 s silence between “of” and “light”, 0:36.6–0:42.3, measured from the audio) | “light” within 0.1 s; “of” ends **0.56 s late** | both within 0.1 s | both within 0.1 s |
| **Pace change** after “Some said an hour” | found (145 → 211 words/min) | found (148 → 215) | found (146 → 211) |
| False pace changes in the other five recordings | none | none | none |
| List price, pre-recorded | $0.0043/min | $0.0035/min | $0.0025/min |
| ≈ per 10-minute reading session | $0.043 | **$0.035** | $0.025 |

By recording (overall errors with names / false flags without names):

| Recording | Deepgram | Universal-3.5 Pro | Universal-2 |
|---|---|---|---|
| Normal | 7 / 4 | 3 / 0 | 9 / 7 |
| Repetitions | 12 / 10 | 2 / 0 | 7 / 2 |
| Changes | 9 / 7 | 3 / 1 | 7 / 5 |
| Pause | 7 / 5 | 1 / 0 | 5 / 4 |
| Pace | 10 / 8 | 3 / 2 | 9 / 8 |
| Silence/noise | 11 / 13 | 1 / 0 | 7 / 3 |
| **Total** | **56 / 47** | **13 / 3** | **44 / 29** |

Deepgram’s silence/noise count without names is higher than with them because its transcript lined up poorly with the unread rest of the passage, which produced extra flags. Universal-3.5 Pro’s remaining overall errors are all names and titles apart from its 3 false flags.

**Universal-3.5 Pro’s 3 remaining false flags** (names excluded):
- “he” for “it” in “light it made” (*Changes* 0:31). The reader confirmed “it”, and all three services heard “he”;
- an extra “and” after “an hour” (*Pace* 0:30). The reader confirmed none was read, and all three services added it;
- “to” heard twice in “liked to guess” (*Pace* 0:25). This moment was not checked by ear, so it is counted as a false flag only provisionally.

**How the counts moved:**
- **First count** (provisional, before any listening check): 56 / 12 / 38, names excluded (Deepgram / Universal-3.5 Pro / Universal-2).
- **First listening check:** 53 / 9 / 35 (Deepgram / Universal-3.5 Pro / Universal-2). The reader later found mistakes in their own first answers.
- **Second listening check:** turned the scripted “said said” into a whole-phrase restart, and “a” and “said” into real substitutions, so the services were right at those moments.

**Before the fixes above,** the same feedback would have given false pace changes in two recordings: a long pause was counted as slow reading. It would also have filled most items with names (“Mrs” heard as “miss”, “Okafor” as “o’carroll”) and shown one word in its spelling-neutral form (“hor” for “hour”). These were corrected in the lab code and the results re-analysed from the saved responses, without uploading again.

**Word confidence did not separate errors from real differences.** For example, “missus” scored 0.96 and the invented “and” in *Pace* scored 0.99, so confidence is used only to mark very unclear words (< 0.5) as “couldn’t assess”.

## Sample feedback (prepared sentences, AssemblyAI Universal-3.5 Pro)
At most four items per reading, in time order. There is one optional thing to try, for a new passage, never a reread.

**Normal reading**
- *Difference from the text* · “out early and the next” (0:41) — “and” wasn’t heard here.
- Try next: On your next passage, you could try a quick silent skim first and see whether you like reading that way.

✗ marks a system error that the reader would see.

**Pause recording**
- *Difference from the text* · Text: “hour others swore it burned” · Heard “said” for “swore” (0:27) — The word heard here was different from the one on the page. Pronunciation and accent aren’t compared — only which word was read.
- *Moment to review — not a mistake* · “of … light” (0:36) — There was a pause of about 5.7 seconds inside this phrase. Pauses can be perfectly natural — this is just a moment you might like to listen back to.
- *Difference from the text* · “out early and the next” (0:55) — “and” wasn’t heard here.

**Pace recording**
- *Difference from the text* · Text: “after dark could find the” · Heard “can” for “could” (0:19).
- ? *Difference from the text* · “garden Children liked to guess how” (0:25) — “to” was heard twice in a row here. *(not checked by ear)*
- *Moment to review — not a mistake* · From “Some said an hour …” (0:29) — From here the reading was quicker than before — about 215 words a minute, compared with about 148. A pace change isn’t automatically a problem; it’s simply worth a listen.
- ✗ *Difference from the text* · “said an hour others swore it” (0:30) — “and” was heard here, but it isn’t in the text.

**Repetitions recording** (all four are real)
- “Mrs Okafor carried a small brass” (0:02) — “a small brass” was heard twice in a row here.
- Heard “a” for “the” (0:08).
- “flame would last Some said an” (0:23) — “some said an hour” was heard twice in a row here.
- “burned until morning Nobody ever checked” (0:31) — “nobody ever” was heard twice in a row here.

**Changes recording:** the four items shown are “low” missing, “village”, “very” and ✗ “he” for “it” (0:31). The four-item limit then hides two real differences (“two” for “three”, and the missing “and”) as “2 more not shown”. So a system error took the place of a real one.

**Silence/noise recording** (two sentences read)
- *Couldn’t assess confidently* · From “Children liked to guess …” — The recording ends here, so the rest of the passage (76 words) wasn’t checked.

**A clean reading** (from the tests) gets only: *Nothing found in the areas checked* — “Nice one for making time to read. Nothing stood out in the areas checked.”

## Recommendation
The corrected check doesn’t change the recommendation, and it makes the accuracy case for Universal-3.5 Pro stronger. Nothing is ready for users yet.
1. **Accuracy:** **AssemblyAI Universal-3.5 Pro** is clearly the most accurate on both measures:
   - 13 errors overall (2.0%), almost all names, against 44 and 56;
   - 3 false flags that could reach feedback, against 29 and 47;
   - no false flags on the normal reading;
   - kept every restarted phrase;
   - the most accurate word timings at the pause;
   - also the cheaper of the two strong options.
2. **Still to solve:**
   - all three services added an “and” that wasn’t read and heard “he” for “it”;
   - no recording contains a single repeated word (the scripted “said said” was read as a phrase restart), so that kind of repetition is untested.
3. **Not Universal-2:** it silently dropped a restarted phrase and added fillers (“um”, “uh”) that weren’t said, so it is not suitable.
4. **Deepgram Nova-3:** finds the scripted changes but has about four times Universal-3.5 Pro’s overall errors and many times its false flags.
5. **Privacy decides the provider:**
   - **AssemblyAI’s free account can’t opt out of model training.** Only a paid plan can switch it off, and the opt-out isn’t retroactive. These six recordings were uploaded with the owner’s explicit agreement on that basis.
   - **Before any further real recordings go to AssemblyAI,** the account would need a paid plan with “Opt out of model improvement” on and a short retention period (TTL). How a paid plan is billed was not checked, and no paid top-up was made.
   - **Deepgram’s opt-out works on the free credit,** so it remains the privacy-safe choice if a paid AssemblyAI plan isn’t wanted.
6. **Nothing user-facing yet.** Before any real feedback, the experiment would also need:
   - more readers, microphones and passages;
   - a recording with single repeated words;
   - the feedback limit changed so a system error can’t push a real difference out of view;
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

## What was checked by ear
The reader listened to these moments twice on 2026-11-04. The second listen corrected the first: the reader made the first while tired. Only the second set of answers is used.

| Recording | Time | Question | First answer | **Second answer (used)** | What the services heard |
|---|---|---|---|---|---|
| Pause | 0:35–0:43 (the section, not an exact silence) | One deliberate pause? What was the brief sound at 0:39.3? | Intentional pause; sound possibly a breath (unsure) | not revisited, so the first answer stands | All three placed the silence between “of” and “light” |
| Repetitions | 0:23–0:27 | Whole-phrase restart or “said said”? | “said said” | **“Some said an hour … some said an hour”** | All three: the phrase restart |
| Repetitions, Silence/noise | 0:08, 0:18 | “the” or “a” low stone wall? | “the” | **“a”** | All three: “a” |
| Changes | 0:31 | “it” or “he” made? | “it” | **“it”** | All three: “he” |
| Changes, Pause | 0:41, 0:55 | Was “and” read? | not read | **not read** | All three: not heard |
| Pause | 0:27 | “swore” or “said”? | “swore” | **“said”** | All three: “said” |
| Pace | 0:19, 0:30 | “could” or “can”? An extra “and”? | “can”; no extra “and” | **“can”; no extra “and”** | All three: “can”, and all three added “and” |
| Silence/noise | 0:00–0:11 | Anything said before “Every evening”? | nothing | **nothing** | Nothing |

**Still not checked by ear:**
- what the brief sound at 0:39.3 was (the 5.7 s figure counts it as part of one pause);
- “to” heard twice in *Pace* at 0:25 (Universal-3.5 Pro only);
- where the *Silence/noise* reading ended. The reader’s answer at 0:18 shows the second sentence was read; the end point comes from the transcripts;
- every word outside the moments above, which is assumed read as scripted.

## Limits
One reader, one phone, one passage, one take per case, and a ground truth checked by ear only at the moments listed above. These results show the pipeline can work; they say nothing about other voices, accents, children, microphones or rooms, and they don’t establish why any recognition error happened.
