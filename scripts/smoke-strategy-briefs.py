#!/usr/bin/env python3
"""Signed-in smoke: GCW Strategy Briefs P0 against production.

Logs into GeekOAuth via HTTP first (avoids login-page rate limit churn),
then completes one PKCE round-trip in Playwright.
"""

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
OUT = Path("/tmp/gcw-smoke")
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
    """Return Playwright-ready cookie dicts for an authenticated GeekOAuth session."""
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
        raise RuntimeError("antiforgery token missing on login page")
    token = m.group(1)

    body = urllib.parse.urlencode(
        {
            "Input.Email": email,
            "Input.Password": password,
            "__RequestVerificationToken": token,
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
            loc = resp.headers.get("Location")
    except urllib.error.HTTPError as e:
        status = e.code
        loc = e.headers.get("Location")
        if status == 429:
            raise RuntimeError("GeekOAuth login rate-limited (429). Wait ~60s and retry.") from e
        if status not in (302, 303):
            raise RuntimeError(f"login failed: {status} {e.read()[:300]!r}") from e

    print(f"   http login status={status} loc={loc}")
    if status not in (302, 303):
        raise RuntimeError(f"login failed: expected redirect, got {status}")

    cookies: list[dict] = []
    for c in jar:
        item = {
            "name": c.name,
            "value": c.value,
            "domain": (c.domain or "auth.geekatyourspot.com").lstrip("."),
            "path": c.path or "/",
            "secure": bool(c.secure) or c.name.startswith("__Host-"),
            "httpOnly": True,
        }
        if c.name.startswith("__Host-"):
            item["domain"] = "auth.geekatyourspot.com"
            item["path"] = "/"
            item["secure"] = True
        cookies.append(item)
    print(f"   cookies={[c['name'] for c in cookies]}")
    return cookies


def main() -> int:
    load_env()
    email = os.environ["GCW_TEST_EMAIL"]
    password = os.environ["GCW_TEST_PASSWORD"]
    stamp = str(int(time.time()))
    client_name = f"Smoke Client {stamp}"
    campaign_name = f"Smoke Campaign {stamp}"
    keyword = f"smoke-keyword-{stamp}"
    angle = f"Smoke angle {stamp}"

    print("0) HTTP login to GeekOAuth")
    auth_cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(auth_cookies)
        page = context.new_page()
        page.set_default_timeout(45000)

        console_errors: list[str] = []
        page.on(
            "console",
            lambda msg: console_errors.append(f"{msg.type}: {msg.text}")
            if msg.type == "error"
            else None,
        )
        token_status: dict[str, object] = {}

        def on_response(resp) -> None:
            if "/api/auth/token" in resp.url:
                token_status["status"] = resp.status
                try:
                    token_status["body"] = resp.text()[:400]
                except Exception:
                    pass

        page.on("response", on_response)

        print("1) PKCE start (already signed in at Auth)")
        page.goto(f"{APP}/api/auth/start", wait_until="domcontentloaded")
        # Authenticated authorize should bounce to callback → /app
        try:
            page.wait_for_url(APP_READY, timeout=60000)
        except PlaywrightTimeout:
            shot(page, "01-stuck")
            print("STUCK:", page.url)
            print("body:", page.inner_text("body")[:800])
            print("token:", token_status)
            print("console:", console_errors[-10:])
            # Consent?
            if page.locator("text=Consent").count() or "consent" in page.url.lower():
                for label in ("Accept", "Allow", "Yes"):
                    if page.locator(f'button:has-text("{label}")').count():
                        page.locator(f'button:has-text("{label}")').first.click()
                        break
                page.wait_for_url(APP_READY, timeout=45000)
            else:
                return 1

        page.wait_for_load_state("networkidle")
        shot(page, "02-app")
        print("   landed:", page.url, "token:", token_status)
        if not page.url.startswith(f"{APP}/app"):
            return 1

        print("2) Brand Core — create client")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        shot(page, "03-brand-core")
        page.fill('input[name="name"]', client_name)
        page.fill('textarea[name="notes"]', "GCW automated smoke client")
        page.click('button:has-text("Create client")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "04-client-created")
        if page.locator(f"text={client_name}").count() == 0:
            print("FAIL: client not listed; body=", page.inner_text("body")[:800])
            return 1

        print("3) Strategy Briefs — campaign + brief")
        page.goto(f"{APP}/app/strategy-briefs", wait_until="networkidle")
        shot(page, "05-briefs-index")

        client_select = page.locator('select[name="clientId"]')
        value = None
        for opt in client_select.locator("option").all():
            if client_name in opt.inner_text():
                value = opt.get_attribute("value")
                break
        if not value:
            print("FAIL: missing client option")
            return 1
        client_select.select_option(value)
        page.click('button:has-text("Filter")')
        page.wait_for_load_state("networkidle")

        page.locator('form:has(button:has-text("Create campaign")) input[name="name"]').fill(
            campaign_name
        )
        page.fill('input[name="keyword"]', keyword)
        page.click('button:has-text("Create campaign")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        shot(page, "06-campaign-created")

        page.fill(
            'textarea[name="audienceProfile"]',
            "Startup founders evaluating content ops",
        )
        page.select_option('select[name="buyingStage"]', "research")
        page.fill('input[name="angle"]', angle)
        page.fill('input[name="callToAction"]', "Book a workflow demo")
        page.click('button:has-text("Create brief")')
        page.wait_for_url(
            re.compile(
                r"^https://geekcontentworkflow\.geekatyourspot\.com/app/strategy-briefs/[0-9a-fA-F-]{36}"
            ),
            timeout=45000,
        )
        page.wait_for_load_state("networkidle")
        shot(page, "07-brief-detail")
        print("   brief:", page.url)

        print("4) Approve")
        page.click('button:has-text("Approve")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "08-approved")
        if "approved" not in page.content().lower():
            print("FAIL approve")
            return 1

        print("5) Return to research")
        page.click('button:has-text("Return to research")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "09-rejected")
        if "rejected" not in page.content().lower():
            print("FAIL reject")
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
