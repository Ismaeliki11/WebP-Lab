from __future__ import annotations

import sys

from rembg import remove


def main() -> int:
    input_bytes = sys.stdin.buffer.read()
    if not input_bytes:
        sys.stderr.write("No se recibieron datos de imagen.\n")
        return 1

    try:
        output_bytes = remove(input_bytes)
    except Exception as exc:  # pragma: no cover - runtime bridge
        sys.stderr.write(f"{exc}\n")
        return 1

    sys.stdout.buffer.write(output_bytes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
