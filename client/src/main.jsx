import { createTheme, ThemeProvider } from "@mui/material";
import { svSE } from "@mui/material/locale";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "./index.css";

const theme = createTheme({}, svSE);

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<ThemeProvider theme={theme}>
			<App />
		</ThemeProvider>
	</React.StrictMode>,
);
