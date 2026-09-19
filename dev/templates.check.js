/**
 * Dependency-free guard for the template sanitiser.
 *
 * The rule it locks down: `statements` rows are purged after 12 h, but
 * `form_templates` rows live forever, so a template is the one place in this
 * application where free text can outlive the retention window. Nothing
 * patient-identifying may ever reach it.
 *
 * Run with:  npm run test:templates
 */
const assert = require('assert');
const path = require('path');

const t = require(path.join(__dirname, '..', '.test-build', 'templates.js'));

// Derived, not hardcoded: a form added later is covered without touching this
// file, which is the point — the PII guarantee has to hold for every form.
const { FORMS } = require(path.join(__dirname, '..', '.test-build', 'form-definitions.js'));
const FORM_IDS = FORMS.map((f) => f.id);
assert.ok(FORM_IDS.length > 0, 'no forms found — the whole suite would pass vacuously');

let pass = 0;
const failures = [];
const check = (name, fn) => {
  try {
    fn();
    pass++;
  } catch (e) {
    failures.push(`${name} :: ${e.message}`);
  }
};

const dirty = {
  patient_name: 'Anna Ozola',
  patient_birth_year: 1987,
  visit_date: '2026-09-19',
  personas_kods: '010187-12345',
  not_a_real_field_xyz: 'injected',
};

for (const formId of FORM_IDS) {
  check(`${formId}: no patient data survives sanitize`, () => {
    const out = t.sanitizeTemplateData(formId, dirty);
    for (const k of ['patient_name', 'patient_birth_year', 'visit_date', 'personas_kods']) {
      assert.ok(!(k in out), `${k} leaked into a permanent template row`);
    }
  });

  check(`${formId}: every field flagged sensitive is excluded`, () => {
    const out = t.sanitizeTemplateData(formId, dirty);
    const flagged = t.formFields(formId).filter((f) => f.sensitive === true);
    for (const f of flagged) {
      assert.ok(!(f.id in out), `sensitive field ${f.id} stored in a template`);
    }
  });

  check(`${formId}: keys unknown to the form definition are dropped`, () => {
    assert.ok(!('not_a_real_field_xyz' in t.sanitizeTemplateData(formId, dirty)));
  });

  check(`${formId}: covers every templatable field, empties included`, () => {
    const ids = t.templatableFieldIds(formId).map((f) => f.id);
    const out = t.sanitizeTemplateData(formId, {});
    assert.strictEqual(Object.keys(out).length, ids.length);
    for (const id of ids) assert.ok(id in out, `${id} missing — apply would not be a true replace`);
  });

  check(`${formId}: calculated fields are never stored`, () => {
    const out = t.sanitizeTemplateData(formId, {});
    for (const f of t.formFields(formId)) {
      if (f.type === 'calculated') assert.ok(!(f.id in out), `calculated ${f.id} stored`);
    }
  });

  check(`${formId}: empty booleans store false, everything else ''`, () => {
    const out = t.sanitizeTemplateData(formId, {});
    for (const f of t.templatableFieldIds(formId)) {
      assert.strictEqual(out[f.id], f.type === 'boolean' ? false : '', f.id);
    }
  });

  check(`${formId}: apply never writes or clears patient data in a live form`, () => {
    const vals = t.applicableTemplateValues(formId, dirty);
    const keys = ['patient_name', 'patient_birth_year', 'visit_date', 'personas_kods',
                  'not_a_real_field_xyz'];
    for (const k of keys) {
      assert.ok(!(k in vals), `${k} would be written into a live form`);
    }
  });
}

check('at least one form actually declares a sensitive field', () => {
  const flagged = FORM_IDS.flatMap((id) => t.formFields(id).filter((f) => f.sensitive === true));
  assert.ok(flagged.length > 0, 'no sensitive fields found — the exclusion check is vacuous');
  assert.ok(
    flagged.some((f) => f.id === 'personas_kods'),
    'personas_kods is no longer flagged sensitive'
  );
});

check('slotCode zero-pads', () => {
  assert.strictEqual(t.slotCode(1), 'T01');
  assert.strictEqual(t.slotCode(12), 'T12');
});

check('normalizeLabel trims, caps at 24, empty becomes null', () => {
  assert.strictEqual(t.normalizeLabel('  Norma  '), 'Norma');
  assert.strictEqual(t.normalizeLabel('   '), null);
  assert.strictEqual(t.normalizeLabel(null), null);
  assert.strictEqual(t.normalizeLabel('x'.repeat(40)).length, 24);
});

check('an unknown form yields an empty template rather than passing data through', () => {
  assert.deepStrictEqual(t.sanitizeTemplateData('F999', dirty), {});
});

check('round trip: a real value saved into a template comes back out on apply', () => {
  const ids = t.templatableFieldIds('F001').map((f) => f.id);
  const filled = { ...t.sanitizeTemplateData('F001', {}), [ids[0]]: 'ABC' };
  const applied = t.applicableTemplateValues('F001', t.sanitizeTemplateData('F001', filled));
  assert.strictEqual(applied[ids[0]], 'ABC');
});

if (failures.length) {
  console.error(`\n${failures.length} FAILED:\n` + failures.map((f) => '  ' + f).join('\n'));
  process.exit(1);
}
console.log(`templates: ${pass} checks passed`);
