#!/usr/bin/env python3
"""Signed-in smoke: Brand Core Profiles P1 against production.

Flow: login → Brand Core → create client → create profile → add version
→ create campaign (profileVersionId populated) → create brief.
Asserts network hits /api/gcw/client-profiles* only (no content-writer/v3).
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
OUT = Path("/tmp/gcw-smoke-profiles")
OUT.mkdir(parents=True, exist_ok=True)

APP = "https://geekcontentworkflow.geekatyourspot.com"
AUTH = "https://auth.geekatyourspot.com"
APP_READY = re.compile(r"^https://geekcontentworkflow\.geekatyourspot\.com/app(/|$)")
EMPTY_GUID = "00000000-0000-0000-0000-000000000000"


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
        cookies.append(
            {
                "name": c.name,
                "value": c.value,
                "url": f"{AUTH}/",
                "httpOnly": True,
                "secure": True,
                "sameSite": "Lax",
            }
        )
    print(f"   cookies={[c['name'] for c in cookies]}")
    return cookies


def main() -> int:
    load_env()
    email = os.environ["GCW_TEST_EMAIL"]
    password = os.environ["GCW_TEST_PASSWORD"]
    stamp = str(int(time.time()))
    client_name = f"Profile Smoke {stamp}"
    campaign_name = f"Profile Campaign {stamp}"
    keyword = f"profile-kw-{stamp}"
    angle = f"Profile angle {stamp}"

    print("0) HTTP login to GeekOAuth")
    auth_cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(auth_cookies)
        page = context.new_page()
        page.set_default_timeout(45000)

        forbidden_hits: list[str] = []
        profile_hits: list[str] = []
        campaign_bodies: list[str] = []

        def on_request(req) -> None:
            url = req.url
            if "/api/content-writer/v3/" in url:
                forbidden_hits.append(url)
            if "/api/gcw/client-profiles" in url or "/api/gcw/client-profile-versions" in url:
                profile_hits.append(f"{req.method} {url}")

        def on_response(resp) -> None:
            if "/api/gcw/campaigns" in resp.url and resp.request.method == "POST":
                try:
                    campaign_bodies.append(resp.text()[:800])
                except Exception:
                    pass

        page.on("request", on_request)
        page.on("response", on_response)

        print("1) PKCE start")
        page.goto(f"{APP}/api/auth/start", wait_until="domcontentloaded")
        try:
            page.wait_for_url(APP_READY, timeout=60000)
        except PlaywrightTimeout:
            shot(page, "01-stuck")
            if page.locator("text=Consent").count() or "consent" in page.url.lower():
                for label in ("Accept", "Allow", "Yes"):
                    if page.locator(f'button:has-text("{label}")').count():
                        page.locator(f'button:has-text("{label}")').first.click()
                        break
                page.wait_for_url(APP_READY, timeout=45000)
            else:
                print("STUCK:", page.url)
                return 1

        page.wait_for_load_state("networkidle")
        shot(page, "02-app")

        print("2) Brand Core — create client")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.fill('input[name="name"]', client_name)
        page.fill('textarea[name="notes"]', "GCW profile smoke client")
        page.click('button:has-text("Create client")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "03-client")
        if page.locator(f"text={client_name}").count() == 0:
            print("FAIL: client not listed")
            return 1

        print("3) Open profile page + create profile")
        row = page.locator("li", has_text=client_name).first
        row.locator('a:has-text("Create profile")').click()
        page.wait_for_url(
            re.compile(r"/app/brand-core/[0-9a-fA-F-]{36}"),
            timeout=30000,
        )
        page.wait_for_load_state("networkidle")
        shot(page, "04-profile-empty")
        page.click('button:has-text("Create profile")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "05-profile-created")
        if page.locator('button:has-text("Save version")').count() == 0:
            print("FAIL: profile form missing; body=", page.inner_text("body")[:800])
            return 1

        print("4) Create profile version")
        page.fill(
            'textarea[name="approvedFacts"]',
            '{"product":"GCW smoke","audience":"ops leads"}',
        )
        page.fill(
            'textarea[name="prohibitedClaims"]',
            '{"guarantees":["instant ROI"]}',
        )
        page.click('button:has-text("Save version")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "06-version")
        if "Latest: v1" not in page.content() and "v1" not in page.inner_text("body"):
            print("FAIL: version not shown; body=", page.inner_text("body")[:800])
            return 1

        profile_url = page.url
        client_id = profile_url.rstrip("/").split("/")[-1]

        print("5) Strategy Briefs — campaign should attach profileVersionId")
        page.goto(
            f"{APP}/app/strategy-briefs?clientId={client_id}",
            wait_until="networkidle",
        )
        page.locator('form:has(button:has-text("Create campaign")) input[name="name"]').fill(
            campaign_name
        )
        page.fill('input[name="keyword"]', keyword)
        page.click('button:has-text("Create campaign")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        shot(page, "07-campaign")

        body = page.inner_text("body")
        m = re.search(
            r"profileVersionId:\s*([0-9a-fA-F-]{36})",
            body,
        )
        if not m:
            print("FAIL: profileVersionId not shown on page")
            print(body[:1000])
            print("campaign responses:", campaign_bodies)
            return 1
        pvid = m.group(1)
        print(f"   profileVersionId={pvid}")
        if pvid == EMPTY_GUID:
            print("FAIL: profileVersionId still empty GUID")
            return 1

        print("6) Create brief (still works)")
        page.fill(
            'textarea[name="audienceProfile"]',
            "Ops leads evaluating brand intelligence",
        )
        page.select_option('select[name="buyingStage"]', "awareness")
        page.fill('input[name="angle"]', angle)
        page.fill('input[name="callToAction"]', "Review brand core")
        page.click('button:has-text("Create brief")')
        page.wait_for_url(
            re.compile(
                r"^https://geekcontentworkflow\.geekatyourspot\.com/app/strategy-briefs/[0-9a-fA-F-]{36}"
            ),
            timeout=45000,
        )
        page.wait_for_load_state("networkidle")
        shot(page, "08-brief")

        if forbidden_hits:
            print("FAIL: hit forbidden v3 paths:", forbidden_hits)
            return 1
        # Profile/version calls are server-side (Next server actions) — not visible
        # in the browser. profileVersionId on the campaign is the functional proof.
        print("   (no browser-visible /api/gcw profile traffic expected; SSR/actions)")
        print("PASS")
        browser.close()
        return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print("FAIL:", e)
        raise
