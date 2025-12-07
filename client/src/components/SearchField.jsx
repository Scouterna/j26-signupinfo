import { TextField, InputAdornment } from "@mui/material";
import { Search } from "@mui/icons-material";

export default function SearchField({
  placeholder = "",
  searchTerm = "",
  setSearchTerm = () => {},
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
