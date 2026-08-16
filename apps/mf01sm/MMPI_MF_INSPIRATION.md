# MMPI Mf domain inspiration for mf01sm v3.6

v3.6 uses the public repository `MMPI-CHN/MMPI-CHN.github.io` only as a **domain-level inspiration source** for part of the nonsexual gender-coded style section.

The referenced repository's `origin_js/my_data.js` header explicitly notes that the MMPI item content is presumably copyrighted by the University of Minnesota / Pearson and that the legality of redistributing it may be questionable. Therefore mf01sm does **not** copy MMPI item text, scoring keys, T-score tables, norms, or interpretations.

Instead, nine v3.6 items are newly written Chinese prompts inspired by broad interest domains that appear in the historical Mf material, including:

- mechanical repair / understanding how devices work
- science and engineering curiosity
- outdoor building / repair / hands-on projects
- preference for functional, durable objects
- poetry / narrative / affective literature
- plants / flowers / gardening
- cooking and hosting
- theatre / singing / performance
- journaling / photos / keepsakes

These items are marked in the rendered questionnaire object as `inspiration: 'MMPI-Mf-domain-paraphrase'` for auditability.

They feed the project's two **independent** experimental scores `gender_style_masc` and `gender_style_fem`. A respondent can be high on both, low on both, or asymmetric. The public masculine↔feminine position is only a visualization derived from those two scores.

The scale is not MMPI, is not normed as MMPI, and must not be described as having MMPI reliability, validity, diagnostic interpretation, or University of Minnesota / Pearson endorsement. The labels are historical/cultural gender coding, not a determination of gender identity.
