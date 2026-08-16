# mf01sm v3.6 measurement notes

mf01sm is an exploratory self-report questionnaire, not a clinical diagnostic instrument. Version 3.6 is a substantive redesign that reduces the questionnaire's previous over-weighting of sexuality/romance and restores broad, nonsexual personality-style and interpersonal-role dimensions.

The v3.6 design is **inspired only at the construct-architecture level** by older broad personality inventories such as the MMPI family, which historically includes masculinity/femininity and gender-role scales. mf01sm does not copy MMPI items, scoring keys, norms or interpretations and must not be presented as an MMPI substitute or derivative clinical instrument.

## Questionnaire structure

v3.6 contains **52 responses: 50 scored items and two instructed-response quality checks**. The 50 substantive items are deliberately balanced:

- 9 assigned-sex-relative gender-direction / nonbinary-fit items: 18%
- 14 nonsexual gender-coded style items: 28%
- 12 attraction / romance / libido / relationship-structure items: 24%
- 15 nonsexual interpersonal-role items: 30%

This replaces v3.5, where attraction/romance/libido/relationship constructs occupied 34 of 60 substantive responses (56.7%). v3.6 should therefore be treated as a new instrument version rather than pooled directly with v3.5 item-level data.

The 17 raw v3.6 subscales are:

1. assigned-sex-aligned gender direction (`gender_aligned`)
2. cross-assigned gender direction (`gender_cross`)
3. nonbinary fit (`nonbinary`)
4. traditionally masculine-coded nonsexual style (`gender_style_masc`)
5. traditionally feminine-coded nonsexual style (`gender_style_fem`)
6. romantic attraction to men (`rom_m`)
7. romantic attraction to women (`rom_f`)
8. romantic attraction to nonbinary/gender-diverse people (`rom_nb`)
9. physical/sexual attraction to men (`phys_m`)
10. physical/sexual attraction to women (`phys_f`)
11. physical/sexual attraction to nonbinary/gender-diverse people (`phys_nb`)
12. libido / sexual-drive intensity (`libido`)
13. desire for a romantic relationship itself (`romantic_desire`)
14. consensual relationship openness (`relationship_openness`)
15. interaction initiative / response style (`initiative`)
16. nonsexual interpersonal following ↔ leading preference (`dominance`)
17. personal decision autonomy (`autonomy`)

Every scored item still maps to an ordered integer from 1 to 5. Each raw subscale is the unweighted mean of its keyed item values, mapped linearly to 0–100. Two deliberately reverse-keyed items are transformed as `6 - raw` before subscale scoring.

## Nonsexual masculinity / femininity style

The main new v3.6 construct is a pair of **independent** nonsexual style scores rather than a single mutually exclusive gender-role line.

`gender_style_masc` uses original mf01sm items about culturally masculine-coded tendencies such as competition, technical/mechanical problem solving, instrumental problem-first coping, function/efficiency preference, challenge seeking and related task style.

`gender_style_fem` uses original mf01sm items about culturally feminine-coded tendencies such as emotional cue sensitivity, aesthetic/detail attention, care/comfort behavior, affectionate expression and sentimental/ritual detail.

Important interpretation constraints:

- neither score reads or uses the respondent's self-ID;
- neither score uses assigned sex in scoring;
- neither score asks whether the respondent *feels male/female*;
- the two scores can both be high, both low, or differ strongly;
- they are culture-coded stereotype/style dimensions, **not biological masculinity/femininity and not gender identity**;
- item calibration and labels are exploratory and require local empirical validation.

For the public 0–1 presentation, `gender_expression` is derived as:

`clamp(0.5 + (gender_style_fem - gender_style_masc) / 200)`

The two raw scores remain visible in the result because a one-dimensional position cannot distinguish high-high from low-low profiles.

## 0 / 1 initiative axis

v3.6 restores a public **0 ↔ 1 interaction axis** from the existing initiative construct:

- `0`: more likely to wait, respond, or let another person start
- `0.5`: flexible / context-dependent
- `1`: more likely to initiate, propose, organize or move an interaction forward

The items use everyday nonsexual situations: group planning, restarting stalled conversations, resolving a stalemate, organizing an activity and taking the first step when everyone is waiting.

The public value is `initiative01 = initiative / 100`. Legacy `top` / `bot` compatibility fields remain aliases for initiative and its inverse, but the public wording is deliberately nonsexual.

## Following ↔ leading and autonomy

v3.6 adds a separate `dominance` subscale for **nonsexual interpersonal control/leadership preference**:

- low: more comfortable following another person's clear direction
- middle: collaborative / negotiated control
- high: more comfortable setting direction, pace and task structure

This is intentionally distinct from `autonomy`. A person can like another person taking the lead while still keeping strong personal boundaries, or enjoy leading shared tasks while being comfortable delegating personal decisions.

The main 13+ questionnaire does **not** add a sadism/masochism or BDSM scale. The `dominance` axis is a nonsexual interpersonal analogue only and should not be labeled or interpreted as sexual S/M.

For legacy compatibility in v3.6, `d = dominance` and `s = 100 - dominance`; `autonomy` remains stored separately as a first-class raw subscale.

## Attraction and relationship items

v3.6 keeps attraction and relationship information but makes it a minority of the questionnaire: **12 of 50 substantive items (24%)**.

It retains separate target-specific romantic and physical/sexual attraction scores for men, women and nonbinary/gender-diverse people, but each target-specific subscale is now intentionally brief. These scores are therefore useful for exploratory profile display but should not be treated as high-reliability stand-alone clinical scales without empirical support.

