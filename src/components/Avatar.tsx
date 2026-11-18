import { memo } from 'react';
import { avatarRuns, backdropOf, BACKDROPS, luminance, parseAvatar, TILE, type AvatarChoice } from '../lib/avatars';

/**
 * Someone's profile icon: a pixel picture on a coloured tile, drawn crisply at any size (best
 * at multiples of 18). `value` is what they saved (see parseAvatar), or pass `choice` directly.
 * No icon: the first letter of their name on the tile instead.
 * `label` names it for screen readers; leave it out when the name is already next to it.
 */
export const Avatar = memo(function Avatar({
  value,
  choice,
  name,
  size = 36,
  label,
}: {
  value?: string | null;
  choice?: AvatarChoice;
  name: string;
  size?: number;
  label?: string;
}) {
  const pick = choice ?? parseAvatar(value);
  const bg = backdropOf(pick);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const letter = [...name.trim()][0]?.toUpperCase() ?? '?';
  // the letter is light on dark tiles and dark on light ones
  const ink = bg && bg !== 'clear' && luminance(BACKDROPS[bg]) > 150 ? '#221b29' : '#fffaf0';
  return (
    <svg
      className={`avatar ${pick.icon ? '' : 'avatar-letter'} ${bg ? '' : 'avatar-plain'}`}
      width={size}
      height={size}
      viewBox={`0 0 ${TILE} ${TILE}`}
      shapeRendering="crispEdges"
      {...a11y}
    >
      {avatarRuns(pick.icon, bg).map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
      {!pick.icon && (
        <text x={TILE / 2} y={TILE / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={bg ? ink : undefined}>
          {letter}
        </text>
      )}
    </svg>
  );
});
