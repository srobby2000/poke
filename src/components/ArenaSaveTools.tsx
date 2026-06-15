type ArenaSaveToolsProps = {
  saveText: string;
  saveMessage: string | null;
  onSaveTextChange: (value: string) => void;
  onExportSave: () => void;
  onImportSave: () => void;
  onResetSave: () => void;
};

export function ArenaSaveTools({
  saveText,
  saveMessage,
  onSaveTextChange,
  onExportSave,
  onImportSave,
  onResetSave,
}: ArenaSaveToolsProps) {
  return (
    <section className="save-tools" aria-label="Save tools">
      <div className="save-actions">
        <button className="secondary-tool-button" onClick={onExportSave}>
          Export Save
        </button>
        <button className="secondary-tool-button" onClick={onImportSave}>
          Import Save
        </button>
        <button className="danger-tool-button" onClick={onResetSave}>
          Reset Save
        </button>
      </div>
      <textarea
        aria-label="Save import export text"
        value={saveText}
        onChange={(event) => onSaveTextChange(event.target.value)}
        placeholder="Exported save JSON appears here. Paste save JSON here to import."
      />
      {saveMessage ? <small>{saveMessage}</small> : null}
    </section>
  );
}