Libido, romantic desire and consensual relationship openness each use two items. The v3.5 separate `multi_partner` raw construct is removed from v3.6; the public relationship-structure position is now `relationship_openness / 100`.

## Baseline spectra: statistics only

The first-page baseline remains unchanged in purpose: it is **not used in questionnaire scoring**. It stores seven 0–1 self-position spectra for descriptive statistics and self-position-versus-questionnaire comparison:

1. gender identity
2. gender expression
3. sexual-attraction direction (men ↔ balanced/bi-pan ↔ women)
4. sexual-attraction intensity
5. libido
6. romantic tendency
7. relationship structure

Gender identity keeps the axis-outside `agender`, `bigender`, and `genderfluid` alternatives.

The important v3.6 change is that the questionnaire-side gender-expression/style estimate is computed from the 14 nonsexual behavior/interest items and **does not read the baseline gender-expression slider**. This makes the self-position ↔ questionnaire comparison meaningful rather than circular.

## Questionnaire-derived public axes

`scores.axes01` contains ten public 0–1 values:

- `gender_identity`: questionnaire male/nonbinary/female barycentric position
- `gender_expression`: nonsexual masculine/feminine style position derived from the two independent style scores
- `sexual_attraction_direction`: target-based men ↔ women position from physical-attraction target scores, with nonbinary evidence centered
- `sexual_attraction_intensity`: maximum of the three physical-attraction target scores
- `libido`
- `romantic_tendency`
- `relationship_structure`
- `initiative01`: response/wait ↔ initiate/act
- `dominance`: follow ↔ lead
- `autonomy`: delegate ↔ self-decide

Only the first seven have baseline self-position comparators. The last three are questionnaire-only interpersonal axes.

## Mixed response formats

v3.6 keeps the v3.5 mixed, playful presentation rather than reverting to a wall of identical agree/disagree items. It uses scenario cards, frequency, comfort, likelihood, intuitive-fit, desire, intensity and discrete slider formats.

The two attention checks remain playful duck/cat instructed-response items. All formats still resolve to ordered 1–5 values for scoring and response-quality checks.

## Response quality

The response-quality indicator remains a caution flag rather than a psychological validity score. It combines:

- two instructed-response checks;
- eleven focused semantic parallel pairs;
- long identical-answer runs / extreme option concentration;
- average response speed.

With 50 substantive responses, the existing proportional long-string rules resolve to:

- mild: 15
- mid: 19
- severe: 25

These thresholds are stored in `response_quality_detail.run_thresholds` and required by the v3.6 save gate.

Because the item mix changed substantially, pair-score and response-pattern distributions must be re-evaluated on v3.6 data rather than assuming v3.5 cutoffs have identical empirical behavior.

## Entertainment presentation

The result keeps blurred color/flag-like backgrounds, deterministic entertainment tags and profile chips, but v3.6 shifts the tag logic toward nonsexual dimensions. Examples include `双核变色龙`, `软糯小蓝莓`, `温柔调度员`, `硬核推进器`, `舰桥总指挥`, `副驾驶小云朵` and `先手小火箭`.

These are presentation easter eggs, not psychometric constructs or identity diagnoses. `scores.fun_tag` and `scores.fun_chips` are saved so the archived record can reproduce what the respondent saw.

## Storage and schema gate

Raw browser geolocation and `CF-Connecting-IP` remain stored for regional analysis and later human review. IP/GPS similarity never automatically rejects, merges or excludes a response.

D1 remains the primary archive. Successful submissions perform one D1 insert and no routine KV mirror; KV is failure fallback only. Historical records are not rewritten.

v3.6 uses:

- `version = 3.6.0`
- `_schema = 'assigned-sex-v3.6-balanced-personality'`
- `_question_format = 'mixed-v36-balanced'`

A v3.6 record must contain all 17 raw subscale scores, all 52 integer raw answers, 15/19/25 run thresholds, all ten public `axes01` values and a complete seven-axis baseline self-report object. Older open pages continue through the v3.5/v3.4/v3.3/v3.2/v3.1 version gates.

## Version history

- v3.1.0: initial multidimensional 34-item release
- v3.1.1: raw IP/GPS restoration and D1-primary/KV-fallback storage
- v3.2.0: 58-item expanded profile
- v3.2.1: schema-gated version archiving and length-scaled long-string thresholds
- v3.3.0: 62-item / 17-subscale expanded attraction and relationship model
- v3.4.0: continuous 0–1 baseline/result spectra
- v3.5.0: mixed playful response formats, target-based men↔women attraction direction and restored entertainment presentation
- v3.6.0: 52-response balanced profile; sexuality/romance reduced from 56.7% to 24% of substantive items; independent nonsexual masculine/feminine style scales; public 0/1 initiative axis; nonsexual follow↔lead dominance axis; autonomy retained separately

## Validation plan

v3.6 needs fresh psychometric analysis:

1. estimate corrected item-rest correlations and omega for the two new gender-style scales, initiative, dominance and autonomy;
2. test whether masculine-coded and feminine-coded items behave as two correlated dimensions rather than one bipolar factor;
3. inspect high-high and low-low style profiles separately before interpreting the derived 0–1 style position;
4. run EFA/CFA on the full v3.6 item set rather than assuming the v3.5 structure transfers;
5. examine whether dominance and autonomy separate empirically or collapse into one factor;
6. inspect the reduced target-attraction items for instability and avoid over-interpreting single-item target scores;
7. compare baseline gender-expression self-position with the non-self-ID questionnaire style position as descriptive convergence evidence only;
8. inspect response-quality pair differences and long-string behavior under the shorter 52-response format;
9. revise weak or stereotype-heavy gender-style items only in a new version rather than silently changing historical scoring.
