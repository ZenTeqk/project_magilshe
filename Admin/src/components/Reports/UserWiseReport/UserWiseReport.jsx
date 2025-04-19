import { faDownload, faFileLines, faRefresh } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  FormControl,
} from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../context/MainContext";
import { GetApi } from "../../../hooks/Get/GetApi";
import {
  GetCustomersUrl,
  GetUserWiseReportUrl,
} from "../../../Constant/urls/urls";
import { setUserWiseReportReducerData } from "../../../redux/reducer/ChildReducer/UserWiseReportReducer";
import {
  ConvertDateStrFunction,
  ISOformatDateTimeFunction,
} from "../../../commonFunctions";
import { setCustomersReducerData } from "../../../redux/reducer/ChildReducer/CustomersReducer";
import { convertDateFormat } from "../../../commonFunctions";

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

  const [customerId, setCustomerId] = useState(0);

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
      console.error("getDeliveryPerson Error:", error);
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
      console.log("result", result);

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
    
    },
    {
      name: "Customer Name",
      selector: (row) => row?.customer?.name,
      
    },
    {
      name: "Address",
      selector: (row) => (
        <div className="text-center">
          <p>{row.delivery_address?.address}</p>
        </div>
      ),
    
    },
    {
      name: "Delivery Person",
      selector: (row) => (
        <div className="text-center">
          <p>{row.delivery_person?.name}</p>
          <p>{row.delivery_person?.phone}</p>
        </div>
      ),
      
    },
    {
      name: "Order Time",
      selector: (row) => convertDateFormat(row?.order_time),
     
    },
    {
      name: "Delivered Time",
      selector: (row) => convertDateFormat(row?.delivery_time),
      
    },
  ];

  return (
    <div className="reports-section">
      <Grid container spacing={2} className="mb-2">
        <Grid item md={4} xs={6} className="text-end search-section">
          <section className="component-heading my-1">
            <FontAwesomeIcon icon={faFileLines} className="mx-2" /> User Wise
            Report
          </section>
        </Grid>
        
      </Grid>
      <Grid container spacing={2} className="my-3 d-flex align-items-center">
          <Grid item md={3}>
            <TextField
              id="from_date"
              className="my-2"
              label="Start Date"
              fullWidth
              size="small"
              required
              value={filterDates?.from_date || ""}
              onChange={(e) => handleDateChange(e.target.value, "from_date")}
              type="datetime-local"
            />
          </Grid>
          <Grid item md={3}>
            <TextField
              id="to_date"
              className="my-2"
              label="End Date"
              fullWidth
              size="small"
              required
              value={filterDates?.to_date || ""}
              onChange={(e) => handleDateChange(e.target.value, "to_date")}
              type="datetime-local"
            />
          </Grid>
          <Grid item md={4}>
            <FormControl fullWidth size="small" className="my-2">
              <InputLabel id="customer-select-label">Customer</InputLabel>
              <Select
                labelId="customer-select-label"
                 label="Customer"
                id="customer-select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                sx={{ textAlign: "center", "& .MuiSelect-select": { textAlign: "left" } }} 
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
          <Grid item md={2} className="d-flex align-items-center">
            <Button
              variant="contained"
              color="success"
              style={{
                textTransform: "none",
                borderRadius: "5px",
                display: "block",
              }}
              onClick={() => getUserWiseReport()}
            >
              <FontAwesomeIcon icon={faDownload} className="mx-1" />{" "}
              <span>Get Data</span>
            </Button>
          </Grid>
        </Grid>

      <div className="dt-table">
        <DataTable
          columns={categoryDTColumns}
          striped
          data={user_wise_report_reducer_data}
          className="dt-table-container"
          searchable
        />
      </div>
    </div>
  );
};

export default UserWiseReport;
