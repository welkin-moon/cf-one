# mf01sm v3.3 measurement notes

mf01sm is an exploratory self-report questionnaire, not a clinical diagnostic instrument. Version 3.3 keeps continuous scores primary and expands both the self-identification layer and the questionnaire so later analysis can study how self-description relates to item-response profiles without treating disagreement as error.

## Constructs

v3.3 contains 62 questionnaire items: 60 scored items and two instructed-response quality checks. Scored items are distributed across 17 subscales:

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

Sex assigned at birth remains separate from current gender identity. Gender identity is collected as a spectrum position plus optional identity labels such as trans, nonbinary, genderqueer, genderfluid, agender, questioning and free text. These labels are self-description variables, not scored questionnaire answers.

Gender expression remains separate from identity. Masculine and feminine expression are retained as two raw subscales rather than forcing every respondent onto one bipolar score. `expression_position = 50 + (expression_fem - expression_masc) / 2` is stored only as a convenience for comparison with the baseline expression self-rating.

Romantic attraction and physical/sexual attraction remain separate and each retains male, female and nonbinary/gender-diverse target directions. Libido remains separate from target-specific physical/sexual attraction, and desire for a romantic relationship remains separate from attraction to particular genders.

v3.3 splits relationship structure into two dimensions. `relationship_openness` measures comfort/preference for consensually negotiated non-exclusivity. `multi_partner` measures comfort/interest in simultaneously maintaining multiple consensual romantic relationships. This separation is intentional: an open dyadic relationship and polyamorous/multi-partner relationship structure are not the same construct.

## Baseline self-report and identity layer

The baseline records:

- assigned sex at birth
- current gender position and optional gender identity labels/free text
- multi-select sexual/physical-attraction orientation labels plus optional free text
- multi-select romantic-orientation labels plus optional free text
- gender-identity stability
- confidence in orientation identity
- stability of attraction direction
- self-rated romantic attraction strength toward men, women and nonbinary/gender-diverse people
- self-rated physical/sexual attraction strength toward men, women and nonbinary/gender-diverse people
- self-rated gender-expression position
- self-rated overall physical/sexual-attraction intensity
- self-rated libido
- self-rated desire for a romantic relationship
- self-rated consensual relationship openness
- self-rated comfort/interest in multiple simultaneous romantic relationships

Structured identity metadata is copied into `scores._self_report` where available. The compact `self_gender` and `self_orientation` database columns remain for compatibility and human-readable admin views; no database schema migration is required.

## Self-ID / self-rating versus questionnaire profile

v3.3 stores two kinds of comparison data.

`self_identity_comparison` keeps categorical self-description beside questionnaire profiles for gender, physical/sexual orientation and romantic orientation. It does **not** convert labels into expected scores and does not output a categorical “match” judgment.

`self_test_comparison` compares only variables that can reasonably share the same 0–100 axis. v3.3 includes:

- gender-expression position
- overall physical/sexual-attraction intensity
- libido
- romantic-relationship desire
- relationship openness
- multi-partner relationship comfort/interest
- self-rated versus questionnaire romantic attraction to men, women and nonbinary/gender-diverse people
- self-rated versus questionnaire physical/sexual attraction to men, women and nonbinary/gender-diverse people

For each comparable variable the stored object contains the self-rating, questionnaire score, absolute gap and signed gap. `mean_absolute_gap` is descriptive convergence metadata only. It must not be interpreted as honesty, validity, diagnostic agreement or an exclusion rule.

## Item construction

Items are short, single-idea statements on a five-point agreement scale. Items from different subscales are interleaved. Broad mechanical reverse-wording remains avoided because wording reversal can add method variance and confusion. Selected semantically parallel item pairs are used only as one component of the response-quality indicator.

No MMPI, Transgender Congruence Scale, Kinsey, Klein, Sexual Desire Inventory or other proprietary/validated instrument items are copied. Published measurement research is used to define construct boundaries and validation strategy; mf01sm uses its own wording and remains an unvalidated exploratory instrument until local validation is completed.

## Scoring

Each subscale is an unweighted mean of its 1–5 item responses mapped linearly to 0–100. Equal item weights remain intentional until enough local data exist to justify another model empirically.

Convenience composites include:

- `expression_position = 50 + (expression_fem - expression_masc) / 2`, clamped to 0–100
- `expression_balance = 100 - abs(expression_fem - expression_masc)`
- `phys_overall = max(phys_m, phys_f, phys_nb)`
- `rom_overall = max(rom_m, rom_f, rom_nb)`

