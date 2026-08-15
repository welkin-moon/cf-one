# mf01sm v3.2 measurement notes

mf01sm is an exploratory self-report questionnaire, not a clinical diagnostic instrument. Version 3.2 keeps continuous scores primary, expands the construct set, and explicitly stores comparable self-ratings so later analysis can study the relationship between identity/self-description and questionnaire responses without treating disagreement as error.

## Constructs

v3.2 contains 58 questionnaire items: 56 scored items and two instructed-response quality checks. Scored items are distributed across 16 subscales:

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
- consensual relationship openness preference
- interpersonal initiative
- decision autonomy

Sex assigned at birth (AMAB/AFAB) remains separate from current gender identity. Current gender identity is collected as a spectrum position plus optional identity labels such as trans, nonbinary, genderqueer, genderfluid, agender, questioning, and free text. These identity labels are not scored as questionnaire answers.

Gender expression is explicitly separate from gender identity. Masculine and feminine expression are retained as two raw subscales rather than forcing every respondent onto one bipolar score. A convenience `expression_position` composite is also stored for comparison with the self-rated masculine-to-feminine expression axis; it is not a replacement for the two raw scores.

Romantic attraction and physical/sexual attraction remain separate and v3.2 adds a nonbinary/gender-diverse target direction to the existing male/female directions. Libido is measured separately from target-specific physical/sexual attraction, and general desire for a romantic relationship is measured separately from attraction to particular genders.

The relationship-structure construct is named `relationship_openness`, not “social intimacy”. It measures preference/acceptance for consensually negotiated non-exclusive relationship structures versus a more exclusive one-to-one preference. It does not infer current behavior, fidelity, number of partners, or relationship status.

## Baseline self-report and self-test comparison

The baseline section separately records:

- assigned sex at birth
- current gender position and optional identity labels
- sexual/physical-attraction orientation identity
- romantic-orientation identity
- gender-identity stability
- confidence in orientation identity
- stability of attraction direction
- self-rated gender-expression position
- self-rated overall physical/sexual-attraction intensity
- self-rated libido
- self-rated desire for a romantic relationship
- self-rated relationship-structure preference

Where a baseline self-rating and a questionnaire score can reasonably share a 0–100 axis, v3.2 stores both values and the absolute difference in `scores.self_test_comparison`. The mean absolute difference is a descriptive convergence statistic only. It must not be interpreted as honesty, validity, diagnostic agreement, or a reason to exclude a response.

Categorical identity labels remain separate variables. The application does not automatically convert questionnaire scores into labels such as trans, cis, gay, bi/pan, ace, aromantic, monogamous, or polyamorous.

## Item construction

Items are short, single-idea statements on a five-point agreement scale. Items from different subscales are interleaved. Broad mechanical reverse-wording remains avoided because wording reversal can add method variance and confusion. Selected semantically parallel item pairs are used only as one component of the response-quality indicator.

No MMPI, Transgender Congruence Scale, Kinsey, Klein, Sexual Desire Inventory, or other proprietary/validated instrument items are copied. Published measurement research is used to define construct boundaries and validation strategy; mf01sm uses its own wording and remains an unvalidated exploratory instrument until local validation is completed.

## Scoring

Each subscale is an unweighted mean of its 1–5 item responses mapped linearly to 0–100. Equal item weights remain intentional until enough local v3.2 data exist to justify another model empirically.

Convenience composites added in v3.2 include:

- `expression_position = 50 + (expression_fem - expression_masc) / 2`, clamped to 0–100
- `expression_balance = 100 - abs(expression_fem - expression_masc)`
- `phys_overall = max(phys_m, phys_f, phys_nb)`
- `rom_overall = max(rom_m, rom_f, rom_nb)`

`expression_position` is useful for comparing with the baseline masculine-to-feminine self-rating, but analysis should retain `expression_masc` and `expression_fem` because equal midpoint values can arise from very different profiles.

Legacy compatibility fields (`m`, `f`, `attr_m`, `attr_f`, `agender`, `ace`, `top`, `bot`, `d`, `s`, `trans`, `pan`, `validity`) remain for old tooling. New analysis should use the v3.2 subscales. In v3.2 the legacy `ace` convenience field is derived from `100 - phys_overall`; it remains a compatibility proxy and must not be treated as an asexual identity classifier.

## Response quality

The response-quality indicator remains a caution flag, not a psychological validity scale. It combines:

