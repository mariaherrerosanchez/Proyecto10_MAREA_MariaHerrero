type SectionPlaceholderProps = {
  title: string
}

export function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <div className="page page--placeholder">
      <p className="eyebrow">MAREA</p>
      <h1>{title}</h1>
      <p>Esta sección estará disponible en una próxima etapa del proyecto.</p>
    </div>
  )
}
