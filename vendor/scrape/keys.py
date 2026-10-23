# -*- coding: utf-8 -*-
"""API keys, looked up in this order:

1. environment variable (HARVESTAPI_KEY, ...);
2. the app's .env file (KEY=value lines), loaded into the environment by engine/hunt.py at start;
3. ~/.config/scrape/<service>.key — the bare key on one line.

Keys never live in git: .env is in .gitignore.
"""
import os

DIR = os.path.expanduser('~/.config/scrape')
FILES = {'HARVESTAPI_KEY': 'harvestapi.key'}


def _clean(v):
    v = v.strip()
    if '=' in v and v.split('=', 1)[0].strip().isupper():
        v = v.split('=', 1)[1]
    return v.strip().strip('"\'')


def key(name):
    if os.environ.get(name):
        return os.environ[name]
    p = os.path.join(DIR, FILES.get(name, name.lower() + '.key'))
    if os.path.exists(p):
        v = _clean(next((l for l in open(p) if l.strip() and not l.startswith('#')), ''))
        if v:
            return v
    raise RuntimeError(f'{name} is not set: add {name}=... to the .env file in the app folder')
