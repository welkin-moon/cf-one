# mf01sm v3.4 measurement notes

mf01sm is an exploratory self-report questionnaire, not a clinical diagnostic instrument. Version 3.4 keeps the 62-item / 17-subscale questionnaire introduced in v3.3, but replaces the baseline self-identification controls and the primary result presentation with continuous 0–1 spectra modeled after the spectrum view used in the project UI.

## Questionnaire constructs

v3.4 contains the same 62 questionnaire items as v3.3: 60 scored items and two instructed-response quality checks. The 17 raw subscales remain:

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

The raw questionnaire subscales still use unweighted 1–5 item means mapped to 0–100. They are retained for psychometric analysis and historical continuity. The public v3.4 result view does not present them as the primary output; it presents derived 0–1 spectra instead.

## Baseline continuous spectra

The v3.4 baseline removes the previous multi-select identity tags, preset Likert points and free-text identity fields. Except for assigned sex at birth, baseline self-report is expressed through continuous HTML range inputs with `min=0`, `max=1` and `step=0.001`. There are no preset categorical tick points.

The baseline spectra are:

1. gender identity: `0 = male`, `0.5 = nonbinary`, `1 = female`
2. gender expression: `0 = highly masculine`, `0.5 = androgynous`, `1 = highly feminine`
3. sexual orientation: `0 = straight`, `0.5 = bi/pan`, `1 = gay/lesbian`
4. sexual-attraction intensity: `0 = asexual`, `0.5 = grey-asexual`, `1 = clearly allosexual / strong sexual-attraction capacity`
5. libido / sexual-drive intensity: `0 = low`, `0.5 = ordinary`, `1 = high`
6. romantic tendency: `0 = aromantic`, `0.5 = interested`, `1 = strongly romantic`
7. relationship structure: `0 = monogamous`, `0.5 = open/non-exclusive`, `1 = poly/multiple romantic partners`

Gender identity has one exception to the numeric axis. The respondent chooses either any numeric position on the male–nonbinary–female continuum **or exactly one** of three axis-outside states:

- `agender` / 无性
- `bigender` / 双性
- `genderfluid` / 流动

These three states are mutually exclusive with the continuous gender slider. The previous Trans, Non-binary, Genderqueer, Questioning and other-tag controls are removed from the baseline UI, as is the previous free-text identity field.

The compact `self_gender` and `self_orientation` database columns remain for compatibility and admin readability. Structured numeric baseline data are stored in `scores._self_report.axes` and in the existing `self_likert` JSON column. No D1 schema migration is required.

## Primary 0–1 questionnaire spectra

v3.4 stores `scores.axes01`, which maps the questionnaire profile onto the same seven public spectra.

- `gender_identity`: a barycentric position from questionnaire male-direction, female-direction and nonbinary-fit evidence; 0 is male and 1 is female, with nonbinary evidence centered at 0.5.
- `gender_expression`: `expression_position / 100`.
- `sexual_orientation`: a convenience straight↔bi/pan↔gay index derived from target-specific physical/sexual-attraction scores relative to the respondent's numeric gender position. Same-gender attraction contributes toward 1, other-gender attraction toward 0 and nonbinary-target attraction toward the midpoint. For an axis-outside gender self-report, the questionnaire-derived gender position is used only for this convenience transformation.
- `sexual_attraction_intensity`: `phys_overall / 100`, where `phys_overall = max(phys_m, phys_f, phys_nb)`.
- `libido`: `libido / 100`.
- `romantic_tendency`: `romantic_desire / 100`.
- `relationship_structure`: `(relationship_openness + multi_partner) / 200`. This makes a profile with high openness but low multi-partner interest naturally sit near the open midpoint while high values on both dimensions move toward the poly end.

These are convenience presentation axes, not validated identity classifiers. The underlying raw subscales remain available and should be preferred for psychometric modeling.

## Self-report versus questionnaire comparison

`scores.self_test_comparison` compares baseline 0–1 positions with the questionnaire-derived `axes01` positions. For numeric axes it stores:

- `self`
- `test`
- `gap = abs(test - self)`
- `signed_gap = test - self`

The gender-identity gap is left null when the baseline selection is agender, bigender or genderfluid because those states are not represented as single points on the male–nonbinary–female line.

The mean absolute gap is descriptive convergence metadata only. A gap is not an honesty score, validity score, diagnosis or automatic reason to exclude a response.

## Response quality

The response-quality indicator remains a caution flag, not a psychological validity scale. It combines two instructed-response checks, selected semantic-pair consistency, identical-response runs / response concentration and average response speed.

The questionnaire still has 60 substantive responses, so the proportional long-string thresholds remain 17 / 23 / 30 for mild / mid / severe flags. The resolved thresholds remain stored in `response_quality_detail.run_thresholds` and are required by the v3.4 save gate.

## Raw location/IP and duplicate review

Raw browser geolocation and the `CF-Connecting-IP` value seen by the Worker remain stored for regional analysis and later human review of suspicious or duplicate-looking records.

The application does **not** automatically reject, merge, deduplicate or exclude samples from IP/GPS similarity. Carrier networks, campus networks, household NAT/CGNAT, VPN/proxy chains and mobile IP reassignment make automatic identity inference too error-prone.

## Storage, schema gate and historical versions

D1 remains the primary archive. A successful v3.4 submission performs one D1 insert and no routine KV mirror write. KV remains failure fallback only. The admin endpoint remains D1-first.

v3.4 uses `_schema = 'assigned-sex-v3.4-continuous-spectrum'`. A v3.4 record must contain all 17 raw questionnaire subscale scores, all 62 raw item answers, response-quality metadata with 17/23/30 run thresholds, all seven questionnaire `axes01` values and a complete v3.4 baseline spectrum object.

The v3.4 runtime delegates older declared versions to the existing v3.3/v3.2/v3.1 schema gates, so an older page left open across deployment is archived under its actual questionnaire version instead of being relabeled.

Historical records are never rewritten merely because a new version is deployed.

- v3.1.0: initial multidimensional 34-item release
- v3.1.1: raw IP/GPS restoration and D1-primary/KV-fallback storage
- v3.2.0: 58-item expanded profile
- v3.2.1: schema-gated version archiving and length-scaled long-string thresholds
- v3.3.0: 62-item / 17-subscale profile, richer target-specific self-ratings and split relationship openness vs multi-partner construct
- v3.4.0: same 62 questionnaire items as v3.3, but baseline and primary results redesigned as free continuous 0–1 spectra; identity tags/free text removed; gender adds mutually exclusive agender/bigender/genderfluid axis-outside states

## Validation plan

v3.3 and v3.4 questionnaire item responses can be compared more directly than earlier questionnaire versions because the 62 questionnaire items and 17 raw subscales are unchanged, but the baseline self-report and derived result schema changed and must be versioned explicitly.

For v3.4 data:

1. continue item-level reliability, item-rest, omega, EFA/CFA and DIF work on the 17 raw subscales;
2. analyze each 0–1 baseline axis distribution for clustering, midpoint/default effects and floor/ceiling behavior;
3. compare the seven self-report spectra with their derived questionnaire spectra using signed and absolute gap distributions;
4. separately analyze agender/bigender/genderfluid respondents rather than forcing those states onto the numeric gender line;
5. validate the straight↔bi/pan↔gay convenience transformation against the raw target-specific attraction profile before using it for group comparisons;
6. retain `relationship_openness` and `multi_partner` as separate raw questionnaire variables even though the public relationship-structure spectrum combines them into a single 0–1 presentation axis;
7. revise the questionnaire or derived-axis formulas only in a new version rather than silently changing historical scores.
