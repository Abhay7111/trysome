import { useState } from 'react';
import { updateProfileBanner, updateProfileDetails, updateProfileImage } from '../auth/services/auth.api';
import style from '../pages/Social.module.scss';

function validateImage(file) {
  if (!file.type.startsWith('image/')) return 'Choose an image file.';
  if (file.size > 5 * 1024 * 1024) return 'Choose an image smaller than 5 MB.';
  return '';
}

export default function ProfileEditor({ profile, onProfileUpdated, onDetailsSaved }) {
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');

  const handleDetailsSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await updateProfileDetails(username, bio);
      onProfileUpdated(result);
      setUsername(result.username);
      setBio(result.bio);
      onDetailsSaved();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ?? 'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }

    setUploading(kind);
    try {
      const result = kind === 'profile'
        ? await updateProfileImage(file)
        : await updateProfileBanner(file);
      onProfileUpdated(
        kind === 'profile'
          ? { profile_img: result.profile_img }
          : { banner_img: result.banner_img }
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message
        ?? `Unable to update your ${kind === 'profile' ? 'profile picture' : 'banner'}.`
      );
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  return (
    <div className={style.profileEditor}>
      <form onSubmit={handleDetailsSubmit}>
        <label>
          Username
          <input
            type="text"
            value={username}
            maxLength={30}
            required
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Bio
          <textarea
            value={bio}
            maxLength={160}
            rows={3}
            onChange={(event) => setBio(event.target.value)}
          />
          <small>{bio.length}/160</small>
        </label>
        <button type="submit" disabled={saving || !username.trim()}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
      <div className={style.profileUploadActions}>
        <label className={style.changePicture}>
          {uploading === 'profile' ? 'Uploading picture...' : 'Change profile picture'}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleImageUpload(event, 'profile')}
            disabled={Boolean(uploading)}
          />
        </label>
        <label className={style.changePicture}>
          {uploading === 'banner' ? 'Uploading banner...' : 'Upload banner'}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleImageUpload(event, 'banner')}
            disabled={Boolean(uploading)}
          />
        </label>
      </div>
      {error && <p className={style.error} role="alert">{error}</p>}
    </div>
  );
}
