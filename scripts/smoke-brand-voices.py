#!/usr/bin/env python3
"""Signed-in smoke: Brand voice create + link on Brand Core profile version."""

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
OUT = Path("/tmp/gcw-smoke-brand-voices")
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
    client_name = f"Voice Smoke {stamp}"
    voice_name = f"Voice {stamp}"
    tone = "plain-spoken"

    print("0) login")
    cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(cookies)
        page = context.new_page()
        page.set_default_timeout(45000)

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

        print("2) client + profile + version")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.fill('input[name="name"]', client_name)
        page.click('button:has-text("Create client")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)

        row = page.locator("li", has_text=client_name).first
        if row.locator('a:has-text("Create profile")').count():
            row.locator('a:has-text("Create profile")').click()
        else:
            row.locator('a[href*="/app/brand-core/"]').first.click()
        page.wait_for_url(
            re.compile(r"/app/brand-core/[0-9a-fA-F-]{36}"),
            timeout=30000,
        )
        page.wait_for_load_state("networkidle")

        if page.locator('button:has-text("Create profile")').count():
            page.click('button:has-text("Create profile")')
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(1200)

        page.fill(
            'textarea[name="approvedFacts"]',
            '{"product":"GCW voice smoke"}',
        )
        page.fill(
            'textarea[name="prohibitedClaims"]',
            '{"guarantees":["magic"]}',
        )
        page.click('button:has-text("Save version")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "01-version")

        print("3) create & link brand voice")
        if page.locator('button:has-text("Create & link")').count() == 0:
            print("FAIL: brand voice form missing")
            shot(page, "no-voice-form")
            print(page.inner_text("body")[:1000])
            return 1

        form = page.locator('form:has(button:has-text("Create & link"))')
        form.locator('input[name="name"]').fill(voice_name)
        form.locator('input[name="tone"]').fill(tone)
        form.locator('input[name="description"]').fill("Smoke voice")
        form.locator('textarea[name="sampleText"]').fill(
            "We write clear, concrete marketing copy."
        )
        form.locator('button:has-text("Create & link")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        shot(page, "02-linked")

        body = page.inner_text("body")
        if voice_name not in body:
            print("FAIL: voice name not shown after link")
            print(body[:1200])
            return 1
        if tone not in body:
            print("FAIL: tone not shown")
            return 1

        if forbidden:
            print("FAIL: hit v3 paths:", forbidden)
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
