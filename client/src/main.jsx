import { createTheme, ThemeProvider } from "@mui/material";
import { svSE } from "@mui/material/locale";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "./index.css";

const theme = createTheme({}, svSE);
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<ThemeProvider theme={theme}>
				<App />
			</ThemeProvider>
		</QueryClientProvider>
	</React.StrictMode>,
);
