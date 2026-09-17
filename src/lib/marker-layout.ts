export type MapPoint = { id: string; name: string; x: number; y: number };
export function layoutMarkers(points: MapPoint[]) {
  const groups: { x: number; y: number; points: MapPoint[]; label: string; showLabel: boolean }[] =
    [];
  for (const point of [...points].sort((a, b) => a.id.localeCompare(b.id))) {
    const group = groups.find((g) => Math.hypot(g.x - point.x, g.y - point.y) < 44);
    if (group) group.points.push(point);
    else groups.push({ x: point.x, y: point.y, points: [point], label: "", showLabel: false });
  }
  const occupied = groups.map((g) => ({
    left: g.x - 19,
    right: g.x + 19,
    top: g.y - 19,
    bottom: g.y + 19,
  }));
  for (const group of groups) {
    const name = group.points[0].name;
    group.label =
      (name.length > 22 ? name.slice(0, 21) + "…" : name) +
      (group.points.length > 1 ? ` +${group.points.length - 1}` : "");
    const width = group.label.length * 7.5 + 12;
    const box = {
      left: group.x - width / 2,
      right: group.x + width / 2,
      top: group.y + 22,
      bottom: group.y + 40,
    };
    group.showLabel = !occupied.some(
      (b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top,
    );
    if (group.showLabel) occupied.push(box);
  }
  return groups;
}
