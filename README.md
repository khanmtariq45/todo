const rawControlMeasures = this.raFormGroup?.controls?.raHazardDetailsForm['controls'].controlMeasures.value;
hazardDetails['controlMeasures'] = rawControlMeasures
  ?.replace(/[\x00-\x1F\x7F-\x9F\uFEFF\u200B-\u200D\u2060]/g, '') // Remove control chars, BOM, and other zero-width chars
  .trim();