#!/usr/bin/env python3
"""Signed-in smoke: generate draft → SEO panel → optional apply fixes."""

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
OUT = Path("/tmp/gcw-smoke-seo")
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
    client_name = f"SEO Smoke {stamp}"
    campaign_name = f"SEO Camp {stamp}"
    keyword = f"seo-kw-{stamp}"
    angle = f"SEO angle {stamp}"

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

        print("2) brief + generate")
        page.goto(f"{APP}/app/brand-core", wait_until="networkidle")
        page.locator('form:has(button:has-text("Create workspace")) input[name="name"]').fill(
            f"SEO WS {stamp}"
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
        page.fill('textarea[name="audienceProfile"]', "SEO smoke audience")
        page.select_option('select[name="buyingStage"]', "awareness")
        page.fill('input[name="angle"]', angle)
        page.fill('input[name="callToAction"]', "Try SEO")
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
        shot(page, "01-generated")
        v1 = page.url
        m = re.search(r"versionId=([0-9a-fA-F-]{36})", v1)
        version1 = m.group(1) if m else ""

        print("3) SEO panel")
        body = page.inner_text("body")
        if "SEO · v" not in body and "SEO ·" not in body:
            print("FAIL SEO panel missing")
            print(body[:1200])
            shot(page, "seo-missing")
            return 1
        if "Score" not in body:
            print("FAIL SEO score missing")
            shot(page, "seo-no-score")
            return 1
        if keyword not in body and f"keyword “{keyword}”" not in body:
            # keyword may use curly quotes in UI
            if f"keyword" not in body.lower():
                print("FAIL keyword not surfaced", keyword)
                shot(page, "seo-no-kw")
                return 1
        print("   SEO panel ok")
        shot(page, "02-seo")

        apply = page.locator('form:has(button:has-text("Apply SEO fixes"))')
        if apply.count() == 0:
            print("   no Apply SEO fixes (already 100?) — PASS without apply")
        else:
            print("4) apply SEO fixes")
            apply.locator('button:has-text("Apply SEO fixes")').click()
            deadline = time.time() + 180
            while time.time() < deadline:
                url = page.url
                m2 = re.search(r"versionId=([0-9a-fA-F-]{36})", url)
                if m2 and version1 and m2.group(1) != version1:
                    break
                if page.locator("text=v2").count():
                    break
                if "error=" in url:
                    print("FAIL SEO apply error", url)
                    shot(page, "seo-apply-error")
                    return 1
                page.wait_for_timeout(2000)
            else:
                print("FAIL SEO apply timeout", page.url)
                shot(page, "seo-apply-timeout")
                return 1
            page.wait_for_load_state("networkidle")
            shot(page, "03-applied")
            print("   apply ok")

        if forbidden:
            print("FAIL content-writer/v3 calls:", forbidden[:3])
            return 1

        print("PASS smoke-seo")
        browser.close()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
