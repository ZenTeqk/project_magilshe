import { faFileLines, faRefresh } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  FormControl
} from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../context/MainContext";
import { GetApi } from "../../../hooks/Get/GetApi";
import { GetUserWiseReportUrl, GetCustomersUrl } from "../../../Constant/urls/urls";
import { setUserWiseReportReducerData } from "../../../redux/reducer/ChildReducer/UserWiseReportReducer";
import {
  ConvertDateStrFunction,
  ISOformatDateTimeFunction,
} from "../../../commonFunctions";
import { setCustomersReducerData } from "../../../redux/reducer/ChildReducer/CustomersReducer";

const UserWiseReport = () => {
  const { ShowNotification } = useContext(MainContext);

  const { user_wise_report_reducer_data } = useSelector(
    (state) => state.UserWiseReportReducer
  );

  const { customers_reducer_data } = useSelector(
    (state) => state.CustomersReducer
  );

  const dispatch = useDispatch();

  const [filterDates, setFilterDates] = useState({
    from_date: "",
    to_date: "",
  });

  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - 30); // Last 30 days

    const formattedFromDate = pastDate.toISOString().slice(0, 16);
    const formattedToDate = currentDate.toISOString().slice(0, 16);

    setFilterDates({
      from_date: formattedFromDate,
      to_date: formattedToDate,
    });

    getUserWiseReport({
      from_date: formattedFromDate,
      to_date: formattedToDate,
    });
  }, []);

  const handleDateChange = (value, name) => {
    setFilterDates((oldData) => ({
      ...oldData,
      [name]: value,
    }));
  };

  const getCustomer = async () => {
    try {
      const result = await GetApi(GetCustomersUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setCustomersReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getCustomer Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const getUserWiseReport = async (dateRange = filterDates) => {
    if (!dateRange?.from_date) {
      ShowNotification("error", "Please Select Report Start Date");
      return;
    }
    if (!dateRange?.to_date) {
      ShowNotification("error", "Please Select Report End Date");
      return;
    }
    if (!customerId) {
      ShowNotification("error", "Please Select Customer");
      return;
    }
    try {
      const result = await GetApi(
        `${GetUserWiseReportUrl}customer_id=${customerId}&from_date=${ConvertDateStrFunction(
          dateRange?.from_date
        )}&to_date=${ConvertDateStrFunction(dateRange?.to_date)}`
      );

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (result.data?.data) {
          dispatch(setUserWiseReportReducerData(result.data?.data));
        }
      }
    } catch (error) {
      console.error("getUserWiseReport Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  useEffect(() => {
    getCustomer();
  }, []);

  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
      width: "15%",
    },
    {
      name: "Customer Name",
      selector: (row) => row?.customer?.name,
      width: "20%",
    },
    {
      name: "Address",
      selector: (row) => (
        <div className="text-center">
          <p>{row.delivery_address?.name}</p>
          <p>{row.delivery_address?.phone}</p>
          <p>{row.delivery_address?.email}</p>
        </div>
      ),
      width: "30%",
    },
    {
      name: "Delivery Person",
      selector: (row) => (
        <div className="text-center">
          <p>{row.delivery_person?.name}</p>
          <p>{row.delivery_person?.phone}</p>
        </div>
      ),
      width: "25%",
    },
    {
      name: "Order Time",
      selector: (row) => ISOformatDateTimeFunction(row?.order_time),
      width: "20%",
    },
    {
      name: "Delivered Time",
      selector: (row) => ISOformatDateTimeFunction(row?.delivery_time),
      width: "20%",
    },
  ];

  return (
    <div className="reports-section">
      <Grid container spacing={2} className="mb-2">
        <Grid container spacing={2} className="my-3">          
          <Grid item md={4} xs={12} className="text-start">
            <FormControl fullWidth size="small">
              <InputLabel id="customer-select-label">Customer</InputLabel>
              <Select
                labelId="customer-select-label"
                id="customer-select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >              
                {customers_reducer_data && customers_reducer_data.length > 0 ? (
                  customers_reducer_data.map((val) => (
                    <MenuItem key={val.id} value={val.id}>
                      {val.name} 
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No Customer Data available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default UserWiseReport;
