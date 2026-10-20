#!/usr/bin/env python3
"""Generate search index from member JSON. Preserve every distinct performance entry."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'assets' / 'data'
OUTPUT = DATA / 'all.json'
FILES = ('original.json', 'cover.json', 'collabo.json', 'playlist.json', 'mashup.json', 'concerts.json', 'medley.json')


def read_entries(path):
    with path.open(encoding='utf-8-sig') as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f'{path}: expected a JSON array')
    return data


def build():
    results = []
    # Source path and item position define a performance, NOT title/artist.
    for folder in sorted(p for p in DATA.iterdir() if p.is_dir()):
        for filename in FILES:
            path = folder / filename
            if not path.is_file():
                continue
            category = path.stem
            for i, entry in enumerate(read_entries(path)):
                if not isinstance(entry, dict):
                    continue

                def add(song, location):
                    if not isinstance(song, dict) or not str(song.get('title') or '').strip():
                        return
                    record = dict(song)
                    record['_source'] = {
                        'member': folder.name,
                        'category': category,
                        'file': str(path.relative_to(ROOT)).replace('\\', '/'),
                        'location': location,
                    }
                    results.append(record)

                if category in ('original', 'cover', 'collabo'):
                    add(entry, [i])
                elif category == 'concerts':
                    for j, part in enumerate(entry.get('parts') or []):
                        if not isinstance(part, dict):
                            continue
                        for k, song in enumerate(part.get('songs') or []):
                            add(song, [i, j, k])
                else:
                    key = 'tracks' if category == 'mashup' else 'songs'
                    for j, song in enumerate(entry.get(key) or []):
                        add(song, [i, j])

    OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generated {OUTPUT}: {len(results)} entries (including distinct covers and categories)')


if __name__ == '__main__':
    build()
