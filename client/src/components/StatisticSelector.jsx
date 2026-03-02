import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from "@mui/material";

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string[]} props.value
 * @param {string[]} props.options
 * @param {(event: import('@mui/material').SelectChangeEvent<string[]>) => void} props.onChange
 */
export default function StatisticSelector({ title, value, options, onChange }) {
  const numSelected = value.length;

  return (
    <Box
      sx={{
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderRadius: "8px",
        flex: "1 1 auto",
        minWidth: "180px",
      }}
    >
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <FormControl fullWidth size="small">
        <InputLabel>Statistik</InputLabel>
        <Select
          multiple
          value={value}
          onChange={onChange}
          input={<OutlinedInput label="Statistik" />}
          renderValue={() =>
            numSelected === 0 ? "Välj statistik" : `${numSelected} valda`
          }
        >
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              <Checkbox checked={value.includes(option)} />
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
