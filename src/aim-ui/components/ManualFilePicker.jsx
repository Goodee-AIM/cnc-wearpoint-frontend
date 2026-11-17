import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ManualControlIcon from "./ManualControlIcon.jsx";

// Keep one visible selection button per input; its menu offers files or a folder.
export default function ManualFilePicker({ label, icon = "image", accept, files, disabled, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const container = useRef(null), fileInput = useRef(null), folderInput = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (!container.current?.contains(event.target) || event.key === "Escape") setOpen(false); };
    document.addEventListener("click", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const change = (event) => {
    const selected = [...event.target.files];
    if (selected.length) onChange(selected);
    event.target.value = "";
  };
  return <div className="manual-picker" ref={container}>
    <span className="manual-picker-label" id={id + "-label"}><ManualControlIcon name={icon} />{label}</span>
    <button className="manual-picker-button" type="button" disabled={disabled} aria-labelledby={id + "-label " + id + "-button"} aria-expanded={open} aria-controls={id + "-options"} onClick={() => fileInput.current.click()}>
      <ManualControlIcon name="folder" /><span id={id + "-button"}>{t("manual.files")}</span>
    </button>
    <span className="manual-picker-description" title={files.map(f => f.webkitRelativePath || f.name).join("\n")}>{files.length === 1 ? files[0].name : files.length ? t("manual.fileCount", { count: files.length }) : t("manual.noFiles")}</span>
    <input ref={fileInput} type="file" accept={accept} multiple hidden onChange={change} />
    <input ref={folderInput} type="file" webkitdirectory="" directory="" multiple hidden onChange={change} />
    {open && !disabled && <div id={id + "-options"} className="manual-picker-options">
      <button type="button" onClick={() => { setOpen(false); fileInput.current.click(); }}>{t("manual.selectFiles")}</button>
      <button type="button" onClick={() => { setOpen(false); folderInput.current.click(); }}>{t("manual.selectFolder")}</button>
    </div>}
  </div>;
}
