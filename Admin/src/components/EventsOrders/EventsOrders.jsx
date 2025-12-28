import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";

import { GetApi } from "../../hooks/Get/GetApi";
import {
  GetEventsAllOrder,
  GetEventsIndividualOrder,
  GetCakeUrl,
} from "../../Constant/urls/urls";
import theChennaiCakeryLogo from "../../assets/img/tcc-logo.png";
import { Card } from "react-bootstrap";
import ReactToPrint from "react-to-print";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


/* ================= MAIN COMPONENT ================= */

const EventsOrders = () => {
  const [orders, setOrders] = useState([]);
  const [cakes, setCakes] = useState([]);
  const [open, setOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const invoiceRef = useRef(null);

  /* ================= FETCH ALL ORDERS ================= */

  const getAllOrders = async () => {
    const res = await GetApi(GetEventsAllOrder);
    if (res?.status === 200) {
      setOrders(res.data?.data || []);
    }
  };

  /* ================= FETCH ALL CAKES ================= */

  const getAllCakes = async () => {
    const res = await GetApi(GetCakeUrl);
    if (res?.status === 200) {
      setCakes(res.data?.data || []);
    }
  };

  /* ================= FETCH INDIVIDUAL ORDER ================= */

  const handleView = async (orderId) => {
    const res = await GetApi(`${GetEventsIndividualOrder}/${orderId}`);
    if (res?.status === 200) {
      setOrderDetails(res.data?.data);
      setOpen(true);
    }
  };

  useEffect(() => {
    getAllOrders();
    getAllCakes();
  }, []);

  /* ================= HELPERS ================= */

  const getCakeById = (cakeId) =>
    cakes.find((cake) => cake.id === cakeId);

  const getVariantById = (cake, variantId) => {
    if (!cake?.price_list) return null;
    return cake.price_list.find(
      (variant) => variant.id === variantId
    );
  };


  return (
    <>
      {/* ================= ORDERS TABLE ================= */}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No Orders Found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => (
                <TableRow key={order.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{order.name}</TableCell>
                  <TableCell>{order.phone}</TableCell>
                  <TableCell>₹ {order.total_amount}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleView(order.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ================= ORDER DETAILS MODAL ================= */}

      <Dialog open={open} onClose={() => { setOpen(false); setShowInvoice(false) }} maxWidth="md" fullWidth>

        {/* ===== MODAL TITLE WITH CLOSE ICON ===== */}
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {showInvoice ? "Invoice" : "Order Details"}

          <IconButton
            onClick={() => {
              setOpen(false);
              setShowInvoice(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {!showInvoice && orderDetails ?
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                style={{
                  textTransform: "none",
                  borderRadius: "5px",
                }}
                startIcon={<PrintIcon />}
                onClick={() => setShowInvoice(true)}
              >
                View Bill
              </Button>
            </Box>
            :
            <Box display="flex" justifyContent="flex-end" gap={2} mb={1}>
              <Button variant="contained" color="primary"
                style={{
                  textTransform: "none",
                  borderRadius: "5px",
                }}
                onClick={() => setShowInvoice(false)}>
                Back
              </Button>
              <ReactToPrint
                trigger={() => (
                  <Button
                    variant="contained"
                    color="primary"
                    style={{
                      textTransform: "none",
                      borderRadius: "5px",
                    }}
                  >
                    <FontAwesomeIcon icon={faPrint} className="mx-1" />
                    Print Bill
                  </Button>
                )}
                content={() => invoiceRef.current}
              />
            </Box>
          }
          {!showInvoice && orderDetails && (
            <>
              {/* ================= CUSTOMER INFO + PRINT ================= */}

              <Box
                mb={2}
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                gap={2}
              >
                {/* LEFT : CUSTOMER DETAILS */}
                <Box>
                  <Typography><b>Name:</b> {orderDetails.name}</Typography>
                  <Typography><b>Phone:</b> {orderDetails.phone}</Typography>
                  <Typography><b>Email:</b> {orderDetails.email}</Typography>
                  <Typography><b>Address:</b> {orderDetails.address}</Typography>
                  <Typography><b>Notes:</b> {orderDetails.notes}</Typography>
                </Box>
              </Box>

              {/* ================= CAKE DETAILS ================= */}

              <Grid container spacing={2}>
                {orderDetails?.cake_price_details?.map((item, index) => {
                  const cake = getCakeById(item.cake_id);
                  const variant = getVariantById(cake, item.id);

                  const kg = variant?.kg || 0;
                  const price = variant?.price || 0;
                  const qty = item.qty || 0;
                  const total = price * qty;

                  const cakeImage = cake?.images?.[0]?.url;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper sx={{ p: 2 }}>
                        {cakeImage && (
                          <img
                            src={cakeImage}
                            alt={cake?.name}
                            style={{
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        )}

                        <Typography mt={1} fontWeight={600}>
                          {cake?.name || "Unknown Cake"}
                        </Typography>

                        <Typography variant="body2">
                          Variant: <b>{kg} KG</b>
                        </Typography>

                        <Typography variant="body2">
                          Price: ₹ {price}
                        </Typography>

                        <Typography variant="body2">
                          Qty: {qty}
                        </Typography>

                        <Typography mt={1} fontWeight={600}>
                          Total: ₹ {total}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {/* ================= GRAND TOTAL ================= */}

              <Box textAlign="right" mt={2}>
                <Typography variant="h6">
                  Grand Total: ₹ {orderDetails.total_amount}
                </Typography>
              </Box>
            </>
          )}

          {/* ================= INVOICE VIEW ================= */}
          {showInvoice && (
            <Card className="p-4 invoice-section" ref={invoiceRef}>

              {/* HEADER */}
              <div className="bill-header text-center">
                <img src={theChennaiCakeryLogo} alt="logo" height={60} />
                <h4 className="company-name">{" magilshe"}</h4>
                <p className="address">
                  Address: {"No 1/2, Janakiraman st, 83rd St, Muthurangam Block, West Jafferkhanpet, Chennai,Tamil Nadu 600083."}</p>
                <p className="phone">Ph: {orderDetails?.phone || "8939950010"}</p>
                <p className="email">Email: {orderDetails?.email || "magilshe@gmail.com"}</p>
              </div>

              {/* INVOICE DETAILS */}
              <Grid container spacing={2} mt={2}>
                <Grid item md={4}>
                  <p>Invoice No: #{orderDetails.id}</p>
                  <p>Order No: #{orderDetails.id}</p>
                  {/* <p>Bill Mode: Cash</p> */}
                </Grid>
                {/* <Grid item md={8} textAlign="right">
                  <p>Order Date: {orderDetails.order_time}</p>
                  <p>Bill Date: {orderDetails.delivery_time}</p>
                </Grid> */}
              </Grid>

              {/* CUSTOMER */}
              <div className="mt-3">
                <h4>Customer Details</h4>
                <h5>{orderDetails.name}</h5>
                {/* <p>{orderDetails.address}</p> */}
                <Grid container>
                  <Grid item md={6}>Ph: {orderDetails.phone}</Grid>
                  <Grid item md={6} textAlign="right">
                    {/* Email: {orderDetails.email} */}
                  </Grid>
                </Grid>
              </div>

              {/* TABLE */}
              <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>S.No</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderDetails?.cake_price_details?.map((item, i) => {
                      const cake = getCakeById(item.cake_id);
                      const variantDetails = getVariantById(cake, item.id);

                      const variant = cake?.price_list?.find(
                        (p) => p.id === item.id
                      );
                      const kg = variant?.kg || 0;
                      const price = variantDetails?.price || 0;
                      const qty = item?.qty || 0;
                      const total = price * qty;
                      const cakeVariant = cake?.unit?.name;
                      const cakeName = cake?.name;

                      return (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell align="left">{cakeName}</TableCell>
                          <TableCell align="left">{kg}{cakeVariant}</TableCell>
                          <TableCell align="center">{qty}</TableCell>
                          <TableCell align="right">₹ {price}</TableCell>
                          <TableCell align="right">₹ {total}</TableCell>
                        </TableRow>
                      );
                    })}

                    {/* ===== GRAND TOTAL ROW ===== */}
                    <TableRow>
                      <TableCell colSpan={5} align="right">
                        <b>Grand Total</b>
                      </TableCell>
                      <TableCell align="right">
                        <b>₹ {orderDetails?.total_amount}</b>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <p className="footer-text mt-4 text-center">
                <b>Thank you for your Business!...</b>
              </p>
            </Card>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventsOrders;
