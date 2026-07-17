export function annotateTopLevelSettingsSections(
  contentArea: HTMLElement,
  sectionGroups: Readonly<Record<string, string>>,
): void {
  const sections = contentArea.querySelectorAll<HTMLElement>(':scope > [data-section-id]');
  for (const section of sections) {
    const sectionId = section.dataset.sectionId;
    const groupId = sectionId ? sectionGroups[sectionId] : undefined;
    if (groupId) {
      section.dataset.settingsGroup = groupId;
    } else {
      section.removeAttribute('data-settings-group');
    }
  }
}
