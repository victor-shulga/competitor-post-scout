# -*- coding: utf-8 -*-
"""HarvestAPI called directly (https://api.harvestapi.io) instead of the harvestapi/* actors on Apify.

Billing is per REQUEST (one page of up to 50 posts), about $0.004 at the Starter tier (2026-10-07).

Trimmed copy for Competitor Hunter: only get() (one page of company-posts / profile-posts).
Key: HARVESTAPI_KEY in .env (see keys.py).
"""
import os
import threading
import time

import httpx

from .keys import key

BASE = 'https://api.harvestapi.io'
# USD per request at the Starter tier (harvestapi.io pricing, 2026-10-07). Bigger packs are cheaper.
PRICE = {'posts': 0.004, 'comments': 0.004, 'replies': 0.004, 'reactions': 0.004, 'company': 0.004,
         'company-search': 0.004, 'profile': 0.0064, 'profile-main': 0.004}
# Free 1, Starter 5, Basic 10, Pro 20, Business 40 parallel requests; over the limit HarvestAPI queues 10.
CONCURRENCY = int(os.environ.get('HARVESTAPI_CONCURRENCY', '5'))

_lock = threading.Lock()
_spent = {'usd': 0.0, 'requests': 0}


class Meter:
    """Spend of one logical call (thread-safe), so parallel batches each report their own USD."""
    def __init__(self):
        self.usd, self.requests = 0.0, 0

    def add(self, usd):
        with _lock:
            self.usd += usd
            self.requests += 1


def spent():
    """Whole-process spend estimate."""
    with _lock:
        return dict(_spent, usd=round(_spent['usd'], 4))


def _charge(kind, meter):
    with _lock:
        _spent['usd'] += PRICE[kind]
        _spent['requests'] += 1
    if meter is not None:
        meter.add(PRICE[kind])


def get(path, params, kind, meter=None, retries=4):
    """One GET. Retries 429/5xx with backoff; returns parsed JSON or raises on the last failure."""
    hdr = {'X-API-Key': key('HARVESTAPI_KEY')}
    for attempt in range(retries + 1):
        try:
            r = httpx.get(BASE + path, params={k: v for k, v in params.items() if v not in (None, '')},
                          headers=hdr, timeout=120)
        except httpx.TransportError:
            if attempt == retries:
                raise
            time.sleep(2 ** attempt)
            continue
        if r.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            time.sleep(2 ** attempt * 2)
            continue
        if r.status_code == 401:
            raise RuntimeError('HarvestAPI 401: wrong or missing HARVESTAPI_KEY')
        if r.status_code == 402:
            raise RuntimeError('HarvestAPI 402: credits are out, top up at harvestapi.io')
        r.raise_for_status()
        _charge(kind, meter)
        return r.json()
