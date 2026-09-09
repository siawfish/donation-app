"""
Build the organisation proposal PDF.

The HTML is written with an A4 print stylesheet and rendered by headless Chrome,
which keeps the whole thing editable as text — change the copy, re-run, get a
new PDF. Fonts and the logo are inlined as data URIs because headless Chrome
renders from a temp directory with no access to the project's asset paths.

    python proposals/build-proposal.py
"""

import base64
import json
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "proposals")

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

ASSETS = {
    "bold": "src/app/fonts/CabinetGrotesk-Bold.otf",
    "regular": "src/app/fonts/CabinetGrotesk-Regular.otf",
    "light": "src/app/fonts/CabinetGrotesk-Light.otf",
    "logo": "public/logo.png",
}

# Product screenshots, embedded the same way. Re-capture them with
# proposals/capture-shots.ps1 and re-run this script to refresh the PDF.
SHOTS = [
    "storefront-web",
    "storefront-mobile",
    "listing-web",
    "leaderboard-web",
    "directory-web",
    "explore-mobile",
]


def b64(path):
    with open(os.path.join(ROOT, path), "rb") as f:
        return base64.b64encode(f.read()).decode()


def build_html():
    a = {k: b64(v) for k, v in ASSETS.items()}

    for name in SHOTS:
        path = os.path.join("proposals", "shots", f"{name}.png")
        if not os.path.exists(os.path.join(ROOT, path)):
            sys.exit(f"missing screenshot: {path} — run proposals/capture-shots.ps1 first")
        a[f"shot_{name.replace('-', '_')}"] = b64(path)

    template = io.open(os.path.join(OUT_DIR, "proposal.template.html"), encoding="utf-8").read()
    for key, value in a.items():
        template = template.replace("{{%s}}" % key, value)
    return template


def main():
    html = build_html()
    html_path = os.path.join(OUT_DIR, "_proposal.built.html")
    io.open(html_path, "w", encoding="utf-8").write(html)

    pdf_path = os.path.join(OUT_DIR, "Givny-Organisation-Proposal.pdf")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    subprocess.run(
        [
            CHROME,
            "--headless",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--print-to-pdf-no-header",
            f"--print-to-pdf={pdf_path}",
            f"file:///{html_path.replace(os.sep, '/')}",
        ],
        check=True,
        capture_output=True,
        timeout=120,
    )

    if not os.path.exists(pdf_path):
        sys.exit("Chrome did not produce a PDF")

    print(f"built {pdf_path}  ({os.path.getsize(pdf_path)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
