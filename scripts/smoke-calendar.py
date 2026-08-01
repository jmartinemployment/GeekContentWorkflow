#!/usr/bin/env python3
"""Signed-in smoke: companion + version → fill week → see post copy + Copy post."""

from __future__ import annotations

import json
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
OUT = Path("/tmp/gcw-smoke-calendar")
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
    client_name = f"Calendar Smoke {stamp}"
    campaign_name = f"Calendar Camp {stamp}"
    asset_name = f"LinkedIn · Queue smoke {stamp}"
    marker = f"QUEUE_SMOKE_BODY_{stamp}"

    print("0) login")
    cookies = login_via_http(email, password)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        context.add_cookies(cookies)
        page = context.new_page()
        page.set_default_timeout(120000)

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

        print("2) workspace + client + campaign")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.locator('form:has(button:has-text("Create workspace")) input[name="name"]').fill(
            f"Calendar WS {stamp}"
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
        page.fill('input[name="keyword"]', f"calendar-kw-{stamp}")
        page.click('button:has-text("Create campaign")')
        page.wait_for_url(re.compile(r"campaignId="), timeout=45000)
        page.wait_for_load_state("networkidle")
        campaign_id = urllib.parse.parse_qs(
            urllib.parse.urlparse(page.url).query
        ).get("campaignId", [""])[0]
        if not campaign_id:
            print("FAIL no campaignId after create")
            shot(page, "no-campaign")
            return 1

        print("3) companion + distinctive draft")
        page.goto(
            f"{APP}/app/assets?clientId={client_id}&campaignId={campaign_id}",
            wait_until="networkidle",
        )
        create = page.locator('form:has(button:has-text("Create asset"))')
        create.locator('input[name="name"]').fill(asset_name)
        create.locator('select[name="type"]').select_option("companion")
        create.locator('button:has-text("Create asset")').click()
        page.wait_for_url(re.compile(r"/app/assets/[0-9a-fA-F-]{36}"), timeout=30000)
        page.wait_for_load_state("networkidle")

        doc = {
            "lede": marker,
            "sections": [
                {
                    "heading": "Hook",
                    "paragraphs": [
                        {
                            "$type": "text",
                            "runs": [{"text": f"Paste-ready LinkedIn post {stamp}."}],
                        }
                    ],
                }
            ],
        }
        version_form = page.locator('form:has(button:has-text("Save version"))')
        if version_form.count() == 0:
            print("FAIL version form missing")
            shot(page, "version-missing")
            return 1
        version_form.locator('textarea[name="bodyDocumentJson"]').fill(
            json.dumps(doc, indent=2)
        )
        version_form.locator('button:has-text("Save version")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        shot(page, "01-companion")

        print("4) fill week from companions")
        page.goto(
            f"{APP}/app/calendar?clientId={client_id}&campaignId={campaign_id}",
            wait_until="networkidle",
        )
        fill = page.locator('form:has(button:has-text("Fill week from companions"))')
        if fill.count() == 0:
            print("FAIL fill week missing")
            shot(page, "fill-missing")
            return 1
        fill.locator('button:has-text("Fill week from companions")').click()
        try:
            page.wait_for_url(re.compile(r"scheduled="), timeout=60000)
        except PlaywrightTimeout:
            shot(page, "fill-stuck")
            print(page.inner_text("body")[:2000])
            return 1
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        shot(page, "02-queue")

        body = page.inner_text("body")
        if marker not in body:
            print("FAIL post body missing from queue")
            print(body[:2500])
            return 1
        if "linkedin" not in body.lower():
            print("FAIL linkedin channel missing")
            print(body[:2000])
            return 1
        copy_btn = page.locator('button:has-text("Copy post")')
        if copy_btn.count() == 0:
            print("FAIL Copy post control missing")
            shot(page, "copy-missing")
            return 1

        print("5) mark posted")
        posted = page.locator('form:has(button:has-text("Posted"))').first
        if posted.count():
            posted.locator('button:has-text("Posted")').click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(800)
            shot(page, "03-posted")
        else:
            print("WARN Posted button missing")

        if forbidden:
            print("FAIL hit /api/content-writer/v3/:")
            for u in forbidden[:5]:
                print(" ", u)
            return 1

        print("PASS calendar publishing queue")
        browser.close()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
