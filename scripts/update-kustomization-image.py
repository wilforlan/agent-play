#!/usr/bin/env python3

import argparse
import pathlib
import re
import sys


def escape_yaml_double(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--kustomization",
        type=pathlib.Path,
        required=True,
        help="Path to kustomization.yaml",
    )
    parser.add_argument("--new-name", required=True, help="images[0].newName value")
    parser.add_argument("--new-tag", required=True, help="images[0].newTag value")
    args = parser.parse_args()
    path = args.kustomization
    if not path.is_file():
        print(f"not found: {path}", file=sys.stderr)
        return 1
    new_name = args.new_name
    new_tag = args.new_tag
    text = path.read_text(encoding="utf-8")
    text, n1 = re.subn(
        r"^    newName: .*$",
        f"    newName: {new_name}",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    text, n2 = re.subn(
        r"^    newTag: .*$",
        f'    newTag: "{escape_yaml_double(new_tag)}"',
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if n1 != 1 or n2 != 1:
        print(
            "expected exactly one newName and one newTag line in kustomization.yaml",
            file=sys.stderr,
        )
        return 1
    path.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