- two instructed-response checks
- consistency of selected semantically parallel item pairs
- unusually long identical-response runs / extreme response concentration
- unusually short average response time

The expanded item set contributes additional semantic-pair information while retaining the same multi-signal architecture. `response_quality_detail` stores attention, pair, pattern, speed, milliseconds per item, longest run, and maximum option share.

Beginning with v3.2.1, the identical-response-run thresholds scale with the number of substantive items instead of reusing the absolute 9/12/16-item thresholds from the shorter v3.1 questionnaire. The proportions are kept equivalent to the old design (about 28%, 38%, and 50% of substantive responses), and the resolved thresholds are stored in `response_quality_detail.run_thresholds`. This is an operational quality-scoring revision; questionnaire items and psychological subscale scoring are unchanged from v3.2.0.

## Raw location/IP observability

Raw browser geolocation and the `CF-Connecting-IP` value seen by the Worker remain stored for regional statistics and later human review of suspicious or duplicate-looking records.

The application deliberately does **not** automatically reject, merge, deduplicate, or exclude responses from IP/GPS similarity. Carrier networks, campus networks, household NAT/CGNAT, VPN/proxy chains, and mobile IP reassignment make automatic identity inference too error-prone. IP, GPS, timestamps, response quality, self-report variables, and item responses are evidence for later human analysis, not automatic exclusion rules.

## Storage/quota policy

D1 remains the primary archive. A successful v3.2 submission performs one D1 insert and no routine KV mirror write. KV is used only as a failure fallback. The admin endpoint remains D1-only by default; legacy/fallback KV scanning is opt-in with `include_kv=1` or used when D1 is unavailable.

Beginning with v3.2.1, the save endpoint also gates the stored version by the client-declared questionnaire version and score schema. A 3.2.1 submission must contain the v3.2 expanded schema, all 16 subscale scores, all 58 raw item answers, and response-quality metadata. A still-open older page may finish after a deployment; if it declares an older supported version, it is archived under that actual questionnaire version instead of being relabeled as the newest server version.

## Versioning and historical data

The `records` table is not rewritten. Historical rows keep their original `tag`, `scores`, IP, location, and self-report values; version corrections are limited to records that can be unambiguously identified as deployment-race mislabels from their stored schema.

- v3.1.0: initial multidimensional 34-item release
- v3.1.1: raw IP/GPS restoration and D1-primary/KV-fallback storage policy
- v3.2.0: 58-item expanded profile with gender expression, nonbinary-target attraction, libido, romantic desire, relationship openness, expanded baseline self-report, and self-test comparison metadata
- v3.2.1: same 58-item/scoring model as v3.2.0, with schema-gated version archiving and questionnaire-length-scaled long-string quality thresholds

v3.2 rows use `_schema = 'assigned-sex-v3.2-expanded-profile'`. Raw answers remain in `_answers`; comparable baseline variables are also copied to `_self_report` for analysis convenience.

## Validation plan

v3.1 and v3.2 must not be pooled as if they were the same questionnaire without explicit version handling. For genuine v3.2 data:

1. inspect response-quality flags, item distributions, floor/ceiling effects, and corrected item-rest correlations;
2. estimate omega for each hypothesized subscale, with alpha only as a secondary familiar statistic;
3. use EFA/CFA to test the expanded factor structure, especially masculine vs feminine expression, romantic vs physical attraction, libido vs attraction intensity, and romantic desire vs target-specific romantic attraction;
4. test whether male/female/nonbinary target attraction factors are empirically separable or better represented by a different model;
5. evaluate relationship-openness items for one-dimensionality before interpreting that score as a single continuum;
6. compare numeric self-ratings with matched questionnaire scores as convergent evidence, reporting distributions of signed and absolute gaps rather than treating disagreement as invalidity;
7. compare categorical self-identities with continuous questionnaire profiles descriptively and with appropriate group-size safeguards;
8. test measurement invariance / DIF across assigned-sex and gender-identity groups before comparing group means;
9. revise weak or cross-loading items in a new version rather than silently rescoring historical records.

## Research basis

The v3.2 architecture continues the v3.1 SSOGI and questionnaire-design review and additionally draws on published work showing that gender expression can be measured separately from identity and that sexual desire is multidimensional rather than interchangeable with attraction. Published sexual-desire instruments are used only as construct-level references; their item text is not copied.
