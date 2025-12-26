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
    IconButton,
    Stack,
} from "@mui/material";
import {
    Add,
    Remove,
    Close,
    DeleteOutline,
} from "@mui/icons-material";

const THEME_COLOR = "#B4584A";

const EventProductOrder = ({ open, onClose, cartItems = [], setCartItems }) => {
    const [successOpen, setSuccessOpen] = useState(false);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
    });

    /* ================= QTY UPDATE ================= */
    const updateQty = (id, type) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        qty:
                            type === "inc"
                                ? item.qty + 1
                                : Math.max(1, item.qty - 1),
                    }
                    : item
            )
        );
    };

    /* ================= VARIANT CHANGE ================= */
    const handleVariantChange = (id, variant) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        selectedVariant: variant.label,
                        price: variant.price,
                    }
                    : item
            )
        );
    };

    /* ================= DELETE ITEM ================= */
    const removeItem = (id) => {
        setCartItems((prev) => prev.filter((i) => i.id !== id));
    };

    /* ================= TOTAL ================= */
    const totalAmount = cartItems.reduce(
        (sum, i) => sum + i.price * i.qty,
        0
    );

    /* ================= PLACE ORDER ================= */
    const placeOrder = () => {
        const payload = {
            ...form,
            total_amount: totalAmount,
            cake_price_details: cartItems.map((item) => ({
                id: item.id,
                qty: item.qty,
                variant: item.selectedVariant,
                price: item.price,
            })),
        };

        console.log("API PAYLOAD", payload);

        // simulate API success
        setTimeout(() => {
            setSuccessOpen(true);
            setCartItems([]);
            setForm({
                name: "",
                phone: "",
                email: "",
                address: "",
                notes: "",
            });
        }, 800);
    };

    return (
        <>
            {/* ================= ORDER MODAL ================= */}
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>
                    Order Summary
                    <IconButton onClick={onClose} sx={{ float: "right" }}>
                        <Close />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    {/* ================= CART ITEMS ================= */}
                    <Stack spacing={3}>
                        {cartItems.map((item) => (
                            <Box
                                key={item.id}
                                sx={{
                                    p: 2,
                                    border: "1px solid #eee",
                                    borderRadius: 3,
                                }}
                            >
                                {/* HEADER */}
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                >
                                    <Box
                                        component="img"
                                        src={item.image}
                                        alt={item.name}
                                        sx={{
                                            width: 70,
                                            height: 70,
                                            borderRadius: 2,
                                            objectFit: "cover",
                                        }}
                                    />

                                    <Box flex={1}>
                                        <Typography fontWeight={700}>
                                            {item.name}
                                        </Typography>
                                        <Typography
                                            fontWeight={700}
                                            color={THEME_COLOR}
                                        >
                                            ₹{item.price}
                                        </Typography>
                                    </Box>

                                    <IconButton
                                        color="error"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <DeleteOutline />
                                    </IconButton>
                                </Stack>

                                {/* VARIANT + QTY */}
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    mt={2}
                                >
                                    {/* VARIANTS */}
                                    <Box>
                                        <Typography
                                            variant="caption"
                                            fontWeight={600}
                                        >
                                            Select Variant
                                        </Typography>

                                        <Stack direction="row" spacing={1} mt={1}>
                                            {item.variants?.map((v) => (
                                                <Button
                                                    key={v.label}
                                                    size="small"
                                                    variant={
                                                        item.selectedVariant ===
                                                            v.label
                                                            ? "contained"
                                                            : "outlined"
                                                    }
                                                    sx={{
                                                        borderRadius: 2,
                                                        fontWeight: 600,
                                                        backgroundColor:
                                                            item.selectedVariant ===
                                                                v.label
                                                                ? THEME_COLOR
                                                                : "transparent",
                                                        color:
                                                            item.selectedVariant ===
                                                                v.label
                                                                ? "#fff"
                                                                : "text.primary",
                                                        borderColor:
                                                            THEME_COLOR,
                                                    }}
                                                    onClick={() =>
                                                        handleVariantChange(
                                                            item.id,
                                                            v
                                                        )
                                                    }
                                                >
                                                    {v.label}
                                                </Button>
                                            ))}
                                        </Stack>
                                    </Box>

                                    {/* QTY */}
                                    <Box textAlign="center">
                                        <Typography
                                            variant="caption"
                                            fontWeight={600}
                                        >
                                            Select Qty
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            mt={1}
                                            sx={{
                                                border: "1px solid #ddd",
                                                borderRadius: 2,
                                                px: 1,
                                            }}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    updateQty(item.id, "dec")
                                                }
                                            >
                                                <Remove />
                                            </IconButton>

                                            <Typography fontWeight={700}>
                                                {item.qty}
                                            </Typography>

                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    updateQty(item.id, "inc")
                                                }
                                            >
                                                <Add />
                                            </IconButton>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>

                    {/* TOTAL */}
                    <Typography
                        fontWeight={800}
                        mt={3}
                        textAlign="right"
                        color={THEME_COLOR}
                    >
                        Total: ₹{totalAmount}
                    </Typography>

                    {/* FORM */}
                    <Stack spacing={2} mt={3}>
                        <TextField
                            label="Name"
                            fullWidth
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />
                        <TextField
                            label="Phone"
                            fullWidth
                            value={form.phone}
                            onChange={(e) =>
                                setForm({ ...form, phone: e.target.value })
                            }
                        />
                        <TextField
                            label="Email"
                            fullWidth
                            value={form.email}
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                        />
                        <TextField
                            label="Address"
                            fullWidth
                            value={form.address}
                            onChange={(e) =>
                                setForm({ ...form, address: e.target.value })
                            }
                        />
                        <TextField
                            label="Notes"
                            multiline
                            rows={2}
                            value={form.notes}
                            onChange={(e) =>
                                setForm({ ...form, notes: e.target.value })
                            }
                        />
                    </Stack>

                    <Button
                        fullWidth
                        sx={{
                            mt: 3,
                            backgroundColor: THEME_COLOR,
                            color: "#fff",
                            fontWeight: 700,
                            "&:hover": { backgroundColor: "#923E37" },
                        }}
                        onClick={placeOrder}
                        disabled={!cartItems.length}
                    >
                        Place Order
                    </Button>
                </DialogContent>
            </Dialog>

            {/* ================= SUCCESS MODAL ================= */}
            <Dialog open={successOpen} onClose={() => setSuccessOpen(false)}>
                <DialogContent sx={{ textAlign: "center", p: 4 }}>
                    <Typography
                        fontSize={22}
                        fontWeight={800}
                        color={THEME_COLOR}
                    >
                        🎉 Order Placed Successfully
                    </Typography>

                    <Typography color="text.secondary" mt={1}>
                        Thank you for ordering with us
                    </Typography>

                    <Button
                        sx={{
                            mt: 3,
                            backgroundColor: THEME_COLOR,
                            color: "#fff",
                            fontWeight: 700,
                        }}
                        onClick={() => {
                            setSuccessOpen(false);
                            onClose();
                        }}
                    >
                        Continue Shopping
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
};

EventProductOrder.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    cartItems: PropTypes.array.isRequired,
    setCartItems: PropTypes.func.isRequired,
};

export default EventProductOrder;
