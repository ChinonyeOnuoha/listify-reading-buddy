# Reading Buddy AI lab — fresh passage recording script

Three short recordings (about 40–50 seconds each) on a passage the analysis has never been adjusted for. Record on the same phone as before, one take each, and save them in `~/Downloads` with exactly these names. The expectations below were written before anything was recorded. The analysis code is not changed to fit the results.

**Passage (original, 108 words):**

> The ferry to Gull Island was meant to leave at seven, but most mornings it was late. Passengers waited on the wooden pier with flasks of tea, watching the gulls argue over crusts. A man in a yellow coat sold newspapers from a cart, and he always seemed to know which boat would arrive first. He never explained how. When the engine finally coughed into life, a small cheer went up from the queue. The crossing took twenty minutes on a calm day and almost an hour when the wind turned. Children pressed their faces to the cold windows, counting the buoys that bobbed past like red apples.

| # | File name | While recording | A correct result reports |
|---|---|---|---|
| F1 | `Fresh 1 natural reading.m4a` | Read as written at your usual pace. | Nothing, unless listening shows a word was read differently. |
| F2 | `Fresh 2 repeat and omission.m4a` | Say **“sold sold”** (“a yellow coat sold sold newspapers”). Leave out **“cold”** (“pressed their faces to the windows”). Otherwise read as written. | “sold” heard twice; “cold” not heard; nothing else. |
| F3 | `Fresh 3 pause and pace.m4a` | Read the first five sentences slowly, with a pause of about 2 seconds inside **“a small cheer … went up”**. From **“The crossing took”** to the end, read noticeably faster. | One pause of about 2 s between “cheer” and “went”; quicker pace from “The crossing took”; no word differences. |

**After recording:**
1. Listen back once and write down anything read differently from the plan (a skipped or changed word, an extra restart). Your notes are the reference; the services’ transcripts are not.
2. Run `node lab/cloud/run.ts --fresh --upload`. This sends the three recordings to AssemblyAI Universal-3.5 Pro only, then deletes the transcripts. The cost is about $0.01 of the free credit.