A textual `relationship_profile` is generated from `relationship_openness` and `multi_partner` for UI explanation. It is not a validated categorical diagnosis and the two raw continuous scores remain primary.

Legacy compatibility fields (`m`, `f`, `attr_m`, `attr_f`, `agender`, `ace`, `top`, `bot`, `d`, `s`, `trans`, `pan`, `validity`) remain for old tooling. New analysis should use the current subscales. The legacy `ace` field remains a convenience proxy derived from physical-attraction intensity and must not be treated as an asexual identity classifier.

## Response quality

The response-quality indicator remains a caution flag, not a psychological validity scale. It combines:

- two instructed-response checks
- consistency of selected semantically parallel item pairs
- unusually long identical-response runs / extreme response concentration
- unusually short average response time

Run thresholds scale with the number of substantive items. v3.3 has 60 substantive responses, resolving the proportional thresholds to 17, 23 and 30 identical responses for mild/mid/severe long-string flags. The resolved values are stored in `response_quality_detail.run_thresholds` and are required by the v3.3 schema gate.

## Raw location/IP observability

Raw browser geolocation and the `CF-Connecting-IP` value seen by the Worker remain stored for regional statistics and later human review of suspicious or duplicate-looking records.

The application deliberately does **not** automatically reject, merge, deduplicate or exclude responses from IP/GPS similarity. Carrier networks, campus networks, household NAT/CGNAT, VPN/proxy chains and mobile IP reassignment make automatic identity inference too error-prone. IP, GPS, timestamps, response quality, self-report variables and item responses are evidence for later human analysis, not automatic exclusion rules.

## Storage/quota and schema/version policy

D1 remains the primary archive. A successful submission performs one D1 insert and no routine KV mirror write. KV is used only as a failure fallback. The admin endpoint remains D1-only by default; legacy/fallback KV scanning is opt-in with `include_kv=1` or used when D1 is unavailable.

The save endpoint gates the stored version by the client-declared questionnaire version and score schema. This protects data when a respondent finishes an older page after a new deployment. Older supported pages are archived under their actual questionnaire version instead of being silently relabeled.

v3.3 submissions must contain the v3.3 schema, all 17 subscale scores, all 62 raw item answers, response-quality metadata with v3.3 run thresholds and the expanded baseline self-report fields.

## Versioning and historical data

The `records` table is not rewritten. Historical rows keep their original version, tag, scores, IP, location and self-report values.

- v3.1.0: initial multidimensional 34-item release
- v3.1.1: raw IP/GPS restoration and D1-primary/KV-fallback storage policy
- v3.2.0: 58-item expanded profile with gender expression, nonbinary-target attraction, libido, romantic desire, relationship openness and numeric self-test comparison
- v3.2.1: same 58-item psychological model as v3.2.0, with schema-gated version archiving and questionnaire-length-scaled long-string quality thresholds
- v3.3.0: 62-item model; richer multi-label sexual/romantic self-ID, six target-specific attraction self-ratings, direct categorical self-ID versus questionnaire display, and separation of relationship openness from multi-partner relationship comfort/interest

v3.3 rows use `_schema = 'assigned-sex-v3.3-expanded-profile'`. Raw answers remain in `_answers`; baseline variables remain in `_self_report`.

## Validation plan

Different instrument versions must not be pooled as if they were identical without explicit version handling. For genuine v3.3 data:

1. inspect response-quality flags, item distributions, floor/ceiling effects and corrected item-rest correlations;
2. estimate omega for each hypothesized subscale, with alpha as a secondary familiar statistic;
3. use EFA/CFA to test the expanded factor structure, especially masculine vs feminine expression, romantic vs physical attraction, libido vs attraction intensity, romantic desire vs target-specific attraction, and relationship openness vs multi-partner preference;
4. test whether male/female/nonbinary target attraction factors are empirically separable or better represented by another model;
5. test `relationship_openness` and `multi_partner` for discriminant validity rather than assuming they are opposite ends of one axis;
6. compare numeric self-ratings with matched questionnaire scores using signed and absolute gaps, not “accuracy” labels;
7. compare categorical self-identities with continuous questionnaire profiles descriptively and with appropriate group-size safeguards;
8. test measurement invariance / DIF across assigned-sex and gender-identity groups before comparing group means;
9. revise weak or cross-loading items in a new version rather than silently rescoring historical records.
