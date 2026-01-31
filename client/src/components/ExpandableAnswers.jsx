import { useState } from "react";
import { Box, Typography, Collapse, IconButton, Chip } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PropTypes from "prop-types";

export default function ExpandableAnswers({ answers, parentLabel }) {
  const [expanded, setExpanded] = useState(false);
  const totalAnswers = answers.reduce((sum, a) => sum + a.num_answers, 0);

  return (
    <Box sx={{ marginLeft: "16px", marginTop: "4px", marginBottom: "8px" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.02)",
          },
          borderRadius: "4px",
          padding: "4px 8px",
          marginLeft: "-8px",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton
          size="small"
          sx={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            padding: "2px",
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" color="text.secondary">
          Fritextsvar
        </Typography>
        <Chip
          label={totalAnswers}
          size="small"
          sx={{
            height: "20px",
            fontSize: "0.7rem",
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            color: "primary.main",
          }}
        />
      </Box>
      
      <Collapse in={expanded}>
        <Box
          sx={{
            marginTop: "8px",
            marginLeft: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {answers.map((answer, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 10px",
                backgroundColor: "rgba(0, 0, 0, 0.02)",
                borderRadius: "6px",
                borderLeft: "3px solid",
                borderLeftColor: "primary.light",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  flex: 1,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {answer.text}
              </Typography>
              <Typography
                variant="caption"
                fontWeight="600"
                sx={{
                  marginLeft: "12px",
                  color: "text.secondary",
                }}
              >
                {answer.num_answers}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

ExpandableAnswers.propTypes = {
  answers: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      num_answers: PropTypes.number.isRequired,
    })
  ).isRequired,
  parentLabel: PropTypes.string,
};
