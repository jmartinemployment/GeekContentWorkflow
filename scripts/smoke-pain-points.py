#!/usr/bin/env python3
"""Signed-in smoke: Pain Points + brief link against production."""

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
OUT = Path("/tmp/gcw-smoke-pain")
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
    client_name = f"Pain Smoke {stamp}"
    pp_name = f"Pain {stamp}"
    campaign_name = f"Pain Camp {stamp}"
    keyword = f"pain-kw-{stamp}"
    angle = f"Pain angle {stamp}"

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

        print("2) client")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.fill('input[name="name"]', client_name)
        page.click('button:has-text("Create client")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        href = page.locator("li", has_text=client_name).locator(
            'a[href*="/app/brand-core/"]'
        ).first.get_attribute("href")
        client_id = href.rstrip("/").split("/")[-1]
        print(f"   client={client_id}")

        print("3) pain point")
        page.goto(
            f"{APP}/app/pain-points?clientId={client_id}",
            wait_until="networkidle",
        )
        shot(page, "03-pain")
        form = page.locator('form:has(button:has-text("Create pain point"))')
        form.locator('input[name="name"]').fill(pp_name)
        form.locator('textarea[name="description"]').fill("Smoke description")
        form.locator('textarea[name="readerSymptom"]').fill("Stuck without a brief")
        form.locator('textarea[name="costOfInaction"]').fill("Wasted drafting cycles")
        form.locator('input[name="offerTerminology"]').fill("Workflow")
        form.locator('textarea[name="objections"]').fill("Too busy\nAlready have a tool")
        form.locator('button:has-text("Create pain point")').click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        shot(page, "04-created")
        if page.locator(f"text={pp_name}").count() == 0:
            print("FAIL pain point missing", page.inner_text("body")[:600])
            return 1

        print("4) campaign + brief with pain point")
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
        page.wait_for_timeout(2000)

        page.select_option('select[name="painPointId"]', label=pp_name)
        page.fill('textarea[name="audienceProfile"]', "Founders without research")
        page.select_option('select[name="buyingStage"]', "awareness")
        page.fill('input[name="angle"]', angle)
        page.fill('input[name="callToAction"]', "Map the pain")
        page.click('button:has-text("Create brief")')
        page.wait_for_url(
            re.compile(r"/app/strategy-briefs/[0-9a-fA-F-]{36}"),
            timeout=45000,
        )
        page.wait_for_load_state("networkidle")
        shot(page, "05-brief")
        body = page.inner_text("body")
        if pp_name not in body:
            print("FAIL pain point not on brief", body[:800])
            return 1
        if "None linked" in body:
            print("FAIL still none linked")
            return 1

        print("5) approve")
        page.click('button:has-text("Approve")')
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        if "approved" not in page.content().lower():
            print("FAIL approve")
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
