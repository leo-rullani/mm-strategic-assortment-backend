# kanban_app/api/sfl.py
import re
import time
import requests
from bs4 import BeautifulSoup
from django.http import JsonResponse, HttpResponseBadRequest

HEADERS = {
    "User-Agent": "BBM-GFX/1.0 (+https://www.bbmproductions.ch)",
    "Accept-Language": "de-DE,de;q=0.9",
}
_TTL = 300  # Cache 5 Min.
_cache = {}  # key -> {"ts": float, "players": [...]}

# Club-ID (wie im JS) → SFL-Team-Slug
CLUB_TO_SFL_SLUG = {
    "fcb":      "fc-basel-1893",
    "fcluzern": "fc-luzern",
    "gcz":      "grasshopper-club-zuerich",
    "ls":       "fc-lausanne-sport",
    "fclugano": "fc-lugano",
    "sfc":      "servette-fc",
    "fcwin":    "fc-winterthur",
    "fcz":      "fc-zuerich",
    "fcsg":     "fc-st-gallen-1879",
    "fcthun":   "fc-thun",
    "fcsion":   "fc-sion",
    "yb":       "bsc-young-boys",
}

def _fetch_html(slug: str) -> tuple[str, str]:
    url = f"https://sfl.ch/de/teams/{slug}"
    r = requests.get(url, headers=HEADERS, timeout=12)
    r.raise_for_status()
    return r.text, url

def _split_name(full: str) -> tuple[str, str]:
    full = re.sub(r"\s+", " ", (full or "")).strip()
    if not full:
        return "", ""
    parts = full.split(" ")
    if len(parts) == 1:
        return parts[0], ""
    return " ".join(parts[:-1]), parts[-1]

def _parse_squad(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    players: list[dict] = []

    # 1) Tabellen-Variante
    for table in soup.find_all("table"):
        headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
        if not headers:
            continue
        if not any(h in " ".join(headers) for h in ["spieler", "name", "player"]):
            continue

        for tr in table.find_all("tr"):
            tds = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
            if len(tds) < 2:
                continue

            # Nummer (# / Zahl)
            number = ""
            for cell in tds:
                m = re.search(r"(^|[#\s])(\d{1,3})(\s|$)", cell)
                if m:
                    number = m.group(2)
                    break

            # Position (DE/EN)
            pos_pat = r"(Torhüter|Goalkeeper|Verteidiger|Defender|Mittelfeld|Midfielder|Stürmer|Forward)"
            position = ""
            for cell in tds:
                m = re.search(pos_pat, cell, re.I)
                if m:
                    position = m.group(1)
                    break

            # Name = längster Cell ohne Nummer/Position
            filtered = [c for c in tds if not re.fullmatch(r"\d{1,3}", c) and not re.search(pos_pat, c, re.I)]
            if not filtered:
                continue
            full_name = max(filtered, key=len).strip()
            first, last = _split_name(full_name)
            pid = re.sub(r"[^a-z0-9]+", "-", (first + "-" + last).lower()).strip("-") or full_name.lower()

            players.append({
                "id": pid,
                "number": number,
                "first_name": first,
                "last_name": last,
                "position": position,
            })

        if players:
            break  # Tabelle gefunden → fertig

    # 2) Karten-/Grid-Variante (Fallback)
    if not players:
        candidates = soup.select(
            '[class*="player"], [class*="kader"], [class*="squad"], a[href*="/spieler"], a[href*="/player"]'
        )
        seen = set()
        for el in candidates:
            text = el.get_text(" ", strip=True)
            if not text or len(text.split()) < 2:
                continue

            # prominentester Name
            nm_node = el.select_one("h3, h4, strong, .name, .player-name, [class*='name']")
            nm = nm_node.get_text(" ", strip=True) if nm_node else text

            # Nummer + Position
            m_num = re.search(r"(^|[#\s])(\d{1,3})(\s|$)", text)
            number = m_num.group(2) if m_num else ""

            m_pos = re.search(r"(Torhüter|Goalkeeper|Verteidiger|Defender|Mittelfeld|Midfielder|Stürmer|Forward)", text, re.I)
            position = m_pos.group(1) if m_pos else ""

            # Name säubern
            nm = re.sub(r"(^|[#\s])\d{1,3}(\s|$)", " ", nm)
            nm = re.sub(r"(Torhüter|Goalkeeper|Verteidiger|Defender|Mittelfeld|Midfielder|Stürmer|Forward)", " ", nm, flags=re.I)
            nm = re.sub(r"\s+", " ", nm).strip()

            first, last = _split_name(nm)
            if not (first or last):
                continue
            pid = re.sub(r"[^a-z0-9]+", "-", (first + "-" + last).lower()).strip("-") or nm.lower()
            if pid in seen:
                continue
            seen.add(pid)

            players.append({
                "id": pid,
                "number": number,
                "first_name": first,
                "last_name": last,
                "position": position,
            })

    return players

def sfl_squad_by_slug(request, slug: str):
    """/api/sfl/squad/<slug>/ → reiner Kader (per SFL-Slug)"""
    now = time.time()
    ck = f"squad:{slug}"
    if ck in _cache and (now - _cache[ck]["ts"] < _TTL):
        pl = _cache[ck]["players"]
        return JsonResponse({"players": pl, "count": len(pl), "slug": slug})

    try:
        html, url = _fetch_html(slug)
        players = _parse_squad(html)
        _cache[ck] = {"ts": now, "players": players}
        return JsonResponse({"players": players, "count": len(players), "slug": slug, "source": url})
    except requests.HTTPError as e:
        code = getattr(e.response, "status_code", 502)
        return JsonResponse({"error": f"HTTP {code}", "slug": slug}, status=502)
    except Exception as e:
        return JsonResponse({"error": str(e), "slug": slug}, status=500)

def roster_by_club(request):
    """
    /api/roster?club=fcb → Struktur für dein Overlay:
    players: [{id, number, first_name, last_name, position, on_air_name, portrait_present}]
    """
    club = (request.GET.get("club") or "").strip().lower()
    if not club:
        return HttpResponseBadRequest("Missing ?club=")

    slug = CLUB_TO_SFL_SLUG.get(club)
    if not slug:
        return JsonResponse({"players": [], "count": 0, "club": club, "error": "unknown club id"}, status=400)

    now = time.time()
    ck = f"squad:{slug}"
    try:
        if ck in _cache and (now - _cache[ck]["ts"] < _TTL):
            base_players = _cache[ck]["players"]
        else:
            html, _ = _fetch_html(slug)
            base_players = _parse_squad(html)
            _cache[ck] = {"ts": now, "players": base_players}

        out = []
        for p in base_players:
            first, last = p.get("first_name", ""), p.get("last_name", "")
            on_air = f"{first[:1]}. {last}" if first and last else (first or last)
            out.append({
                "id": f"{club}-{p['id']}",
                "number": p.get("number", ""),
                "first_name": first,
                "last_name": last,
                "position": p.get("position", ""),
                "on_air_name": on_air,
                "portrait_present": False
            })

        return JsonResponse({"club": club, "slug": slug, "players": out, "count": len(out)})
    except requests.HTTPError as e:
        code = getattr(e.response, "status_code", 502)
        return JsonResponse({"club": club, "error": f"HTTP {code}"}, status=502)
    except Exception as e:
        return JsonResponse({"club": club, "error": str(e)}, status=500)
