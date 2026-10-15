export function getPlayerAvatar(rsvp) {
  if (!rsvp?.name) return null;
  const avatar = rsvp.avatar;
  if (typeof avatar === 'string' && avatar.trim()) return { type: 'emoji', value: avatar };
  if (
    avatar &&
    ['image', 'emoji'].includes(avatar.type) &&
    typeof avatar.value === 'string' &&
    avatar.value.trim()
  ) {
    return { type: avatar.type, value: avatar.value };
  }
  return null;
}

export function createPlayerAppearance(rsvp, onImageReady) {
  const appearance = { avatar: getPlayerAvatar(rsvp), image: null };
  if (appearance.avatar?.type === 'image') {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        appearance.image = image;
        onImageReady?.();
      }
    };
    image.onerror = () =>
      console.warn('[ARCADE-PLAYER] Das gewaehlte Gaestebild konnte nicht geladen werden.');
    image.src = appearance.avatar.value;
  }
  return appearance;
}

export function readLocalPlayerRsvp() {
  try {
    return JSON.parse(localStorage.getItem('party_rsvp_data') || 'null');
  } catch (error) {
    console.warn('[ARCADE-PLAYER] Lokale Zusage konnte nicht gelesen werden.', error);
    return null;
  }
}

function polygon(ctx, points, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

// Ein Pilot, verschiedene Fahrgestelle. Die Stage bestimmt weiterhin allein Physik und Hitbox.
export function drawPlayer(ctx, x, y, size, state = {}, appearance = null) {
  const {
    mode = 'runner',
    tilt = 0,
    thrust = 0,
    beatPhase = 1,
    squashX = 1,
    squashY = 1,
    accent = '#22d3ee'
  } = state;
  const pulse = Math.max(0, 1 - beatPhase * 4);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale((size / 32) * squashX, (size / 32) * squashY);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = '#ecfeff';
  ctx.shadowBlur = 0;

  if (mode === 'runner') {
    polygon(
      ctx,
      [
        [-9, 2],
        [9, 2],
        [10, 12],
        [-10, 12]
      ],
      '#0f2938'
    );
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(-8, 5, 16, 3);
    ctx.fillStyle = '#ecfeff';
    ctx.fillRect(-11, 12, 8, 3);
    ctx.fillRect(3, 12, 8, 3);
  } else {
    const vertical = mode === 'ship';
    ctx.save();
    if (vertical) ctx.rotate(-Math.PI / 2);
    if (thrust > 0) {
      polygon(
        ctx,
        [
          [-11, -4],
          [-16 - Math.min(1, thrust) * (4 + pulse * 3), 0],
          [-11, 4]
        ],
        accent
      );
      polygon(
        ctx,
        [
          [-11, -2],
          [-17 - Math.min(1, thrust) * 2, 0],
          [-11, 2]
        ],
        '#ecfeff'
      );
    }
    polygon(
      ctx,
      [
        [-12, -7],
        [-4, -12],
        [5, -6],
        [15, 0],
        [5, 6],
        [-4, 12],
        [-12, 7]
      ],
      '#0f2938'
    );
    ctx.stroke();
    polygon(
      ctx,
      [
        [-11, -7],
        [-4, -12],
        [0, -6]
      ],
      accent
    );
    polygon(
      ctx,
      [
        [-11, 7],
        [-4, 12],
        [0, 6]
      ],
      accent
    );
    polygon(
      ctx,
      [
        [8, -4],
        [15, 0],
        [8, 4]
      ],
      '#ecfeff'
    );
    ctx.restore();
  }

  // Helm und Visier bleiben in jeder Stage gleich, inklusive Foto/Emoji.
  const helmetY = mode === 'runner' ? -4 : 0;
  const radius = mode === 'runner' ? 10.5 : 9;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ecfeff';
  ctx.beginPath();
  ctx.arc(0, helmetY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#08202e';
  ctx.beginPath();
  ctx.arc(0, helmetY, radius - 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const image = appearance?.image;
  const faceSize = (radius - 1.8) * 2;
  if (image) {
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(
      image,
      (image.naturalWidth - crop) / 2,
      (image.naturalHeight - crop) / 2,
      crop,
      crop,
      -faceSize / 2,
      helmetY - faceSize / 2,
      faceSize,
      faceSize
    );
  } else if (appearance?.avatar?.type === 'emoji') {
    ctx.font = `${faceSize * 0.85}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(appearance.avatar.value, 0, helmetY + 0.5);
  } else {
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(-5, helmetY - 2, 3, 3);
    ctx.fillRect(2, helmetY - 2, 3, 3);
    ctx.fillStyle = accent;
    ctx.fillRect(-3, helmetY + 3, 6, 1);
  }
  ctx.restore();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, helmetY, radius + 0.4, 0.2, 1.1);
  ctx.stroke();
  ctx.restore();
}
