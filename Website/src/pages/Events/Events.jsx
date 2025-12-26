import React, { useEffect, useState } from "react";
import {
    Box,
    Grid,
    Typography,
    Card,
    CardMedia,
    CardContent,
    Button,
    Stack,
} from "@mui/material";

import BannerImage from "../../assets/images/banner-offer-1.png";
import ProductImage from "../../assets/images/about-cupcake.png";
import EventProductOrder from "../../pages/Events/EventProductOrder";

const THEME_COLOR = "#B4584A";

const Events = () => {
    const [eventData, setEventData] = useState(null);
    const [openCart, setOpenCart] = useState(false);
    const [cartItems, setCartItems] = useState([]);

    /* ===== DUMMY API ===== */
    const dummyEventsResponse = {
        data: {
            id: 1,
            name: "Christmas",
            place: "Chennai",
            start: "2025-12-27",
            end: "2025-12-29",
            url: BannerImage,
            description: "Celebrate Christmas with our special cakes & offers.",
            cake_details: [
                { id: 1, name: "Choco Cheesecake", price: 850, image: ProductImage },
                { id: 2, name: "Red Velvet Cake", price: 950, image: ProductImage },
            ],
        },
    };

    useEffect(() => {
        setEventData(dummyEventsResponse.data);
    }, []);

    /* ===== ADD TO CART ===== */
    const handleAddToCart = (cake) => {
        setCartItems((prev) => {
            const exists = prev.find((i) => i.id === cake.id);

            if (exists) {
                return prev.map((i) =>
                    i.id === cake.id ? { ...i, qty: i.qty + 1 } : i
                );
            }

            return [
                ...prev,
                {
                    ...cake,
                    qty: 1,
                    variants: [
                        { label: "1 Kg", price: cake.price },
                        { label: "2 Kg", price: cake.price * 2 },
                    ],
                    selectedVariant: "1 Kg",
                    price: cake.price,
                },
            ];
        });

        setOpenCart(true);
    };


    if (!eventData) return null;

    return (
        <Box p={{ xs: 1, sm: 2, md: 3 }}>
            <Card
                sx={{
                    mb: 4,
                    p: { xs: 2, md: 3 },
                    borderRadius: 6,
                    background:
                        "linear-gradient(135deg, #ffffff 0%, #f3e8ff 50%, #fdf2f8 100%)",
                }}
            >
                <Grid
                    container
                    spacing={4}
                    alignItems="center"
                    direction={{ xs: "column", md: "row" }}
                >
                    {/* IMAGE */}
                    <Grid item xs={12} md={5}>
                        <Box
                            component="img"
                            src={eventData.url}
                            alt={eventData.name}
                            sx={{
                                width: "100%",
                                height: { xs: 220, md: 360 },
                                objectFit: "cover",
                                borderRadius: 5,
                                boxShadow: 8,
                            }}
                        />
                    </Grid>

                    {/* CONTENT */}
                    <Grid item xs={12} md={7}>
                        <Stack spacing={2}>
                            <Typography
                                variant="subtitle2"
                                sx={{ color: THEME_COLOR, fontWeight: 600 }}
                            >
                                Festival Event
                            </Typography>

                            <Typography
                                fontWeight={800}
                                lineHeight={1.2}
                                sx={{
                                    fontSize: {
                                        xs: "1.8rem",
                                        sm: "2.4rem",
                                        md: "2.8rem",
                                    },
                                }}
                            >
                                Cake{" "}
                                <Box component="span" color={THEME_COLOR}>
                                    Festival
                                </Box>{" "}
                                2025
                            </Typography>

                            <Typography color="text.secondary" maxWidth={520}>
                                {eventData.description}
                            </Typography>

                            <Card
                                sx={{
                                    p: 3,
                                    mt: 2,
                                    borderRadius: 5,
                                    background: "rgba(255,255,255,0.75)",
                                    backdropFilter: "blur(12px)",
                                }}
                            >
                                <Typography fontWeight={700}>
                                    Special Festival Offers
                                </Typography>
                                <Typography color="text.secondary" mt={1}>
                                    📅 {eventData.start} – {eventData.end}
                                    <br />
                                    📍 {eventData.place}
                                </Typography>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>
            </Card>
            {/* PRODUCTS */}
            <Typography
                variant="h6"
                fontWeight={700}
                mb={2}
                sx={{ textAlign: "center" }} // added center alignment
            >
                Products for this Event
            </Typography>
            <Grid container spacing={2}>
                {eventData.cake_details.map((cake) => (
                    <Grid item xs={6} sm={6} md={4} lg={3} key={cake.id}>
                        <Card sx={{ borderRadius: 3 }}>
                            <CardMedia component="img" height="180" image={cake.image} />
                            <CardContent>
                                <Typography fontWeight={600}>{cake.name}</Typography>
                                <Typography fontWeight={700} color={THEME_COLOR}>
                                    ₹{cake.price}
                                </Typography>

                                <Button
                                    fullWidth
                                    sx={{
                                        mt: 1.5,
                                        backgroundColor: THEME_COLOR,
                                        color: "#fff",
                                        fontWeight: 600,
                                    }}
                                    onClick={() => handleAddToCart(cake)}
                                >
                                    Add to Cart
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* ORDER MODAL */}
            <EventProductOrder
                open={openCart}
                onClose={() => setOpenCart(false)}
                cartItems={cartItems}
                setCartItems={setCartItems}
            />
        </Box>
    );
};


export default Events;
