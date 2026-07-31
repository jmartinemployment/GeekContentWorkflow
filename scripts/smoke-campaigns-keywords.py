#!/usr/bin/env python3
"""Signed-in smoke: Campaigns & Keywords on Strategy Map against production."""

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
OUT = Path("/tmp/gcw-smoke-keywords")
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
    except urllib.error.HTTPError as e:
        status = e.code
        if status == 429:
            raise RuntimeError("GeekOAuth login rate-limited (429)") from e
        if status not in (302, 303):
            raise RuntimeError(f"login failed: {status}") from e

    if status not in (302, 303):
        raise RuntimeError(f"login failed: expected redirect, got {status}")

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
    client_name = f"KW Smoke {stamp}"
    keyword = f"keyword-smoke-{stamp}"
    angle = f"KW angle {stamp}"

    print("0) HTTP login")
    auth_cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(auth_cookies)
        page = context.new_page()
        page.set_default_timeout(45000)

        forbidden: list[str] = []
        page.on(
            "request",
            lambda req: forbidden.append(req.url)
            if "/api/content-writer/v3/" in req.url
            else None,
        )

        print("1) PKCE")
        page.goto(f"{APP}/api/auth/start", wait_until="domcontentloaded")
        try:
            page.wait_for_url(APP_READY, timeout=60000)
        except PlaywrightTimeout:
            shot(page, "01-stuck")
            print("STUCK", page.url)
            return 1

        print("2) Brand Core — client")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.fill('input[name="name"]', client_name)
        page.click('button:has-text("Create client")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        if page.locator(f"text={client_name}").count() == 0:
            print("FAIL client")
            return 1

        # resolve client id from Create profile link
        href = page.locator("li", has_text=client_name).locator(
            'a[href*="/app/brand-core/"]'
        ).first.get_attribute("href")
        if not href:
            print("FAIL no profile link")
            return 1
        client_id = href.rstrip("/").split("/")[-1]
        print(f"   client_id={client_id}")

        print("3) Strategy Map — add keyword")
        page.goto(
            f"{APP}/app/strategy-map?clientId={client_id}",
            wait_until="networkidle",
        )
        shot(page, "03-map")
        page.locator(
            'form:has(button:has-text("Add to queue")) input[name="keyword"]'
        ).fill(keyword)
        page.click('button:has-text("Add to queue")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "04-keyword")
        if page.locator(f"text={keyword}").count() == 0:
            print("FAIL keyword not listed", page.inner_text("body")[:600])
            return 1

        print("4) Create campaign from keyword")
        row = page.locator("li", has_text=keyword).first
        row.locator('button:has-text("Create campaign")').click()
        page.wait_for_url(
            re.compile(r"/app/strategy-briefs\?.*campaignId="),
            timeout=45000,
        )
        page.wait_for_load_state("networkidle")
        shot(page, "05-briefs")

        print("5) Create brief")
        page.fill(
            'textarea[name="audienceProfile"]',
            "Ops leads evaluating keyword strategy",
        )
        page.select_option('select[name="buyingStage"]', "research")
        page.fill('input[name="angle"]', angle)
        page.fill('input[name="callToAction"]', "Open strategy map")
        page.click('button:has-text("Create brief")')
        page.wait_for_url(
            re.compile(r"/app/strategy-briefs/[0-9a-fA-F-]{36}"),
            timeout=45000,
        )
        shot(page, "06-brief")

        print("6) Keyword marked briefed")
        page.goto(
            f"{APP}/app/strategy-map?clientId={client_id}",
            wait_until="networkidle",
        )
        body = page.inner_text("body")
        if keyword not in body or "briefed" not in body:
            print("FAIL keyword not briefed", body[:800])
            return 1
        shot(page, "07-briefed")

        if forbidden:
            print("FAIL v3 hits", forbidden)
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
