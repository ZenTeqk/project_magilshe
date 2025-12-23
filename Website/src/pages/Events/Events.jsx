import React, { useState } from "react";
import {
    Box,
    Grid,
    Typography,
    Card,
    CardContent,
    CardMedia,
    Chip,
    Skeleton,
    Stack,
    Button,
} from "@mui/material";

import BannerImage from "../../assets/images/banner-offer-1.png";
import ProductImage from "../../assets/images/about-cupcake.png";
import EventProductOrder from "./EventProductOrder";

/* ================= DATA ================= */
const eventProductData = [
    {
        event: {
            id: 1,
            name: "Cake Festival 2025",
            image: BannerImage,
            description:
                "Enjoy delicious cakes with exciting festival offers.",
            fromDate: "10 Feb 2025",
            toDate: "15 Feb 2025",
            place: "Chennai",
        },
        products: Array.from({ length: 8 }).map((_, i) => ({
            id: i + 1,
            name: "Chocolate Truffle Cake",
            image: ProductImage,
            price: 850,
            offerPrice: 699,
            discount: "18%",
        })),
    },
];

const isLoading = false;

/* ================= COMPONENT ================= */
const Events = () => {
    const [openOrder, setOpenOrder] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleOrderOpen = (product) => {
        setSelectedProduct(product);
        setOpenOrder(true);
    };

    const handleOrderClose = () => {
        setOpenOrder(false);
        setSelectedProduct(null);
    };

    return (
        <Box p={{ xs: 1, sm: 2, md: 3 }}>
            {!isLoading ? (
                eventProductData.map((item) => (
                    <Box key={item.event.id} mb={6}>
                        {/* ================= EVENT HERO ================= */}
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
                                        src={item.event.image}
                                        alt={item.event.name}
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
                                            sx={{ color: "#B4584A", fontWeight: 600 }}
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
                                            <Box component="span" color="#B4584A">
                                                Festival
                                            </Box>{" "}
                                            2025
                                        </Typography>

                                        <Typography color="text.secondary" maxWidth={520}>
                                            {item.event.description}
                                        </Typography>
                                        {/* INFO CARD */}
                                        <Card
                                            sx={{
                                                p: 3, // increased padding
                                                mt: 2, // more spacing from content above
                                                borderRadius: 5, // slightly bigger rounded corners
                                                background: "rgba(255,255,255,0.75)", // slightly more solid
                                                backdropFilter: "blur(12px)", // stronger blur
                                                display: "flex",
                                                alignItems: "flex-start", // align items to top
                                                justifyContent: "space-between",
                                                flexWrap: "wrap",
                                                gap: 3, // more gap
                                            }}
                                        >
                                            <Box>
                                                <Typography fontWeight={700} fontSize={{ xs: 16, sm: 18, md: 20 }}>
                                                    Special Festival Offers
                                                </Typography>

                                                <Typography
                                                    variant="body1"
                                                    color="text.secondary"
                                                    mt={1}
                                                    fontSize={{ xs: 14, sm: 16, md: 18 }} // increased font size
                                                    lineHeight={1.5}
                                                >
                                                    📅 {item.event.fromDate} – {item.event.toDate} <br />
                                                    📍 {item.event.place}
                                                </Typography>
                                            </Box>
                                        </Card>

                                    </Stack>
                                </Grid>
                            </Grid>
                        </Card>

                        {/* ================= PRODUCTS ================= */}
                        {/* ================= PRODUCTS ================= */}
                        <Typography
                            variant="h6"
                            fontWeight={700}
                            mb={2}
                            sx={{ textAlign: "center" }} // added center alignment
                        >
                            Products for this Event
                        </Typography>


                        {/* ================= PRODUCTS ================= */}
                        <Grid container spacing={2}>
                            {item.products.map((product) => (
                                <Grid item key={product.id} xs={6} sm={6} md={4} lg={3}>
                                    <Card
                                        sx={{
                                            height: "100%",
                                            borderRadius: 3,
                                            transition: "0.3s",
                                            "&:hover": {
                                                transform: "translateY(-6px)",
                                                boxShadow: 6,
                                            },
                                        }}
                                    >
                                        <Box position="relative">
                                            <CardMedia
                                                component="img"
                                                height="180"
                                                image={product.image}
                                                alt={product.name}
                                            />
                                            <Chip
                                                label={`${product.discount} OFF`}
                                                color="success"
                                                size="small"
                                                sx={{
                                                    position: "absolute",
                                                    top: 10,
                                                    left: 10,
                                                    fontWeight: 700,
                                                }}
                                            />
                                        </Box>

                                        <CardContent>
                                            <Typography fontWeight={600} noWrap>
                                                {product.name}
                                            </Typography>

                                            <Stack direction="row" spacing={1} mt={1}>
                                                <Typography
                                                    sx={{
                                                        textDecoration: "line-through",
                                                        color: "text.secondary",
                                                    }}
                                                >
                                                    ₹{product.price}
                                                </Typography>

                                                {/* Offer Price with new color */}
                                                <Typography color="#ef4444" fontWeight={700}>
                                                    ₹{product.offerPrice}
                                                </Typography>
                                            </Stack>

                                            {/* ORDER BUTTON with new color */}
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                size="small"
                                                sx={{
                                                    mt: 1.5,
                                                    borderRadius: 2,
                                                    backgroundColor: "#B4584A",
                                                    "&:hover": { backgroundColor: "#923E37" }, // slightly darker on hover
                                                }}
                                                onClick={() => handleOrderOpen(product)}
                                            >
                                                Order Now
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                    </Box>
                ))
            ) : (
                <Grid container spacing={2}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Grid item xs={6} md={4} lg={3} key={i}>
                            <Skeleton variant="rounded" height={260} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* ================= ORDER MODAL ================= */}
            {selectedProduct && (
                <EventProductOrder
                    open={openOrder}
                    onClose={handleOrderClose}
                    product={selectedProduct}
                />
            )}
        </Box>
    );
};

export default Events;
