# mf01sm v3.5 measurement notes

mf01sm is an exploratory self-report questionnaire, not a clinical diagnostic instrument. Version 3.5 keeps the 17 construct scores and 62-response structure, but deliberately changes the item wording and response presentation to a mixed-format, scenario-oriented questionnaire. It is therefore a substantive questionnaire version and must not be pooled with v3.4 as if the item instrument were unchanged.

## Questionnaire structure

v3.5 contains 62 responses: 60 scored items and two instructed-response quality checks. The 17 raw subscales remain:

- assigned-sex-aligned gender direction
- cross-assigned gender direction
- nonbinary fit
- masculine gender expression
- feminine gender expression
- romantic attraction to men
- romantic attraction to women
- romantic attraction to nonbinary/gender-diverse people
- physical/sexual attraction to men
- physical/sexual attraction to women
- physical/sexual attraction to nonbinary/gender-diverse people
- libido / sexual drive
- desire for a romantic relationship itself
- consensual relationship openness
- comfort/interest in multiple simultaneous consensual romantic relationships (`multi_partner`)
- interpersonal initiative
- decision autonomy

Every scored response still maps monotonically to an integer from 1 to 5, and each raw subscale remains the unweighted item mean mapped linearly to 0–100. This keeps the scoring machinery simple while allowing the user-facing item formats to vary.

## Mixed response formats

v3.5 removes the repeated global “非常不符合 ↔ 非常符合” presentation. Items now use several response styles selected to fit the prompt:

- short scenario cards with five ordered reactions
- frequency responses
- comfort responses
- likelihood responses
- intuitive-fit / vibe responses
- desire/intention responses
- intensity responses
- discrete five-position sliders
- two playful instructed-response checks

The response styles are only presentation/wording formats. For scoring they preserve a common direction: larger values indicate more of the construct named by the item key. Semantic parallel pairs remain directionally aligned so their absolute 1–5 differences can still contribute to the response-quality indicator.

Because changing item wording and response format can change measurement properties, v3.5 requires fresh reliability/factor analysis. Similar construct names do not imply numerical interchangeability with v3.4.

## Baseline spectra: statistics only

The baseline continues to use unticked continuous HTML range controls with `min=0`, `max=1`, `step=0.001`. The UI explicitly states that the baseline **does not enter questionnaire scoring**. It is stored for descriptive statistics and self-position-versus-questionnaire comparison only.

The seven public baseline spectra are:

1. gender identity: `0 = male`, `0.5 = nonbinary`, `1 = female`
2. gender expression: `0 = highly masculine`, `0.5 = androgynous`, `1 = highly feminine`
3. sexual-attraction direction: `0 = attraction toward men`, `0.5 = bi/pan/broadly balanced direction`, `1 = attraction toward women`
4. sexual-attraction intensity: `0 = very low/none`, `0.5 = intermediate/grey area`, `1 = very strong/clear`
5. libido / sexual-drive intensity: `0 = low`, `0.5 = ordinary`, `1 = high`
6. romantic tendency: `0 = aromantic/very low romantic desire`, `0.5 = interested`, `1 = strongly romantic`
7. relationship structure: `0 = monogamous`, `0.5 = open/non-exclusive`, `1 = poly/multiple romantic partners`

The attraction-direction axis is intentionally target-based rather than respondent-relative. It uses **men ↔ women**, not heterosexual ↔ homosexual or other-gender ↔ same-gender wording. This avoids making the axis depend on the respondent's assigned or current gender.

Gender identity keeps the v3.4 axis-outside alternatives: exactly one of `agender`, `bigender`, or `genderfluid` can replace the numeric male–nonbinary–female position.

## Questionnaire-derived 0–1 axes

v3.5 stores `scores.axes01` as the public presentation profile:

- `gender_identity`: barycentric male/female/nonbinary position derived from the gender-direction subscales
- `gender_expression`: `expression_position / 100`
- `sexual_attraction_direction`: `(phys_f + 0.5 * phys_nb) / (phys_m + phys_f + phys_nb)`, after putting the three source scores on the same 0–1 scale; this yields 0 toward men, 1 toward women and centers nonbinary-target evidence
- `sexual_attraction_intensity`: `max(phys_m, phys_f, phys_nb) / 100`
- `libido`: `libido / 100`
- `romantic_tendency`: `romantic_desire / 100`
- `relationship_structure`: `(relationship_openness + multi_partner) / 200`

