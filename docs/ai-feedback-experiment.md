# Adult AI feedback experiment: cloud transcription (results)

**Status (2026-11-04):** these results led to optional AI feedback for adults with Universal-3.5 Pro, built into the main practice. Its Worker is deployed and connected; visitors see it once the owner publishes the app in Lovable ([setup](ai-feedback-setup.md), [how it works](architecture.md#optional-ai-feedback-for-adults-off-until-connected)). The children’s corner never uses it. Prepared sentences only; no language model (DeepSeek is a later step). Plan and provider research: [ai-feedback-plan.md](ai-feedback-plan.md).

> **Accuracy evidence is still limited to this sample:** six recordings of one passage by one adult reader on one phone. It says nothing yet about other voices, accents, microphones, rooms, passages or children.

> **Ground truth: confirmed by the reader’s listening (2026-11-04, second and final checks).** “What was said” is the recording script with the corrections the reader confirmed by ear on a second listen, which replaces an earlier check the same day, plus a final check of the last two open moments (see [What was checked by ear](#what-was-checked-by-ear)). The corrections are:
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
- **Code:** run with `node lab/cloud/run.ts --upload` (`lab/cloud/`). The analysis and feedback code has since moved into the app (`src/lib/reading-feedback/`), unchanged; the lab re-exports it. Keys stay in the git-ignored `.env.local` and only this local Node process reads them.
  - The converted audio, raw provider responses and the full local report are written to the git-ignored `lab/.cloud-results/`.
  - A scan of the project after the run found no key value in any file other than `.env.local`.
- **Re-analysis after the listening checks:** the counts below were recalculated with `node lab/cloud/run.ts` from the saved provider responses after each check. Nothing was uploaded again and no further credit was used. The final check (“to” said once; nothing after “garden”) matched the script, so it left every count unchanged and confirmed the two open system errors.

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

Universal-2’s extra “it” at 0:28.2 in *Silence/noise* is also a confirmed system error: the reader stopped after “garden” and said nothing more.

Deepgram’s silence/noise count without names is higher than with them because its transcript lined up poorly with the unread rest of the passage, which produced extra flags. Universal-3.5 Pro’s remaining overall errors are all names and titles apart from its 3 false flags.

**Universal-3.5 Pro’s 3 remaining false flags** (names excluded):
- “he” for “it” in “light it made” (*Changes* 0:31). The reader confirmed “it”, and all three services heard “he”;
- an extra “and” after “an hour” (*Pace* 0:30). The reader confirmed none was read, and all three services added it;
- “to” heard twice in “liked to guess” (*Pace* 0:25). The reader confirmed “to” was said once.

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
- ✗ *Difference from the text* · “garden Children liked to guess how” (0:25) — “to” was heard twice in a row here. *(confirmed said once)*
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
The corrected checks don’t change the recommendation, and they make the accuracy case for Universal-3.5 Pro stronger. It is now used for optional adult AI feedback, with the limits below stated to users.
1. **Accuracy:** **AssemblyAI Universal-3.5 Pro** is clearly the most accurate on both measures:
   - 13 errors overall (2.0%), almost all names, against 44 and 56;
   - 3 false flags that could reach feedback, against 29 and 47;
   - no false flags on the normal reading;
   - kept every restarted phrase;
   - the most accurate word timings at the pause;
   - also the cheaper of the two strong options.
2. **Still to solve:**
   - all three services added an “and” that wasn’t read and heard “he” for “it”;
   - no recording contains a single repeated word (the scripted “said said” was read as a phrase restart), so that kind of repetition is untested. The owner chose not to record a further round, so this stays untested.
3. **Not Universal-2:** it silently dropped a restarted phrase and added fillers (“um”, “uh”) that weren’t said, so it is not suitable.
4. **Deepgram Nova-3:** finds the scripted changes but has about four times Universal-3.5 Pro’s overall errors and many times its false flags.
5. **Privacy decides the provider:**
   - **AssemblyAI’s free account can’t opt out of model training.** Only a paid plan can switch it off, and the opt-out isn’t retroactive. These six recordings were uploaded with the owner’s explicit agreement on that basis.
   - **The owner has since chosen** to offer a clearly explained, training-enabled option to adults on the free credit, rather than a paid plan: each adult chooses before anything is sent (see [Using Universal-3.5 Pro on the free account](#using-universal-35-pro-on-the-free-account)).
   - **Deepgram’s opt-out works on the free credit,** so it remains the privacy-safe choice if a paid AssemblyAI plan isn’t wanted.
6. **Still open for the user-facing feature:**
   - more readers, microphones and passages;
   - a recording with single repeated words;
   - the grouping rule in the [feedback limit review](#feedback-limit-review), so a system error can’t push a real difference into “Show more” (not built; the app shows hidden items under “Show N more” rather than dropping them);
   - the copy reviewed by the owner in the app.
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

**Final check (2026-11-04, after the second):**

| Recording | Time | Question | Answer |
|---|---|---|---|
| Pace | 0:24–0:27 | “to” once or twice in “liked to guess”? | **once** (Universal-3.5 Pro’s doubled “to” is a system error) |
| Silence/noise | 0:25–0:35 | Did the reading stop after “garden”? | **yes, nothing said afterwards** (Universal-2’s “it” at 0:28.2 is a system error) |

**Still not checked by ear:** what the brief sound at 0:39.3 in *Pause* was (the 5.7 s figure counts it as part of one pause; it doesn’t change any count), and every word outside the moments above, which is assumed read as scripted.

## Feedback limit review
Feedback shows at most four items. Word differences rank above pauses and pace, and the rest are counted as “N more not shown”. The lab report now lists the hidden items too.

**Universal-3.5 Pro, all six recordings:**
- **Hidden in only one recording,** *Changes*. Shown were “low” missing, “village”, “very” and ✗ “he” for “it”. Hidden were two **real** differences: “and” missing (0:41) and “two” for “three” (0:43).
- **Everything else fitted in four items.** The false flags shown were ✗ “he” for “it” (*Changes*), ✗ the extra “and” and ✗ “to” twice (*Pace*).

**With a noisier recogniser the limit does real harm.** Deepgram’s word flags pushed out the scripted 5.7 s pause in *Pause* and the pace change in *Pace*. Those are the observations the timing evidence supports best. Up to 10 items were hidden per recording.

**Recommendation for keeping feedback manageable:**
1. **Pauses and pace never compete with word differences.** At most one pause and one pace item, always shown when found.
2. **Small words share one line.** Differences involving only short common words (a, the, and, to, it, he, can, could…) are grouped into one item, for example “A few small words differed: ‘and’ (0:41), ‘he’ for ‘it’ (0:31)”. This is a general word list, not taken from the test passage. Every false flag left for Universal-3.5 Pro is a small word, but so are several real differences (“and” three times, “a” for “the”). Grouping keeps them visible without letting them crowd anything out.
3. **Other word differences fill the remaining places, in time order,** up to five lines in all.
4. **Nothing disappears silently.** Anything over the limit goes in a “Show N more” list with times, so the reader can still find it.

On these six recordings, rules 1–3 would show every real difference Universal-3.5 Pro found. *Changes* would show five lines: “low”, “village”, “very”, “two”, and one small-words line. The two remaining false flags would each occupy part of one line rather than a full place.

## Fresh passage test: prepared, then dropped
A second passage with three scripted recordings (natural reading; one repeated word and one omission; a pause and a pace change) was prepared on 2026-11-04. The owner then decided against another recording round, so the script, its runner option and its two lab tests were removed. They remain in Git history (commit `2deef3f`). Nothing was recorded or uploaded for it.

## Using Universal-3.5 Pro on the free account
Checked on AssemblyAI’s official pricing, billing, concurrency and data-retention pages on 2026-11-04.
- **Setup:** nothing more is needed. The existing free account and key already run Universal-3.5 Pro.
- **Cost:** $0 to the owner.
  - Free credit: $50 in total, no card needed, and the credit doesn’t expire. About $0.033 has been used, which leaves room for roughly 237 hours of audio at $0.21 per hour.
  - When the credit runs out with no card on the account, AssemblyAI pauses API access rather than charging. **No card, top-up or auto-pay is to be added.**
- **Limits:** up to 5 transcriptions at the same time on the free tier.
- **Training stays on.** The owner has chosen this. AssemblyAI may use uploaded audio to improve its models; it says files are redacted for personal information first. On the free tier:
  - there’s no opt-out;
  - there’s no shorter retention setting (TTL);
  - uploads are deleted after 24–48 h;
  - the lab deletes each transcript as soon as it is saved.
- **Unresolved:** AssemblyAI’s data-retention page says files sent to its **European servers** aren’t used for training. Its data-controls page says free users can’t opt out. It isn’t confirmed whether the EU route applies to free accounts, so this would need a written answer from AssemblyAI support before relying on it.

**EU endpoint check (2026-11-04):** a 34-second synthetic clip (a macOS voice, no personal data) was sent with the free key to `api.eu.assemblyai.com` with Universal-3.5 Pro. It was accepted and transcribed (`speech_model_used: universal-3-5-pro`) and then deleted. **Whether training is excluded there for a free account is not confirmed:** the [data retention page](https://www.assemblyai.com/docs/data-retention-and-model-training.md) says files on its European servers aren’t used for training, but the [data controls](https://assemblyai.com/docs/data-controls) and [opt-out FAQ](https://assemblyai.com/docs/faq/how-to-opt-out-of-data-sharing-for-our-model-improvement-program) say free users can’t opt out. The no-training approach therefore isn’t relied on.

**What was built instead (owner’s decision, 2026-11-04):** optional AI feedback for adults, on the free credit, with an explicit choice before anything is sent: use AI feedback knowing AssemblyAI may use the recording for training, or keep recordings on the device. No opt-out switch is shown, because the backend can’t honour one. The choice can be changed for future recordings. The privacy wording says what really happens and doesn’t promise accent improvements or that earlier training use can be reversed. A Cloudflare Worker (free plan) holds the key, uses the EU servers, deletes each transcript once collected, caps use at 60 minutes a day and pauses AI feedback cleanly when the credit runs out; recording and playback carry on. Deepgram isn’t wired in, given its false-flag results. If AssemblyAI confirms in writing that EU audio from this free account isn’t used for training, the Worker’s `TRAINING` setting can switch the app to the simpler no-training wording. Details: [architecture](architecture.md#optional-ai-feedback-for-adults-off-until-connected), [setup](ai-feedback-setup.md).

**End-to-end check (2026-11-04):** with the Worker running locally (`wrangler dev`) and the app’s dev server, the same synthetic clip was uploaded as a recording against the lab passage, in both the earlier design and the redesigned nook. The status check made no upload; nothing was sent until *Get AI feedback on this recording* was pressed; the feedback read “Nothing found in the areas checked”; and AssemblyAI’s EU listing then showed the transcript deleted. **Deployed Worker check (2026-11-04):** the same clip sent through the deployed Worker by script, with the published app's Origin: transcribed (116 words), feedback “Nothing found in the areas checked”, transcript deleted afterwards; another Origin was refused. Not yet checked: the published app in a browser with the live Worker, a real voice through the app, and a real out-of-credit reply (simulated in tests).

Sources: [pricing](https://www.assemblyai.com/pricing), [billing](https://www.assemblyai.com/docs/billing-and-pricing.md), [credit expiry](https://www.assemblyai.com/docs/faq/do-my-free-credits-expire), [concurrency](https://www.assemblyai.com/docs/faq/what-are-my-concurrency-limits), [data retention and training](https://www.assemblyai.com/docs/data-retention-and-model-training), [data controls](https://assemblyai.com/docs/data-controls), [model-training opt-out](https://assemblyai.com/docs/faq/how-to-opt-out-of-data-sharing-for-our-model-improvement-program).

## Limits
One reader, one phone, one passage, one take per case, and a ground truth checked by ear only at the moments listed above. These results show the pipeline can work; they say nothing about other voices, accents, children, microphones or rooms, and they don’t establish why any recognition error happened.
