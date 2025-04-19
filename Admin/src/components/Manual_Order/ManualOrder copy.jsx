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
  setManualOrderReducerData,
} from "../../redux/reducer/ChildReducer/ManualOrderReducer";
import { ManualOrderCartUrl } from "../../Constant/urls/urls";
const ManualOrder = ({ setShow, editableData, setEditableData }) => {
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
  const { ShowNotification, setIsPreLoading } = useContext(MainContext);

  const [selectedItem, setSelectedItem] = React.useState(null);
  const [orderItems, setOrderItems] = React.useState([]);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [personName, setPersonName] = useState("");
  const [greetingText, setGreetingText] = useState("");
  const [manualOrderReducerData, setManualOrderReducerData] = useState([]);

  const handleAddCustomer = async (customerData) => {
    try {
      await getCustomers();
      setModalOpen(false);
    } catch (error) {}
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
    setManualOrderReducerData(manual_order_reducer_data);
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
    return orderItems
      .filter((item) => !item.is_deleted)
      .reduce((total, item) => total + item.retail_price * item.quantity, 0)
      .toFixed(2);
  };
  const handleItemSelect = (event, newValue) => {
    setSelectedItem(newValue);
    if (newValue) {
      setSelectedVariant("");
      setQuantity(1);
      setSelectedOccasion("");
      setEventDate("");
      setPersonName("");
      setGreetingText("");
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
      row_data: 0,
      cake_price: selectedVariant,
      price: calculatePrice(),
      qty: quantity,
      greeting_text: greetingText,
      type: selectedOccasion,
      date: eventDate,
      person_name: personName,
    };

    dispatch(addManualOrderReducerData(formData));

    setSelectedVariant("");
    setQuantity(1);
    setSelectedOccasion("");
    setEventDate("");
    setPersonName("");
    setGreetingText("");

    handleCloseModal();
  };

  const handleDeleteItem = (cake_price) => {
    const updatedItems = manualOrderReducerData.filter(
      (item) => item.cake_price !== cake_price
    );

    setManualOrderReducerData(updatedItems);
  };

  return (
    <div>
      <Grid container spacing={2}>
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
                      {selectedItem.name}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ mb: 3 }}>
                      ₹ {calculatePrice()}
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
                                borderRadius: "8px",
                                textTransform: "none",
                                padding: "10px 20px",
                                border: "1px solid #dcdcdc",
                                "&.Mui-selected": {
                                  backgroundColor:
                                    "linear-gradient(45deg, #ff8a65, #ff3d00)",
                                  color: "white",
                                },
                              }}
                            >
                              {item.kg} Kg
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
                  <TableCell>Price</TableCell>
                  <TableCell>Qty.</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {manualOrderReducerData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.greeting_text}</TableCell>
                    <TableCell>{item.person_name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>₹{item.price}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>
                      {item.is_deleted
                        ? "-"
                        : `₹${(item.price * item.qty).toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteItem(item.cake_price)}
                        >
                          <Delete />
                        </IconButton>

                        <IconButton
                          color="primary"
                          // onClick={() => handleUpdateItem(item.id)}
                        >
                          <Edit />
                        </IconButton>
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
              <Autocomplete
                className="p-2 mb-2"
                size="small"
                options={customers_reducer_data || []}
                getOptionLabel={(option) => option.name}
                fullWidth
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Select Customer Name"
                  />
                )}
              />
              <Button
                variant="contained"
                color="primary"
                size="small"
                fullWidth
                onClick={() => setModalOpen(true)}
                sx={{ marginTop: 2 }}
              >
                Add New Customer
              </Button>
            </Paper>
            <AddNewCustomerModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              onSubmit={handleAddCustomer}
            />
            <TextField
              name="address"
              multiline
              fullWidth
              label="Address"
              size="small"
              sx={{ marginTop: 2 }}
            />

            <TextField
              fullWidth
              label="Order Date"
              type="date"
              name="order_date"
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ marginTop: 2 }}
            />

            <Typography variant="h5" className="my-3">
              Grand Total: ₹{calculateGrandTotal()}
            </Typography>
            <div
              className="d-flex justify-content-between"
              style={{ marginTop: 10, textAlign: "right" }}
            >
              <Button variant="contained" color="error" sx={{ marginRight: 2 }}>
                Cancel
              </Button>
              <Button variant="contained" color="success">
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
