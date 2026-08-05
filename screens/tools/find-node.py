"""Prints the tap coordinates of the smallest UI node matching a label.

Reads a `uiautomator dump` XML on stdin. Matches content-desc or text, exactly or
as a substring — React Native's accessibilityLabel arrives on Android as
content-desc, which is why the app sets it explicitly on every pressable.

Its own file rather than a heredoc inside the shell function: a heredoc and a pipe
both claim stdin, and the loser is silent. That cost a tour run whose every tap
reported MISS while the labels were there.
"""

import re
import sys

label = sys.argv[1]
xml = sys.stdin.read()

best = None
for match in re.finditer(r"<node[^>]*>", xml):
    tag = match.group(0)
    values = [
        m.group(1)
        for m in (
            re.search(r'content-desc="([^"]*)"', tag),
            re.search(r'text="([^"]*)"', tag),
        )
        if m and m.group(1)
    ]
    if not any(label == v or label in v for v in values):
        continue
    bounds = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', tag)
    if not bounds:
        continue
    x1, y1, x2, y2 = map(int, bounds.groups())
    area = (x2 - x1) * (y2 - y1)
    # The smallest match is the label itself, not the container around it.
    if area > 0 and (best is None or area < best[0]):
        best = (area, (x1 + x2) // 2, (y1 + y2) // 2)

print(f"{best[1]} {best[2]}" if best else "")
