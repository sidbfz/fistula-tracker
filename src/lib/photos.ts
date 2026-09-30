import { Directory, File, Paths } from 'expo-file-system';

function getPhotoDirectory() {
  return new Directory(Paths.document, 'wound-photos');
}

function ensurePhotoDirectory() {
  const photoDirectory = getPhotoDirectory();
  photoDirectory.create({ idempotent: true, intermediates: true });
  return photoDirectory;
}

export function copyPhotoToPrivateStorage(sourceUri: string) {
  const photoDirectory = ensurePhotoDirectory();
  const source = new File(sourceUri);
  const extension = source.extension || '.jpg';
  const destination = new File(photoDirectory, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
  source.copy(destination);
  return destination.uri;
}

export function deletePrivatePhoto(uri: string) {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function deleteAllPrivatePhotos() {
  const photoDirectory = getPhotoDirectory();
  if (photoDirectory.exists) photoDirectory.delete();
  ensurePhotoDirectory();
}
