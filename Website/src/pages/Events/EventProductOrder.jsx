import React, { useState } from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    IconButton,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { Add, Remove, Close } from "@mui/icons-material";

/* ===== THEME COLOR ===== */
const THEME_COLOR = "#B4584A";

const variants = ["1 Kg", "2 Kg"];

const EventProductOrder = ({ open, onClose, productName }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const [selectedVariant, setSelectedVariant] = useState("1 Kg");
    const [qty, setQty] = useState(1);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            fullScreen={fullScreen}
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 4,
                },
            }}
        >
            {/* ===== TITLE + CLOSE ICON ===== */}
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    textAlign: "center",
                    position: "relative",
                    pb: 1,
                }}
            >
                Order {productName}

                <IconButton
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        color: "grey.600",
                    }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <TextField label="Your Name" fullWidth />
                    <TextField label="Phone Number" type="tel" fullWidth />
                    <TextField
                        label="Delivery Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                    />
                    <TextField label="Special Person Name" fullWidth />
                    <TextField
                        label="Greeting Message"
                        multiline
                        rows={3}
                        fullWidth
                    />

                    {/* ===== VARIANT & QTY ===== */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            justifyContent: "space-between",
                            gap: 3,
                            mt: 2,
                        }}
                    >
                        {/* Variant */}
                        <Box>
                            <Typography fontWeight={600} mb={1}>
                                Select Variant
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                {variants.map((v) => (
                                    <Button
                                        key={v}
                                        onClick={() => setSelectedVariant(v)}
                                        sx={{
                                            px: 3,
                                            minWidth: 80,
                                            borderRadius: 2,
                                            border: `1px solid ${THEME_COLOR}`,
                                            fontWeight: 600,
                                            backgroundColor:
                                                selectedVariant === v
                                                    ? THEME_COLOR
                                                    : "#fff",
                                            color:
                                                selectedVariant === v
                                                    ? "#fff"
                                                    : THEME_COLOR,
                                            "&:hover": {
                                                backgroundColor:
                                                    selectedVariant === v
                                                        ? THEME_COLOR
                                                        : "#fdf3f1",
                                            },
                                        }}
                                    >
                                        {v}
                                    </Button>
                                ))}
                            </Stack>
                        </Box>

                        {/* Qty */}
                        <Box>
                            <Typography fontWeight={600} mb={1}>
                                Select Qty
                            </Typography>

                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    border: `1px solid ${THEME_COLOR}`,
                                    borderRadius: 2,
                                    px: 1,
                                    width: { xs: "100%", sm: 120 },
                                }}
                            >
                                <IconButton
                                    onClick={() =>
                                        setQty((p) => Math.max(1, p - 1))
                                    }
                                >
                                    <Remove />
                                </IconButton>

                                <Typography fontWeight={700}>
                                    {qty}
                                </Typography>

                                <IconButton
                                    onClick={() => setQty((p) => p + 1)}
                                >
                                    <Add />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>

                    {/* ===== PLACE ORDER ===== */}
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        sx={{
                            mt: 3,
                            borderRadius: 3,
                            fontWeight: 700,
                            py: 1.4,
                            backgroundColor: THEME_COLOR,
                            "&:hover": {
                                backgroundColor: THEME_COLOR,
                            },
                        }}
                        onClick={onClose}
                    >
                        Place Order
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

EventProductOrder.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    productName: PropTypes.string.isRequired,
};

export default EventProductOrder;
