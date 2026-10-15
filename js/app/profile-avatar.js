export const PROFILE_AVATAR_PENDING_KEY = 'party_profile_avatar_pending';
export const AVATAR_PRESETS = ['👾', '😎', '🍻', '👑', '⚡', '🤪', '🚗'];

export function normalizeAvatar(avatar) {
  if (typeof avatar === 'string') return { type: 'emoji', value: avatar };
  if (avatar?.type === 'image' && /^(data:image\/|https?:\/\/)/i.test(avatar.value || '')) return avatar;
  return { type: 'emoji', value: avatar?.type === 'emoji' ? avatar.value : '👾' };
}

export function readAvatarPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Bitte wähle eine Bilddatei aus.'));
    if (file.size > 20 * 1024 * 1024) return reject(new Error('Das Foto ist zu groß. Bitte wähle ein Bild unter 20 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Dieses Bildformat konnte nicht geöffnet werden. Bitte nutze JPG, PNG oder WebP.'));
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 96;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Dein Browser unterstützt die Bildverarbeitung nicht.');
          const size = Math.min(image.width, image.height);
          context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 96, 96);
          resolve({ type: 'image', value: canvas.toDataURL('image/jpeg', 0.75) });
        } catch (error) {
          reject(error);
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