The one-dimensional attraction-direction axis is a convenience visualization. Raw male/female/nonbinary target scores remain primary for research because distinct multidirectional profiles can map to the same 0–1 position.

## Self-report versus questionnaire comparison

`scores.self_test_comparison` stores the baseline `self`, questionnaire `test`, absolute `gap` and signed gap for each compatible numeric axis. A gender-identity gap remains null for agender/bigender/genderfluid selections because those states are not single numeric points on the male–nonbinary–female line.

The comparison is descriptive only. A large gap is not dishonesty, invalidity, diagnosis or an automatic exclusion rule.

## Entertainment presentation

v3.5 restores an explicitly playful result layer inspired by the earlier project presentation:

- a deterministic entertainment tag such as “软糯小蓝莓”, “光谱漫游者” or “浪漫信号塔”
- several short profile chips
- a blurred flag-like color backdrop
- a link back to the Test directory for more tests

`scores.fun_tag` and `scores.fun_chips` are saved for reproducibility of the displayed result. They are presentation outputs, not psychometric constructs. The flag backdrop is a visual easter egg and must not be interpreted as assigning an identity label.

## Response quality

The response-quality indicator remains a caution flag, not a psychological validity scale. It combines:

- two instructed-response checks
- consistency of selected semantic parallel pairs
- unusually long identical-response runs / extreme option concentration
- unusually short average response time

There are still 60 substantive responses, so the proportional long-string thresholds remain 17 / 23 / 30. Mixed visual response types still store values 1–5, allowing the existing pattern and pair logic to operate, but v3.5 quality behavior should be re-evaluated empirically because mixed formats can alter response distributions.

## Storage and schema gate

Raw browser geolocation and `CF-Connecting-IP` remain stored for regional analysis and later human review. IP/GPS similarity never automatically rejects, merges or excludes a response.

D1 remains the primary archive. Successful submissions perform one D1 insert and no routine KV mirror; KV is failure fallback only. Historical records are not rewritten.

v3.5 uses:

- `version = 3.5.0`
- `_schema = 'assigned-sex-v3.5-mixed-format'`
- `_question_format = 'mixed-v35'`

A v3.5 record must contain all 17 raw subscale scores, all 62 integer raw answers, the 17/23/30 response-quality thresholds, all seven questionnaire `axes01` values and a complete baseline spectrum object. Older declared versions continue through the v3.4/v3.3/v3.2/v3.1 gates so pages left open across deployments keep their actual version.

## Version history

- v3.1.0: initial multidimensional 34-item release
- v3.1.1: raw IP/GPS restoration and D1-primary/KV-fallback storage
- v3.2.0: 58-item expanded profile
- v3.2.1: schema-gated version archiving and length-scaled long-string thresholds
- v3.3.0: 62-item / 17-subscale model with expanded attraction and relationship constructs
- v3.4.0: unchanged v3.3 questionnaire items, but continuous 0–1 baseline/result spectra
- v3.5.0: rewrites the 62-response questionnaire into mixed playful formats, changes the public attraction direction to men↔women, restores entertainment tags / blurred flag-like result styling, and adds the Test-directory return action

## Validation plan

v3.5 should be analyzed as a new item-form version:

1. inspect per-item response distributions separately by response format and look for format-specific floor/ceiling or midpoint effects;
2. estimate corrected item-rest correlations and omega for each hypothesized subscale;
3. run EFA/CFA on v3.5 rather than assuming the v3.4 structure automatically transfers;
4. examine semantic-pair differences by pair and by response format before interpreting the aggregate pair-quality score;
5. test the men↔women attraction-direction convenience transform against the three raw target-specific attraction scores;
6. compare baseline 0–1 self-position with questionnaire-derived axes using signed and absolute gaps only as descriptive convergence evidence;
7. keep relationship openness and multi-partner preference as separate raw constructs even though the public relationship spectrum combines them;
8. revise weak items or response formats only in a new version rather than silently rescoring existing records.
