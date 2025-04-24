import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Autocomplete,
  Grid,
  TextField,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Typography,
  Modal,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add,
  AddBox,
  Delete,
  Edit,
  PlusOne,
  Remove,
} from "@mui/icons-material";
import { PostApi } from "../../hooks/Post/PostApi";
import {
  GetCakeUrl,
  GetCustomersUrl,
  PurchaseUrl,
} from "../../Constant/urls/urls";
import MainContext from "../../context/MainContext";
import { setCakeListReducerData } from "../../redux/reducer/ChildReducer/CakeListReducer";
import {
  setIsCakeLoadingReducerData,
  setIsCustomersLoadingReducerData,
  setIsItemLoadingReducerData,
} from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import { paymentMode } from "../../Constant/Constant";
import { AddPurchase } from "../../Constant/urls/urls";
import { GetApi } from "../../hooks/Get/GetApi";

import { PutApi } from "../../hooks/Post/PutApi";
import { setCustomersReducerData } from "../../redux/reducer/ChildReducer/CustomersReducer";
import AddNewCustomerModal from "./AddNewCustomerModal";
import {
  addManualOrderReducerData,
  editManualOrderReducerData,
  setManualOrderReducerData,
} from "../../redux/reducer/ChildReducer/ManualOrderReducer";
import { ManualOrderCartUrl } from "../../Constant/urls/urls";
import { ManualOrderSave } from "../../Constant/urls/urls";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";

