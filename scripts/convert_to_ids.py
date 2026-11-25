
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ARCHIVE = ROOT / "assets" / "data" / "archive.json"
SOURCE = ROOT / "assets" / "data"
OUTPUT = ROOT / "converted"

CATEGORIES = {
    "original.json",
    "cover.json",
    "collabo.json",
    "playlist.json",
    "mingical.json"
}

NUMBER_FIELDS = ("tj", "tj60", "tj60mr", "ky")


def load_json(path):
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize(value):
    if value is None:
        return ""

    value = unicodedata.normalize("NFKC", str(value))
    return "".join(value.casefold().split())


def titles(song):
    return {
        normalize(song.get("title")),
        normalize(song.get("title_jp"))
    } - {""}


def match_song(song, archive):
    candidates = []
    suggestions = []

    for target in archive:
        title_match = bool(titles(song) & titles(target))

        artist = normalize(song.get("originalArtist"))
        artist_match = (
            bool(artist)
            and artist == normalize(target.get("originalArtist"))
        )

        number_matches = 0
        number_conflicts = 0

        for field in NUMBER_FIELDS:
            old = normalize(song.get(field))
            new = normalize(target.get(field))

            if old and new:
                if old == new:
                    number_matches += 1
                else:
                    number_conflicts += 1

        if title_match or number_matches:
            suggestions.append({
                "song_ID": target["song_ID"],
                "title": target["title"],
                "originalArtist": target.get("originalArtist")
            })

        if (
            title_match
            and (artist_match or number_matches > 0)
            and number_conflicts == 0
        ):
            candidates.append(target)

    if len(candidates) == 1:
        return candidates[0]["song_ID"], []

    return None, suggestions


def main():
    archive = load_json(ARCHIVE)

    ids = [song["song_ID"] for song in archive]

    if len(ids) != len(set(ids)):
        raise ValueError("archive.json에 중복 ID가 있습니다.")

    report = []
    total = 0
    success = 0

    files = sorted(
        path for path in SOURCE.rglob("*.json")
        if path.name in CATEGORIES
    )

    if not files:
        raise FileNotFoundError("변환 대상 JSON 파일이 없습니다.")

    for path in files:
        songs = load_json(path)
        relative = path.relative_to(SOURCE)

        if not isinstance(songs, list):
            raise ValueError(f"배열 형식이 아닙니다: {relative}")

        converted = []
        unresolved = 0

        for index, song in enumerate(songs):
            total += 1

            song_id, candidates = match_song(song, archive)

            if song_id is not None:
                success += 1

                if song.get("collaboWith"):
                    converted.append({
                        "song_ID": song_id,
                        "collaboWith": song["collaboWith"]
                    })
                else:
                    converted.append(song_id)

            else:
                unresolved += 1

                # 원래 위치와 데이터를 보존
                converted.append(None)

                report.append({
                    "file": str(relative),
                    "index": index,
                    "original": song,
                    "candidates": candidates
                })

        save_json(OUTPUT / relative, converted)

        print(
            f"{relative}: "
            f"{len(songs) - unresolved}/{len(songs)} 성공, "
            f"{unresolved}곡 검수 필요"
        )

    save_json(OUTPUT / "review_required.json", report)

    print("\n===== 변환 결과 =====")
    print(f"전체 곡: {total}")
    print(f"변환 성공: {success}")
    print(f"검수 필요: {total - success}")
    print(f"저장 위치: {OUTPUT}")

    if report:
        print("검수 완료 전에는 기존 파일을 교체하지 마세요.")


if __name__ == "__main__":
    main()
