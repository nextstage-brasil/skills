#!/usr/bin/env python3
"""Tests for lint_e2e_antipatterns.py (generic Cypress + Playwright spec antipatterns). Stdlib only.

Every finding asserts file:line + rule; every refusal asserts its reason.
"""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from qa_fixtures import run_lint
from lint_e2e_antipatterns import DEFAULT_FORBIDDEN_SELECTORS, RULES  # noqa: E402  (qa_fixtures sets sys.path)

CLEAN_CYPRESS = """describe('records', () => {
  it('saves @S-1 @AC-1', () => {
    cy.visit('/records')
    cy.get('[data-testid=save]').click()
    cy.get('@saveRequest')
    cy.wait('@saveRequest')
    cy.contains('Saved').should('be.visible')
    cy.log('cy.wait(500) and force: true inside a string are fine')
    // cy.wait(500) commented out
    /* cy.get('.legacy').click({ force: true })
       Cypress.env('x') */
    const url = 'https://example.test//double'; cy.request(url)
    cy.get('[data-testid="a>b"]').type('a > b')
    // Cypress.on('uncaught:exception', () => false) cy.get(".legacy") {"force": true}
    /* cy.on('uncaught:exception', () => false)
       cy.get('#old').click({ 'force': true }) */
  })
})
"""
CLEAN_PLAYWRIGHT = """import { test, expect } from '@playwright/test'
test('saves @S-1 @AC-1', async ({ page }) => {
  await page.goto('/records')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.locator('[data-testid=row]').first().waitFor()
  await expect(page.getByText('Saved')).toBeVisible()
})
"""


class LintTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def spec(self, name: str, text: str) -> str:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return name

    def lint(self, *args: str) -> tuple[int, dict]:
        code, payload = run_lint(["--root", str(self.root), *args])
        self.assertIn(code, (0, 2, 3), payload)
        self.assertIn("ok", payload)
        return code, payload

    def findings(self, *args: str) -> list[tuple[str, str]]:
        code, payload = self.lint(*args)
        self.assertEqual(code, 2 if payload["findings"] else 0, payload)
        return [(item["location"], item["rule"]) for item in payload["findings"]]

    def test_clean_specs_exit_0(self):
        code, payload = self.lint(self.spec("a.cy.ts", CLEAN_CYPRESS), self.spec("b.spec.ts", CLEAN_PLAYWRIGHT))
        self.assertEqual((code, payload["findings"]), (0, []), payload)
        self.assertNotIn("spec-intercept", payload["rules"])

    def test_every_rule_with_line(self):
        text = "\n".join([
            "it('x', () => {",
            "  cy.wait(500)",                                    # 2 fixed-wait
            "  cy . wait ( 2 * 1000 )",                          # 3 fixed-wait
            "  cy.get('.btn-primary').click({ force: true })",   # 4 raw-selector + force-action
            "  cy.get('#save')",                                 # 5 raw-selector
            "  cy.get('form > button')",                         # 6 raw-selector
            "  cy.get('li:nth-child(2)')",                       # 7 raw-selector
            "  cy.xpath('//button')",                            # 8 raw-selector
            "  const token = Cypress.env('token')",              # 9 cypress-env
            "  Cypress.on('uncaught:exception', () => false)",   # 10 uncaught-exception
            "})",
            "it.only('focused', () => {})",                      # 12 focused-or-skipped
            "describe.skip('skipped', () => {})",                # 13 focused-or-skipped
            "xit('x', () => {})",                                # 14 focused-or-skipped
            "cy.get('[class=\"btn\"]')",                          # 15 raw-selector
            "cy.get('[data-testid=x]').click({ \"force\": true })",   # 16 force-action (quoted key)
            "cy.get('[data-testid=y]').click({ 'force' : true })",    # 17 force-action (quoted key)
        ])
        found = self.findings(self.spec("all.cy.ts", text))
        self.assertEqual(found, [
            ("all.cy.ts:2", "fixed-wait"), ("all.cy.ts:3", "fixed-wait"), ("all.cy.ts:4", "force-action"),
            ("all.cy.ts:4", "raw-selector"), ("all.cy.ts:5", "raw-selector"), ("all.cy.ts:6", "raw-selector"),
            ("all.cy.ts:7", "raw-selector"), ("all.cy.ts:8", "raw-selector"), ("all.cy.ts:9", "cypress-env"),
            ("all.cy.ts:10", "uncaught-exception"), ("all.cy.ts:12", "focused-or-skipped"),
            ("all.cy.ts:13", "focused-or-skipped"), ("all.cy.ts:14", "focused-or-skipped"), ("all.cy.ts:15", "raw-selector"),
            ("all.cy.ts:16", "force-action"), ("all.cy.ts:17", "force-action"),
        ])

    def test_playwright_rules(self):
        text = "\n".join([
            "test('x', async ({ page }) => {",
            "  await page.waitForTimeout(1000)",            # 2
            "  await page.locator('.row').click()",        # 3
            "  await page.click('text=Save', { force: true })",  # 4
            "  await page.locator('xpath=//td')",          # 5
            "  await page.$$('div > span')",               # 6
            "})",
            "test.describe.only('focused', () => {})",     # 8
            "test.fixme('later', async () => {})",          # 9
        ])
        self.assertEqual(self.findings(self.spec("p.spec.ts", text)), [
            ("p.spec.ts:2", "fixed-wait"), ("p.spec.ts:3", "raw-selector"), ("p.spec.ts:4", "force-action"),
            ("p.spec.ts:5", "raw-selector"), ("p.spec.ts:6", "raw-selector"), ("p.spec.ts:8", "focused-or-skipped"),
            ("p.spec.ts:9", "focused-or-skipped")])

    def test_comments_and_strings_keep_line_numbers(self):
        text = "/* line 1\n line 2 cy.wait(9)\n*/\nconst s = 'a\\'b // not comment'; cy.wait(10)\n`multi\nline ${x}`\ncy.wait(3)\n"
        self.assertEqual(self.findings(self.spec("c.cy.ts", text)),
                         [("c.cy.ts:4", "fixed-wait"), ("c.cy.ts:7", "fixed-wait")])

    def test_intercepts_only_when_forbidden(self):
        text = "cy.intercept('GET', '/api')\nawait page.route('**/api', r => r.abort())\n"
        name = self.spec("i.cy.ts", text)
        self.assertEqual(self.findings(name), [])
        expected = [("i.cy.ts:1", "spec-intercept"), ("i.cy.ts:2", "spec-intercept")]
        self.assertEqual(self.findings("--forbid-spec-intercepts", name), expected)
        (self.root / ".e2e-antipatterns.json").write_text('{"version": 1, "forbid_spec_intercepts": true}', encoding="utf-8")
        self.assertEqual(self.findings(name), expected)

    def test_repo_config_overrides(self):
        name = self.spec("o.cy.ts", "cy.wait(5)\ncy.get('.a')\ncy.get('[data-qa=x]')\n")
        config = self.root / ".e2e-antipatterns.json"
        config.write_text('{"version": 1, "disable": ["fixed-wait"], "forbidden_selectors": ["\\\\[data-qa="]}',
                          encoding="utf-8")
        code, payload = self.lint(name)
        self.assertEqual([(item["location"], item["rule"]) for item in payload["findings"]], [("o.cy.ts:3", "raw-selector")])
        self.assertEqual(payload["config"], str(config))
        explicit = self.root / "other.json"
        explicit.write_text('{"version": 1}', encoding="utf-8")
        self.assertEqual(self.findings("--config", str(explicit), name), [("o.cy.ts:1", "fixed-wait"), ("o.cy.ts:2", "raw-selector")])

    def test_bad_config_exit_3(self):
        name = self.spec("a.cy.ts", CLEAN_CYPRESS)
        config = self.root / ".e2e-antipatterns.json"
        cases = {
            "[]": "config must be a JSON object",
            '{"version": 1, "extra": 1}': "config unknown key(s): extra",
            '{"version": 2}': "config version must be 1",
            '{"version": 1, "disable": ["nope"]}': "config disable: list of rule ids",
            '{"version": 1, "forbidden_selectors": ["("]}': "is not a regex",
            '{"version": 1, "forbidden_selectors": []}': "list of 1-50 regexes",
            '{"version": 1, "forbid_spec_intercepts": "yes"}': "forbid_spec_intercepts must be true or false",
            "{": "invalid JSON",
        }
        for raw, reason in cases.items():
            with self.subTest(config=raw):
                config.write_text(raw, encoding="utf-8")
                code, payload = self.lint(name)
                self.assertEqual(code, 3, payload)
                self.assertIn(reason, payload["errors"][0])
        config.unlink()
        config.symlink_to(self.root / "a.cy.ts")
        code, payload = self.lint(name)
        self.assertEqual(code, 3, payload)
        self.assertIn("symlink refused", payload["errors"][0])

    def test_paths_confined_exit_3(self):
        outside = tempfile.NamedTemporaryFile(suffix=".cy.ts", delete=False)
        outside.write(b"cy.wait(1)")
        outside.close()
        (self.root / "link.cy.ts").symlink_to(outside.name)
        (self.root / "dir").mkdir()
        (self.root / "bin.cy.ts").write_bytes(b"\xff\xfe")
        (self.root / "big.cy.ts").write_bytes(b"x" * (1024 * 1024 + 1))
        self.spec("ok.cy.ts", "x")
        cases = {
            "../escape.cy.ts": "must be a path relative to --root",
            outside.name: "must be a path relative to --root",
            "link.cy.ts": "symlink refused",
            "dir": "not a regular file",
            "missing.cy.ts": "not a regular file",
            "bin.cy.ts": "not UTF-8",
            "big.cy.ts": "larger than",
        }
        for path, reason in cases.items():
            with self.subTest(path=path):
                code, payload = self.lint(path)
                self.assertEqual(code, 3, payload)
                self.assertIn(reason, payload["errors"][0])
        code, payload = self.lint("ok.cy.ts", "ok.cy.ts")
        self.assertEqual((code, payload["errors"]), (3, ["spec listed twice"]))
        code, payload = self.lint("--", "-rf")
        self.assertEqual(code, 3, payload)
        self.assertIn("must be a path relative to --root", payload["errors"][0])
        Path(outside.name).unlink()

    def test_usage_exit_3(self):
        code, payload = run_lint(["--root", str(self.root)])
        self.assertEqual(code, 3, payload)
        self.assertIn("usage:", payload["errors"][0])
        code, payload = run_lint(["--root", str(self.root / "missing"), "a.cy.ts"])
        self.assertEqual(code, 3, payload)
        self.assertIn("not a directory", payload["errors"][0])

    def test_spec_only_rules_skip_support_files(self):
        text = "\n".join([
            "Cypress.env('token')",                         # 1 cypress-env (spec-only)
            "cy.intercept('GET', '/api')",                  # 2 spec-intercept (spec-only)
            "cy.get('.card')",                              # 3 raw-selector (spec-only)
            "it.only('x', () => {})",                       # 4 focused-or-skipped (spec-only)
            "cy.wait(500)",                                 # 5 fixed-wait (every file)
            "cy.get('[data-testid=a]').click({ force: true })",  # 6 force-action (every file)
        ])
        support = self.spec("cypress/support/commands.ts", text)
        page_object = self.spec("pages/record.page.ts", text)
        for name in (support, page_object):
            with self.subTest(file=name):
                self.assertEqual(self.findings("--forbid-spec-intercepts", name),
                                 [(f"{name}:5", "fixed-wait"), (f"{name}:6", "force-action")])
        clean = self.spec("cypress/support/env.ts", "Cypress.env('token')\ncy.intercept('/api')\ncy.get('.a')\n")
        self.assertEqual(self.findings("--forbid-spec-intercepts", clean), [])
        for spec_name in ("a.cy.ts", "a.spec.ts", "a.test.js"):
            with self.subTest(file=spec_name):
                found = self.findings("--forbid-spec-intercepts", self.spec(spec_name, text))
                self.assertEqual([rule for _loc, rule in found],
                                 ["cypress-env", "spec-intercept", "raw-selector", "focused-or-skipped", "fixed-wait",
                                  "force-action"])

    def test_false_positives_stay_clean(self):
        text = "\n".join([
            "map.fit(bounds)",                                         # not fit(
            "grid.fdescribe(1)",                                       # not fdescribe(
            "await page.locator('[data-testid=a] >> [data-testid=b]').click()",   # Playwright >> chain
            "cy.task('seed', { force: true })",                        # force outside an action call
            "cy.get('[data-testid=row] [data-testid=cell]').click()",  # attribute descendant
            "await page.locator('text=Save changes').click()",         # text engine keeps its spaces
            "cy.get('[data-testid=\"a b\"]')",
            "cy.get('@alias')",
        ])
        self.assertEqual(self.findings(self.spec("fp.cy.ts", text)), [])

    def test_false_negatives_are_findings(self):
        text = "\n".join([
            "cy.get(\"div.card\")",                    # 1 compound class
            "cy.get('ul li')",                        # 2 descendant combinator
            "cy.get('span:first')",                   # 3 jQuery pseudo
            "cy.get('[data-testid=x] button')",       # 4 bare tag below an attribute
            "await page.locator('a >> .b')",          # 5 class in a >> chain
            "fit('x', () => {})",                     # 6 focused
            "cy.get('[data-testid=ok]').check({ force: true })",   # 7 force on an action call
            "cy.get('li:first-child')",               # 8
        ])
        self.assertEqual(self.findings(self.spec("fn.cy.ts", text)), [
            ("fn.cy.ts:1", "raw-selector"), ("fn.cy.ts:2", "raw-selector"), ("fn.cy.ts:3", "raw-selector"),
            ("fn.cy.ts:4", "raw-selector"), ("fn.cy.ts:5", "raw-selector"), ("fn.cy.ts:6", "focused-or-skipped"),
            ("fn.cy.ts:7", "force-action"), ("fn.cy.ts:8", "raw-selector")])

    def test_unterminated_string_keeps_lines(self):
        text = "const s = 'never closed\ncy.wait(5)\nconst t = \"also open\ncy.wait(6)\n"
        self.assertEqual(self.findings(self.spec("u.cy.ts", text)),
                         [("u.cy.ts:2", "fixed-wait"), ("u.cy.ts:4", "fixed-wait")])

    def test_rule_table_and_defaults(self):
        self.assertEqual(len(RULES), 7)
        self.assertTrue(DEFAULT_FORBIDDEN_SELECTORS)


if __name__ == "__main__":
    unittest.main()
