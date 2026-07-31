#!/usr/bin/env python3
"""Signed-in smoke: generate with template + tone presets."""

from __future__ import annotations

import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import http.cookiejar
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env.local"
OUT = Path("/tmp/gcw-smoke-templates-tones")
OUT.mkdir(parents=True, exist_ok=True)

APP = "https://geekcontentworkflow.geekatyourspot.com"
AUTH = "https://auth.geekatyourspot.com"
APP_READY = re.compile(r"^https://geekcontentworkflow\.geekatyourspot\.com/app(/|$)")


def load_env() -> None:
    if not ENV.exists():
        raise SystemExit(f"Missing {ENV}")
    for line in ENV.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def shot(page, name: str) -> None:
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
    print(f"   shot {name}: {page.url}")


def login_via_http(email: str, password: str) -> list[dict]:
    jar = http.cookiejar.CookieJar()

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
            return None

    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        NoRedirect,
    )
    with opener.open(f"{AUTH}/Account/Login", timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    m = re.search(
        r'name="__RequestVerificationToken"[^>]*value="([^"]+)"',
        html,
    ) or re.search(
        r'value="([^"]+)"[^>]*name="__RequestVerificationToken"',
        html,
    )
    if not m:
        raise RuntimeError("antiforgery missing")
    body = urllib.parse.urlencode(
        {
            "Input.Email": email,
            "Input.Password": password,
            "__RequestVerificationToken": m.group(1),
            "Input.RememberMe": "true",
        }
    ).encode()
    req = urllib.request.Request(
        f"{AUTH}/Account/Login",
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with opener.open(req, timeout=30) as resp:
            status = getattr(resp, "status", 200)
    except urllib.error.HTTPError as e:
        status = e.code
        if status == 429:
            raise RuntimeError("rate limited") from e
        if status not in (302, 303):
            raise RuntimeError(f"login {status}") from e
    if status not in (302, 303):
        raise RuntimeError(f"login {status}")
    return [
        {
            "name": c.name,
            "value": c.value,
            "url": f"{AUTH}/",
            "httpOnly": True,
            "secure": True,
            "sameSite": "Lax",
        }
        for c in jar
    ]


def main() -> int:
    load_env()
    email = os.environ["GCW_TEST_EMAIL"]
    password = os.environ["GCW_TEST_PASSWORD"]
    stamp = str(int(time.time()))

    print("0) login")
    cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(cookies)
        page = context.new_page()
        page.set_default_timeout(180000)

        forbidden: list[str] = []
        page.on(
            "request",
            lambda r: forbidden.append(r.url)
            if "/api/content-writer/v3/" in r.url
            else None,
        )

        print("1) PKCE")
        page.goto(f"{APP}/api/auth/start", wait_until="domcontentloaded")
        try:
            page.wait_for_url(APP_READY, timeout=60000)
        except PlaywrightTimeout:
            shot(page, "stuck")
            return 1

        print("2) workspace client + brief")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.locator('form:has(button:has-text("Create workspace")) input[name="name"]').fill(
            f"Tpl WS {stamp}"
        )
        page.click('button:has-text("Create workspace")')
        try:
            page.wait_for_url(re.compile(r"workspaceId="), timeout=45000)
        except PlaywrightTimeout:
            shot(page, "no-workspace")
            print("FAIL no workspaceId redirect")
            print(page.inner_text("body")[:800])
            return 1
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        if page.locator("text=Clients in").count() == 0:
            shot(page, "no-clients-section")
            print("FAIL workspace clients section missing")
            print(page.inner_text("body")[:800])
            return 1

        client_form = page.locator('form:has(button:has-text("Create client"))').first
        client_form.locator('input[name="name"]').fill(f"Tpl Client {stamp}")
        client_form.locator('button:has-text("Create client")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "01-client")
        row = page.locator("li", has_text=f"Tpl Client {stamp}").first
        try:
            row.wait_for(timeout=30000)
        except PlaywrightTimeout:
            print("FAIL client not listed")
            print(page.inner_text("body")[:1200])
            return 1
        href = row.locator('a[href*="/app/brand-core/"]').first.get_attribute("href")
        client_id = (href or "").rstrip("/").split("/")[-1]
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", client_id or ""):
            print("FAIL client id", client_id, href)
            return 1

        page.goto(
            f"{APP}/app/strategy-briefs?clientId={client_id}",
            wait_until="networkidle",
        )
        page.locator(
            'form:has(button:has-text("Create campaign")) input[name="name"]'
        ).fill(f"Tpl Camp {stamp}")
        page.fill('input[name="keyword"]', f"tpl-kw-{stamp}")
        page.click('button:has-text("Create campaign")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        page.fill('textarea[name="audienceProfile"]', "Template smoke audience")
        page.select_option('select[name="buyingStage"]', "decision")
        page.fill('input[name="angle"]', f"Tpl angle {stamp}")
        page.fill('input[name="callToAction"]', "Start a pilot")
        page.click('button:has-text("Create brief")')
        page.wait_for_url(re.compile(r"/app/strategy-briefs/[0-9a-fA-F-]{36}"), timeout=45000)
        page.wait_for_load_state("networkidle")
        shot(page, "01-brief")

        gen = page.locator('form:has(button:has-text("Generate draft"))')
        if gen.locator('select[name="templateSlug"]').count() == 0:
            print("FAIL template select missing")
            return 1
        if gen.locator('select[name="tone"]').count() == 0:
            print("FAIL tone select missing")
            return 1
        gen.locator('select[name="templateSlug"]').select_option("case-study")
        gen.locator('select[name="tone"]').select_option("punchy")
        checkbox = gen.locator('input[name="createNew"]')
        if checkbox.count() and not checkbox.is_checked():
            checkbox.check()

        print("3) generate with case-study + punchy")
        gen.locator('button:has-text("Generate draft")').click()
        page.wait_for_url(re.compile(r"/app/assets/[0-9a-fA-F-]{36}"), timeout=180000)
        page.wait_for_load_state("networkidle")
        shot(page, "02-generated")
        body = page.inner_text("body")
        if "Versions" not in body and "v1" not in body:
            print("FAIL no version")
            print(body[:800])
            return 1

        if forbidden:
            print("FAIL v3:", forbidden)
            return 1

        print("PASS")
        browser.close()
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print("FAIL:", e)
        raise