const ManualOrder = ({ setShow, editableData, setEditableData }) => {

  const navigate = useNavigate()

  const { ShowNotification, setIsApiLoading, setIsPreLoading } =
    useContext(MainContext);

  const dispatch = useDispatch();
  const [modalOpen, setModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);

  const { cake_list_reducer_data } = useSelector(
    (state) => state.CakeListReducer
  );

  const { customers_reducer_data } = useSelector(
    (state) => state.CustomersReducer
  );

  const { manual_order_reducer_data } = useSelector(
    (state) => state.ManualOrderReducer
  );

  const [selectedItem, setSelectedItem] = React.useState(null);
  const [orderItems, setOrderItems] = React.useState([]);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [personName, setPersonName] = useState("");
  const [greetingText, setGreetingText] = useState("");
  const [manualOrderData, setManualOrderData] = useState([]);
  const [rowId, setRowId] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState("");

  const [customerObject, setCustomerObject] = useState(null);

  const [deliveryDate, setDeliveryDate] = useState("");
  const [customerAddressId, setCustomerAddressId] = useState(0);
  const [modalData, setModalData] = useState([]);
  const [selectedCakeName, setSelectedCakeName] = useState("");

  const handleAddCustomer = (modalData) => {
    setModalData(modalData);
    setCustomerName(modalData.name); // Use the name
    setCustomerObject(modalData)
    setSelectedCustomerId(modalData.customerId);
    setCustomerAddressId(modalData.addressDetailsId);
    setModalOpen(false);
  };

  useEffect(() => {
    getCakeList();
  }, []);

  const getCakeList = async () => {
    try {
      const result = await GetApi(GetCakeUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setCakeListReducerData(result.data.data));
      }
    } catch (error) {
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsCakeLoadingReducerData(false));
    }
  };

  const getCustomers = async () => {
    try {
      const result = await GetApi(GetCustomersUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setCustomersReducerData(result.data?.data));
      }
    } catch (error) {
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsCustomersLoadingReducerData(false));
    }
  };

  useEffect(() => {
    getCustomers();
  }, []);

  useEffect(() => {
    const currentDate = new Date().toISOString().split("T")[0];
    setEventDate(currentDate);
  }, []);

  useEffect(() => {
    setManualOrderData(manual_order_reducer_data);
  }, [manual_order_reducer_data]);

  const handleVariantChange = (event, newVariant) => {
    if (newVariant !== null) {
      setSelectedVariant(newVariant);
      setQuantity(1);
    }
  };

  const calculatePrice = () => {
    if (!selectedVariant || !selectedItem) return 0;
    const selectedPrice = selectedItem.price_list.find(
      (item) => item.id === selectedVariant
    );
    return selectedPrice ? selectedPrice.price * quantity : 0;
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const calculateGrandTotal = () => {
    return manualOrderData
      .reduce((total, item) => {
        if (!item.is_deleted) {
          total += item.price;
        }
        return total;
      }, 0)
      .toFixed(2);
  };

  const handleItemSelect = (event, newValue) => {
    setSelectedItem(newValue);
    console.log(newValue)
    if (newValue) {

      setSelectedCakeName(newValue.name);
      setSelectedVariant("");
      setQuantity(1);
      setSelectedOccasion("");
      setEventDate("");
      setPersonName("");
      setGreetingText("");
      setRowId(0);
      setItemModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setQuantity(1);
    setItemModalOpen(false);
  };

  const handleSubmit = () => {
    if (
      !selectedVariant ||
      !quantity ||
      !selectedOccasion ||
      !eventDate ||
      !personName ||
      !greetingText
    ) {
      alert("Please fill out all fields.");
      return;
    }

    const formData = {
      row_id: rowId,
      cake_price: selectedVariant,
      price: calculatePrice(),
      qty: quantity,
      greeting_text: greetingText,
      type: selectedOccasion,
      date: eventDate,
      person_name: personName,
      cake_name: selectedCakeName,
    };

    if (rowId === 0) {
      dispatch(addManualOrderReducerData(formData));
    } else {
      dispatch(editManualOrderReducerData(formData));
    }

    setSelectedVariant("");
    setQuantity(1);
    setSelectedOccasion("");
    setEventDate("");
    setPersonName("");
    setGreetingText("");


    handleCloseModal();
  };

  const handleDeleteItem = (row_id) => {
    const updatedItems = manualOrderData.filter(
      (item) => item.row_id !== row_id
    );
    setManualOrderData(updatedItems);
  };

  const handleUpdateItem = (obj) => {

    setSelectedVariant(obj?.cake_price);
    setQuantity(obj?.qty);
    setSelectedOccasion(obj?.type);
    setEventDate(obj?.date);
    setPersonName(obj?.person_name);
    setGreetingText(obj?.greeting_text);
    setRowId(obj?.row_id);
    setSelectedCakeName(obj.cake_name);
    setItemModalOpen(true);
  };

  const handleFinish = async () => {
    // Validation: Check if customer ID is selected
    if (!selectedCustomerId) {
      ShowNotification("error", "Please select a customer");
      return;
    }

    // Validation: Check if cart has valid items
    if (!manualOrderData || manualOrderData.length === 0) {
      ShowNotification("error", "Cart is empty. Please add items to the cart");
      return;
    }

    const cartList = manualOrderData.map((item) => ({
      cake_price: item.cake_price,
      price: item.price,
      qty: item.qty,
      greeting_text: item.greeting_text,
      type: item.type,
      date: item.date,
      person_name: item.person_name,
    }));

    // Validation: Check if cart items have required fields
    const hasInvalidItem = cartList.some(
      (item) => !item.qty || !item.price || !item.type
    );
    if (hasInvalidItem) {
      ShowNotification("error", "Please fill all required fields in the cart");
      return;
    }

    const dataToSend = {
      customer_id: selectedCustomerId,
      cart_list: cartList,
    };

    try {
      setIsPreLoading(true);

      const result = await PostApi(ManualOrderCartUrl, dataToSend);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
        return;
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
        return;
      } else {
        dispatch(setManualOrderReducerData([]));

        const additionalData = {
          customer_id: selectedCustomerId,
          cart_id_list: result.data?.data,
          customer_address_id: customerAddressId,
          delivery_date_time: deliveryDate,
          delivery_person_email: modalData.email,
          delivery_person_name: modalData.name,
          delivery_person_phone: modalData.phone,
          id: 0,
          total_amount: parseInt(calculateGrandTotal()),
          total_qty: totalQty,
          tracking_link: "",
          is_manual_order: true,
        };

        // Validation: Check required fields in additionalData
        if (
          !additionalData.customer_address_id ||
          !additionalData.delivery_date_time
        ) {
          ShowNotification("error", "Please provide delivery address and date");
          setIsPreLoading(false);
          return;
        }

        const secondResult = await PostApi(ManualOrderSave, additionalData);

        if (!secondResult || typeof secondResult.status === "undefined") {
          ShowNotification("error", "Network Error");
        } else if (secondResult.status !== 200) {
          ShowNotification(
            "error",
            secondResult.data?.message || "An error occurred"
          );
        } else {
          ShowNotification("success", "Order Successfully Complete");
          // Clear customer name after successful order
          setCustomerName("");
          setIsPreLoading(false);
        }
      }
      navigate('/orders')
    } catch (error) {
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      setIsPreLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const offsetDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );
    const formattedDateTime = offsetDate.toISOString().slice(0, 16); // Localized time

    setDeliveryDate(formattedDateTime);
  }, []);

  // const handleCustomerSelect = (event, newValue) => {
  //   if (newValue) {
  //     setSelectedCustomerId(newValue.id);
  //   } else {
  //     setSelectedCustomerId(null);
  //   }
  // };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel? All data will be cleared."
      )
    ) {
      dispatch(setManualOrderReducerData([]));
      navigate('/orders')
    }
  };

  const totalQty = manualOrderData.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div>
      <Grid container spacing={2}>
        <Grid item md={12}>
          <div className="text-start">
            <Button
              variant="contained"
              color="error"
              size="small"
              // fullWidth
              onClick={() => {
                navigate("/orders");
              }}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
              Back to Orders
            </Button>
          </div>
        </Grid>
        <Grid item md={9}>
          <Paper>
            <Autocomplete
              className="p-2 mb-3"
              size="small"
              id="item-box"
              options={cake_list_reducer_data || []}
              getOptionLabel={(option) => option.name}
              value={selectedItem}
              onChange={handleItemSelect}
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Select an Item"
                />
              )}
            />
            <Modal open={itemModalOpen} onClose={handleCloseModal}>
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 500,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  boxShadow: 24,
                  p: 4,
                }}
              >
                {selectedItem && (
                  <>
                    {/* Title and Price */}
                    <Typography variant="h6" gutterBottom>
                      {selectedCakeName}
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 3 }}>
                      <b>₹ {calculatePrice()}</b>
                    </Typography>

                    {/* Variant and Quantity Selection */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                      }}
                    >
                      <div>
                        <Typography variant="subtitle2" gutterBottom>
                          Select Variant
                        </Typography>
                        <ToggleButtonGroup
                          value={selectedVariant}
                          exclusive
                          onChange={handleVariantChange}
                          sx={{
                            display: "flex",
                            gap: "10px",
                          }}
                        >
                          {selectedItem.price_list.map((item) => (
                            <ToggleButton
                              key={item.id}
                              value={item.id}
                              sx={{
                                textTransform: "none",
                                padding: "10px 20px",
                                border: "1px solid #dcdcdc",
                                fontWeight: "600",
                                borderRadius: "10px !important",
                                "&.Mui-selected": {
                                  backgroundColor:
                                    "linear-gradient(45deg, #ff8a65, #ff3d00)",
                                  color: "black",
                                },
                              }}
                            >
                              {item.kg} {selectedItem?.unit?.name}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </div>

                      {/* Select Quantity */}
                      <div>
                        <Typography variant="subtitle2" gutterBottom>
                          Select Qty
                        </Typography>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            border: "1px solid #dcdcdc",
                            borderRadius: "8px",
                            padding: "5px 10px",
                          }}
                        >
                          <IconButton
                            onClick={decrementQuantity}
                            size="small"
                            sx={{ color: "brown" }}
                          >
                            <Remove />
                          </IconButton>
                          <Typography variant="body1">{quantity}</Typography>
                          <IconButton
                            onClick={incrementQuantity}
                            size="small"
                            sx={{ color: "brown" }}
                          >
                            <Add />
                          </IconButton>
                        </div>
                      </div>
                    </div>

                    {/* Occasion and Greetings */}
                    <div style={{ marginTop: "20px" }}>
                      <FormControl
                        fullWidth
                        variant="outlined"
                        style={{ marginBottom: "10px" }}
                      >
                        <InputLabel id="occasion-label">
                          Type of Occasion
                        </InputLabel>
                        <Select
                          labelId="occasion-label"
                          value={selectedOccasion}
                          onChange={(e) => setSelectedOccasion(e.target.value)}
                          label="Type of Occasion"
                        >
                          <MenuItem value="Birthday">Birthday</MenuItem>
                          <MenuItem value="Marriage Anniversary">
                            Marriage Anniversary
                          </MenuItem>
                          <MenuItem value="Work Anniversary">
                            Work Anniversary
                          </MenuItem>
                          <MenuItem value="Others">
                            Others
                          </MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        label="Event Date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        variant="outlined"
                        style={{ marginBottom: "10px" }}
                      />
                      <TextField
                        fullWidth
                        label="Special Person Name"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        variant="outlined"
                        style={{ marginBottom: "10px" }}
                      />
                      <TextField
                        fullWidth
                        label="Greetings Message"
                        value={greetingText}
                        onChange={(e) => setGreetingText(e.target.value)}
                        variant="outlined"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "20px",
                      }}
                    >
                      <Button
                        variant="outlined"
                        sx={{
                          color: "red",
                          borderColor: "red",
                          "&:hover": {
                            backgroundColor: "rgba(255, 0, 0, 0.1)",
                            borderColor: "red",
                          },
                        }}
                        onClick={handleCloseModal}
                      >
                        Close
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </>
                )}
              </Box>
            </Modal>
          </Paper>
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Greeting Text</TableCell>
                  <TableCell>Person Name</TableCell>
                  <TableCell>Occasion Type</TableCell>
                  <TableCell>Event Date</TableCell>
                  <TableCell>Qty.</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manualOrderData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.greeting_text}</TableCell>
                    <TableCell>{item.person_name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>₹{item.price}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteItem(item.row_id)}
                        >
                          <Delete />
                        </IconButton>

                        {/* <IconButton
                          color="primary"
                          onClick={() => handleUpdateItem(item)}
                        >
                          <Edit />
                        </IconButton> */}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid item md={3}>
          <Paper sx={{ padding: 2 }}>
            <Paper sx={{ padding: 2 }}>
              {/* <Autocomplete
                className="p-2 mb-2"
                size="small"
                options={customers_reducer_data || []}
                getOptionLabel={(option) => option.name}
                onChange={handleCustomerSelect}
                fullWidth
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Select Customer Name"
                  />
                )}
              /> */}
              <Button
                variant="contained"
                color="primary"
                size="small"
                fullWidth
                sx={{ textTransform: "capitalize" }}
                onClick={() => setModalOpen(true)}
              >
                Select Customer
              </Button>
              <AddNewCustomerModal
                open={modalOpen}
                setModalOpen={setModalOpen}
                onSubmit={handleAddCustomer}
              />

              {/* Display customer name below the button */}
              {customerName && (
                <>
                  {" "}
                  <Typography
                    variant="body1"
                    color="textSecondary"
                    sx={{ marginTop: 2, textAlign: "start" }}
                  >
                    Name: <strong>{customerName}</strong>
                  </Typography>
                  <Typography
                    variant="body1"
                    color="textSecondary"
                    sx={{ marginTop: 2, textAlign: "start" }}
                  >
                    Phone: <strong>{customerObject?.phone}</strong>
                  </Typography>
                </>
              )}
            </Paper>

            <TextField
              fullWidth
              label="Delivery Date & Time"
              type="datetime-local"
              name="order_date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              sx={{ marginTop: 2 }}
            />

            <Typography variant="h5" className="my-3">
              Grand Total: ₹{calculateGrandTotal()}
            </Typography>
            <div
              className="d-flex justify-content-between"
              style={{ marginTop: 10, textAlign: "right" }}
            >
              <Button
                variant="contained"
                color="error"
                sx={{ marginRight: 2 }}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleFinish}
              >
                Finish
              </Button>
            </div>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default ManualOrder;
