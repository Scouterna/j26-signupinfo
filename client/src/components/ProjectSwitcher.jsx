import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

/**
 * Dropdown to switch between configured Scoutnet projects.
 *
 * @param {object} props
 * @param {Array<{ id: number, name: string }>} props.projects
 * @param {number|null} props.value
 * @param {(projectId: number) => void} props.onChange
 */
export default function ProjectSwitcher({ projects, value, onChange }) {
  if (!projects || projects.length < 2) return null;

  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <InputLabel id="project-switcher-label">Projekt</InputLabel>
      <Select
        labelId="project-switcher-label"
        label="Projekt"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {projects.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
