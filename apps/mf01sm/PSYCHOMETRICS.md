# mf01sm v3.1 measurement notes

mf01sm is an exploratory self-report questionnaire, not a clinical diagnostic instrument. Version 3.1 deliberately keeps continuous scores primary and uses direction labels only as cautious summaries when differences are large enough to be interpretable.

## Constructs

The scored items are split into nine subscales:

- assigned-sex-aligned gender direction
- cross-assigned gender direction
- nonbinary fit
- romantic attraction to men
- romantic attraction to women
- physical/sexual attraction to men
- physical/sexual attraction to women
- interpersonal initiative
- decision autonomy

Sex assigned at birth (AMAB/AFAB) is collected separately from current gender identity. It is used only to translate male/female direction scores into “same-assigned-sex” and “other-assigned-sex” wording and for legacy compatibility fields. It does not determine the respondent's gender identity or orientation label.

Romantic attraction and physical/sexual attraction are intentionally separate. Current SSOGI measurement literature treats sexual orientation as multidimensional (commonly identity, attraction, and behavior), and the literature reviewed for v3.1 also documents measures that distinguish sexual, romantic, emotional, or social attraction. The respondent's orientation identity therefore remains a self-report variable rather than a score-derived label.

## Item construction

Items are short, single-idea statements on a five-point agreement scale. Items from different subscales are interleaved. Version 3.1 removes the broad reverse-keying used in v3.0 because reverse/negated items can introduce wording-method variance, confusion, and artificial factor structure. A smaller set of semantically parallel items is used for response-consistency checks without reversing the scoring direction.

No MMPI, Transgender Congruence Scale, Kinsey, Klein, or other proprietary/validated scale items are copied. Those instruments and the psychometric literature are used only to inform measurement architecture and validation strategy.

## Scoring

Each subscale is currently an unweighted mean of its items, linearly mapped from 1–5 to 0–100. Equal item weights are intentional until enough local v3.1 data exist to justify a different model empirically.

The result screen uses exploratory thresholds only to summarize strong patterns. These thresholds are not population norms, clinical cutoffs, or validated classification rules. Raw continuous subscale scores are always retained in `scores`.

Legacy fields (`m`, `f`, `attr_m`, `attr_f`, `agender`, `ace`, `top`, `bot`, `d`, `s`, `trans`, `pan`, `validity`) remain compatibility composites for old admin/statistical tooling. New code should prefer the v3.1 subscales.

## Response quality

The response-quality indicator is a caution flag, not a psychological validity scale. It combines several weak signals rather than relying on one attention check:

- two instructed-response checks
- consistency of closely matched semantic item pairs
- unusually long identical-response runs / extreme response concentration
- unusually short average response time

A low response-quality score lowers confidence in interpretation; it does not diagnose deception, malingering, or any psychological state. The complete `response_quality_detail` object is stored with each v3.1 response so later human data cleaning can inspect the component signals instead of relying only on the composite score.

## Raw location/IP observability

Beginning with v3.1.1, the questionnaire again requests browser geolocation and stores the raw latitude/longitude string together with the original `CF-Connecting-IP` value seen by the Worker. These fields exist for regional statistics and later human review of suspicious or duplicate-looking records.

The application deliberately does **not** automatically reject, merge, deduplicate, or exclude responses from IP/GPS similarity. Chinese carrier networks, campus networks, household NAT/CGNAT, VPN/proxy chains, and changing mobile IP allocation make automatic identity inference too error-prone. IP, GPS, response quality, timestamps, and questionnaire content are raw evidence for later analysis, not automatic exclusion rules.

## Storage/quota policy

D1 is the primary archive for new responses. A normal successful submission performs one D1 insert and does not also mirror the same record into KV. KV remains a fallback only when the D1 write fails, preserving resilience while avoiding a routine second write for every response.

The admin data endpoint reads D1 by default. Historical/fallback KV scanning is opt-in with `include_kv=1`, or used automatically if D1 is unavailable. This preserves the old KV data while avoiding a KV list plus many KV reads every time the admin console opens.

## Versioning and historical data

The `records` table is not rewritten. Historical v2/v3 rows keep their original `version`, `tag`, `scores`, IP and location fields. The initial v3.1 release wrote `version = 3.1.0`; the restored raw-observability/storage-policy revision writes `version = 3.1.1`. Raw item responses, response-quality details and scoring metadata remain inside the existing JSON `scores` field. This permits later psychometric re-analysis without retroactively changing previous results.

## Validation plan

After enough genuine v3.1 responses accumulate, validation should proceed before tightening thresholds or claiming reliability:

1. inspect missingness, response-quality flags, item distributions, floor/ceiling effects, and item-rest correlations;
2. estimate internal consistency with omega (and alpha only as a familiar secondary statistic), using the hypothesized subscales rather than one global score;
3. examine the factor structure with EFA/CFA and explicitly test whether romantic and physical/sexual attraction remain separable;
4. test measurement invariance / differential item functioning across relevant groups, especially AMAB/AFAB and gender-identity groups, before comparing group means;
5. compare questionnaire scores with the separate self-report identity items for convergent/discriminant evidence without treating disagreement as respondent error;
6. revise or remove weak/cross-loading items and increment the questionnaire version rather than silently changing scoring for old records.

## Research basis reviewed for v3.1

- *Sex, Sexual Orientation, and Gender Identity Measurement in Health Research: A Systematic Review and Narrative Synthesis* (2025).
- Tordoff et al., *Comparing Two-Step Approaches to Measuring Gender Identity* (American Journal of Epidemiology, 2025).
- *Psychological, psychiatric, and behavioral sciences measurement scales: best practice guidelines for their development and validation* (2025).
- van Sonderen et al., *Ineffectiveness of Reverse Wording of Questionnaire Items* (2013), plus later wording-effect research.
- validation studies of the Transgender Congruence Scale, including Chinese-language and cross-group factor-structure work.
- careless-response research comparing instructed-response items with consistency, long-string, and response-time indicators.
