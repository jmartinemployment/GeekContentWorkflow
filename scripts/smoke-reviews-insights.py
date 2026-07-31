#!/usr/bin/env python3
"""Signed-in smoke: Reviews queue + Insights recommendations."""

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
OUT = Path("/tmp/gcw-smoke-reviews-insights")
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
    client_name = f"Rev Smoke {stamp}"
    campaign_name = f"Rev Camp {stamp}"
    keyword = f"rev-kw-{stamp}"
    asset_name = f"Rev Asset {stamp}"
    comment_text = f"Review note {stamp}"

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

        print("2) workspace + client")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        ws_form = page.locator('form:has(button:has-text("Create workspace"))')
        ws_form.locator('input[name="name"]').fill(f"Rev WS {stamp}")
        ws_form.locator('button:has-text("Create workspace")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        client_form = page.locator('form:has(button:has-text("Create client"))').first
        client_form.locator('input[name="name"]').fill(client_name)
        client_form.locator('button:has-text("Create client")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        href = page.locator("li", has_text=client_name).locator(
            'a[href*="/app/brand-core/"]'
        ).first.get_attribute("href")
        client_id = (href or "").rstrip("/").split("/")[-1]
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", client_id or ""):
            print("FAIL client id", client_id)
            return 1

        print("3) campaign + asset + comment")
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
            "a"
        ).first.get_attribute("href")
        m = re.search(r"campaignId=([0-9a-fA-F-]{36})", camp_href or "")
        if not m:
            print("FAIL campaign", page.inner_text("body")[:800])
            return 1
        campaign_id = m.group(1)

        page.goto(
            f"{APP}/app/assets?clientId={client_id}&campaignId={campaign_id}",
            wait_until="networkidle",
        )
        page.fill('input[name="name"]', asset_name)
        page.click('button:has-text("Create asset")')
        page.wait_for_url(re.compile(r"/app/assets/[0-9a-fA-F-]{36}"), timeout=45000)
        page.wait_for_load_state("networkidle")
        page.click('button:has-text("Save version")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        page.fill('textarea[name="content"]', comment_text)
        page.click('button:has-text("Add comment")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        shot(page, "01-comment")

        print("4) reviews queue")
        page.goto(
            f"{APP}/app/reviews?clientId={client_id}",
            wait_until="networkidle",
        )
        shot(page, "02-reviews")
        body = page.inner_text("body")
        if comment_text not in body:
            print("FAIL comment missing on reviews")
            print(body[:1200])
            return 1
        page.fill('input[name="resolution"]', "Fixed in smoke")
        page.click('button:has-text("Resolve")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)

        print("5) insights")
        page.goto(
            f"{APP}/app/insights?clientId={client_id}",
            wait_until="networkidle",
        )
        shot(page, "03-insights")
        body = page.inner_text("body")
        if "Insights" not in body:
            print("FAIL insights heading")
            return 1
        if "Take action" not in body and "Pipeline looks clear" not in body:
            print("FAIL no insight cards")
            print(body[:1000])
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
