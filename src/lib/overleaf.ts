/**
 * Opens a new Overleaf project pre-loaded with the given .tex content, using Overleaf's
 * public "Open in Overleaf" form-POST gateway. Overleaf.com has no OAuth/API for third-party
 * apps to embed a workspace or read edits back out, so this opens in a new tab rather than
 * an iframe — the user edits there and pastes the final .tex back into ResTrack.
 */
export function openInOverleaf(texContent: string, projectName = 'resume'): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.overleaf.com/docs';
  form.target = '_blank';
  form.style.display = 'none';

  const nameField = document.createElement('input');
  nameField.type = 'hidden';
  nameField.name = 'snip_name[]';
  nameField.value = `${projectName}.tex`;
  form.appendChild(nameField);

  const contentField = document.createElement('input');
  contentField.type = 'hidden';
  contentField.name = 'snip[]';
  contentField.value = texContent;
  form.appendChild(contentField);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
