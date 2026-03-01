import { TextField, InputAdornment } from "@mui/material";
import { Search } from "@mui/icons-material";

/**
 * @param {object} props
 * @param {string} [props.placeholder]
 * @param {string} [props.searchTerm]
 * @param {(term: string) => void} props.setSearchTerm
 */
export default function SearchField({
  placeholder = "",
  searchTerm = "",
  setSearchTerm,
}) {
  return (
    <TextField
      placeholder={placeholder}
      variant="outlined"
      fullWidth
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        },
      }}
      sx={{ marginBottom: "16px" }}
    />
  );
}
