#!/usr/bin/env python3
"""Signed-in smoke: generate pillar → repurpose into companion channel pack."""

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
OUT = Path("/tmp/gcw-smoke-repurpose")
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
    client_name = f"Repurpose Smoke {stamp}"
    campaign_name = f"Repurpose Camp {stamp}"
    keyword = f"repurpose-kw-{stamp}"
    angle = f"Repurpose angle {stamp}"

    print("0) login")
    cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(cookies)
        page = context.new_page()
        page.set_default_timeout(240000)

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

        print("2) brief + generate pillar")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.locator('form:has(button:has-text("Create workspace")) input[name="name"]').fill(
            f"Repurpose WS {stamp}"
        )
        page.click('button:has-text("Create workspace")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        page.locator('form:has(button:has-text("Create client")) input[name="name"]').first.fill(
            client_name
        )
        page.locator(
            'form:has(button:has-text("Create client")) button:has-text("Create client")'
        ).first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(800)
        href = page.locator("li", has_text=client_name).locator(
            'a[href*="/app/brand-core/"]'
        ).first.get_attribute("href")
        client_id = (href or "").rstrip("/").split("/")[-1]

        page.goto(
            f"{APP}/app/strategy-briefs?clientId={client_id}",
            wait_until="networkidle",
        )
        page.locator(
            'form:has(button:has-text("Create campaign")) input[name="name"]'
        ).fill(campaign_name)
        page.fill('input[name="keyword"]', keyword)
        page.click('button:has-text("Create campaign")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        page.fill('textarea[name="audienceProfile"]', "Repurpose smoke audience")
        page.select_option('select[name="buyingStage"]', "awareness")
        page.fill('input[name="angle"]', angle)
        page.fill('input[name="callToAction"]', "Try repurpose")
        page.click('button:has-text("Create brief")')
        page.wait_for_url(re.compile(r"/app/strategy-briefs/[0-9a-fA-F-]{36}"), timeout=45000)
        page.wait_for_load_state("networkidle")

        gen = page.locator('form:has(button:has-text("Generate draft"))')
        checkbox = gen.locator('input[name="createNew"]')
        if checkbox.count() and not checkbox.is_checked():
            checkbox.check()
        gen.locator('button:has-text("Generate draft")').click()
        page.wait_for_url(re.compile(r"/app/assets/[0-9a-fA-F-]{36}"), timeout=180000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        shot(page, "01-pillar")

        print("3) repurpose (subset: linkedin + x)")
        form = page.locator('form:has(button:has-text("Generate channel pack"))')
        if form.count() == 0:
            print("FAIL repurpose form missing")
            print(page.inner_text("body")[:1200])
            shot(page, "repurpose-missing")
            return 1
        form.locator('input[name="channels"][value="linkedin"]').check()
        form.locator('input[name="channels"][value="x"]').check()
        form.locator('button:has-text("Generate channel pack")').click()

        try:
            page.wait_for_url(re.compile(r"/app/assets\?.*repurposed="), timeout=240000)
        except PlaywrightTimeout:
            if "error=" in page.url:
                print("FAIL repurpose error", page.url)
                shot(page, "repurpose-error")
                return 1
            print("FAIL wait for assets redirect", page.url)
            shot(page, "repurpose-timeout")
            return 1

        page.wait_for_load_state("networkidle")
        shot(page, "02-pack")
        body = page.inner_text("body")
        m = re.search(r"Created (\d+) companion", body)
        if not m:
            print("FAIL no created banner", body[:800])
            return 1
        count = int(m.group(1))
        if count < 2:
            print(f"FAIL expected ≥2 companions, got {count}")
            return 1
        # companions should appear in list
        if "LinkedIn" not in body and "linkedin" not in body.lower() and "X ·" not in body:
            # names include channel labels
            if "companion" not in body.lower() and count < 2:
                print("FAIL companions not listed")
                return 1
        print(f"   created {count} companions")

        if forbidden:
            print("FAIL content-writer/v3 calls:", forbidden[:3])
            return 1

        print("PASS smoke-repurpose")
        browser.close()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
