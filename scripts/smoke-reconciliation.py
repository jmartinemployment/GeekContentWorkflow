#!/usr/bin/env python3
"""Signed-in smoke: Reconciliation propose → approve → dismiss."""

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
OUT = Path("/tmp/gcw-smoke-recon")
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
    client_name = f"Recon Smoke {stamp}"
    campaign_name = f"Recon Camp {stamp}"
    keyword = f"recon-kw-{stamp}"

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

        print("2) client + campaign + research run")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.fill('input[name="name"]', client_name)
        page.click('button:has-text("Create client")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        href = page.locator("li", has_text=client_name).locator(
            'a[href*="/app/brand-core/"]'
        ).first.get_attribute("href")
        client_id = href.rstrip("/").split("/")[-1]

        page.goto(
            f"{APP}/app/strategy-map?clientId={client_id}",
            wait_until="networkidle",
        )
        page.locator(
            'form:has(button:has-text("Create campaign")) input[name="name"]'
        ).fill(campaign_name)
        page.locator(
            'form:has(button:has-text("Create campaign")) input[name="keyword"]'
        ).fill(keyword)
        page.click('button:has-text("Create campaign")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        camp_href = page.locator("li", has_text=campaign_name).locator(
            'a[href*="strategy-briefs"]'
        ).first.get_attribute("href")
        m = re.search(r"campaignId=([0-9a-fA-F-]{36})", camp_href or "")
        if not m:
            print("FAIL campaign id")
            return 1
        campaign_id = m.group(1)

        page.goto(
            f"{APP}/app/research?clientId={client_id}&campaignId={campaign_id}",
            wait_until="networkidle",
        )
        page.click('button:has-text("Start run")')
        page.wait_for_url(re.compile(r"/app/research/[0-9a-fA-F-]{36}"), timeout=45000)
        run_id = page.url.split("/app/research/")[1].split("?")[0]
        print(f"   run={run_id}")

        print("3) create proposal")
        page.goto(
            f"{APP}/app/reconciliation?clientId={client_id}&campaignId={campaign_id}&researchRunId={run_id}",
            wait_until="networkidle",
        )
        shot(page, "03-recon")
        page.fill(
            'textarea[name="proposedData"]',
            '{"name":"Recon pain","description":"d","readerSymptom":"s","costOfInaction":"c","offerTerminology":"o"}',
        )
        page.click('button:has-text("Create proposal")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        if page.locator("text=new-pain-point").count() == 0:
            print("FAIL proposal", page.inner_text("body")[:600])
            return 1
        shot(page, "04-created")

        print("4) approve")
        page.locator('li:has-text("Recon pain") button:has-text("Approve")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        shot(page, "04b-approved")
        row = page.locator('li:has-text("Recon pain")')
        if row.locator("text=/approved/i").count() == 0:
            print("FAIL approve", row.inner_text() if row.count() else page.inner_text("body")[-800:])
            return 1
        if row.locator('button:has-text("Approve")').count():
            print("FAIL approve button still present")
            return 1

        print("5) second proposal → dismiss")
        page.fill(
            'textarea[name="proposedData"]',
            '{"name":"Dismiss me","description":"d","readerSymptom":"s","costOfInaction":"c","offerTerminology":"o"}',
        )
        page.click('button:has-text("Create proposal")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.locator('li:has-text("Dismiss me") button:has-text("Dismiss")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        shot(page, "05-done")
        row2 = page.locator('li:has-text("Dismiss me")')
        if row2.locator("text=/dismissed/i").count() == 0:
            print("FAIL dismiss", row2.inner_text() if row2.count() else page.inner_text("body")[-800:])
            return 1
        if forbidden:
            print("FAIL v3", forbidden)
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
